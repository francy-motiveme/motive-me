
from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS
from flask_session import Session
import psycopg2
import psycopg2.extras
import bcrypt
import os
import secrets
from datetime import datetime, timedelta
import uuid

app = Flask(__name__, template_folder='templates')

# Configuration
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

Session(app)
CORS(app, supports_credentials=True, origins=['*'])

DATABASE_URL = os.environ.get('DATABASE_URL')

# Database connection
def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn

# Helper functions
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def require_auth(f):
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    decorated.__name__ = f.__name__
    return decorated

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'message': 'MotiveMe Python API is running',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        metadata = data.get('metadata', {})
        name = metadata.get('name', '')
        
        # Validation
        if not email or not password or not name:
            return jsonify({'error': 'Email, password et nom requis'}), 400
        
        if len(password) < 8:
            return jsonify({'error': 'Le mot de passe doit contenir au moins 8 caractères'}), 400
        
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Vérifier si l'utilisateur existe
        cur.execute('SELECT id FROM users WHERE email = %s', (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Cet email est déjà utilisé'}), 409
        
        # Créer l'utilisateur
        user_id = str(uuid.uuid4())
        cur.execute(
            'INSERT INTO users (id, email, name, points, badges, preferences, stats) VALUES (%s, %s, %s, 0, %s, %s, %s) RETURNING id, email, name, points, badges, preferences, stats, created_at',
            (user_id, email, name, '[]', '{}', '{}')
        )
        user = cur.fetchone()
        
        # Créer les credentials
        password_hash = hash_password(password)
        cur.execute(
            'INSERT INTO auth_credentials (user_id, email, password_hash, email_verified) VALUES (%s, %s, %s, FALSE)',
            (user_id, email, password_hash)
        )
        
        conn.commit()
        
        # Créer la session
        session['user_id'] = user['id']
        session['email'] = user['email']
        session.permanent = True
        
        cur.close()
        conn.close()
        
        print(f"✅ Utilisateur créé avec succès: {email}")
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'points': user['points'],
                'badges': user['badges'],
                'preferences': user['preferences'],
                'stats': user['stats'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            }
        }), 201
        
    except Exception as e:
        print(f"❌ Erreur signup: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500

@app.route('/api/auth/signin', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email et mot de passe requis'}), 400
        
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Récupérer les credentials
        cur.execute('SELECT user_id, password_hash FROM auth_credentials WHERE email = %s', (email,))
        auth = cur.fetchone()
        
        if not auth or not verify_password(password, auth['password_hash']):
            cur.close()
            conn.close()
            return jsonify({'error': 'Email ou mot de passe incorrect'}), 401
        
        # Récupérer l'utilisateur
        cur.execute('SELECT id, email, name, points, badges, preferences, stats, created_at FROM users WHERE id = %s', (auth['user_id'],))
        user = cur.fetchone()
        
        cur.close()
        conn.close()
        
        # Créer la session
        session['user_id'] = user['id']
        session['email'] = user['email']
        session.permanent = True
        
        print(f"✅ Connexion réussie: {email}")
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'points': user['points'],
                'badges': user['badges'],
                'preferences': user['preferences'],
                'stats': user['stats'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            }
        })
        
    except Exception as e:
        print(f"❌ Erreur signin: {str(e)}")
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500

@app.route('/api/auth/session', methods=['GET'])
def get_session():
    if 'user_id' not in session:
        return jsonify({'session': None, 'user': None})
    
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute('SELECT id, email, name, points, badges, preferences, stats, created_at FROM users WHERE id = %s', (session['user_id'],))
        user = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if not user:
            session.clear()
            return jsonify({'session': None, 'user': None})
        
        return jsonify({
            'session': {
                'user_id': session['user_id'],
                'email': session['email']
            },
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'points': user['points'],
                'badges': user['badges'],
                'preferences': user['preferences'],
                'stats': user['stats'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            }
        })
        
    except Exception as e:
        print(f"❌ Erreur session: {str(e)}")
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500

@app.route('/api/auth/signout', methods=['POST'])
def signout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/users/<user_id>', methods=['GET'])
@require_auth
def get_user(user_id):
    if session['user_id'] != user_id:
        return jsonify({'error': 'Forbidden'}), 403
    
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute('SELECT id, email, name, points, badges, preferences, stats, created_at FROM users WHERE id = %s', (user_id,))
        user = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404
        
        return jsonify({
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'points': user['points'],
            'badges': user['badges'],
            'preferences': user['preferences'],
            'stats': user['stats'],
            'created_at': user['created_at'].isoformat() if user['created_at'] else None
        })
        
    except Exception as e:
        print(f"❌ Erreur get_user: {str(e)}")
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 MotiveMe Python API démarrage...")
    print(f"📡 Backend Flask sur http://0.0.0.0:3000")
    print(f"🔒 Sessions configurées")
    print(f"🌐 CORS activé pour tous les origins")
    app.run(host='0.0.0.0', port=3000, debug=True)
