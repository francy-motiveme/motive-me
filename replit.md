# MotiveMe - Challenge Yourself

## Overview

MotiveMe is a goal achievement application that leverages social pressure and witnesses to help users complete personal challenges. It's a Progressive Web App (PWA) built with vanilla JavaScript ES6+ modules, using Express.js backend with PostgreSQL database. The application allows users to create challenges, invite witnesses, perform daily check-ins, and track progress through a gamified system with badges and analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application follows a modular Single Page Application (SPA) architecture using vanilla JavaScript ES6+ modules. The frontend is organized into distinct layers:

- **Entry Point**: `js/app.js` serves as the main application controller, orchestrating all modules and handling the application lifecycle
- **Module Layer**: Core business logic split into specialized modules (auth, challenges, database, ui, validators, badges, email, analytics)
- **Component Layer**: Reusable UI components like modals and notifications that can be instantiated across the application
- **View Layer**: Single HTML file with multiple screens controlled via CSS classes and JavaScript state management

The architecture uses ES6 imports/exports for dependency management and follows a publish-subscribe pattern for inter-module communication. State is managed locally within modules and synchronized through the database layer.

### Backend Architecture
The application uses Express.js as a custom API backend, providing:
- **Database**: PostgreSQL (Replit/Neon) with automatic table initialization
- **Authentication**: Session-based auth with bcrypt password hashing and express-session

### Data Storage Solutions
**Primary Database**: PostgreSQL (Replit-hosted) with the following key tables:
- `users`: User profiles and metadata
- `auth_credentials`: Email/password credentials with verification status
- `challenges`: Challenge definitions and settings
- `check_ins`: Daily progress entries with proof
- `notifications`: System notifications
- `witness_interactions`: Challenge witness relationships
- `achievements`: User achievement tracking (badges)
- `file_uploads`: File upload tracking

**Client Storage**: LocalStorage for session persistence and offline capability through a Service Worker implementation.

### Authentication and Authorization
**Authentication Strategy**: Email/password authentication through Express sessions with the following security measures:
- Password validation requiring 8+ characters, uppercase, lowercase, numbers, and special characters
- Rate limiting on login attempts (5 max per 15 minutes)
- Email verification for new accounts (with confirmation tokens)
- Session cookies with httpOnly and secure flags
- XSS protection through input sanitization
- CSRF protection on all POST/PUT/DELETE routes

**Authorization**: Express middleware checks ensure users can only access their own data and authorized witness relationships.

### Progressive Web App Features
The application is configured as a PWA with:
- **Service Worker**: Intelligent caching strategy for offline functionality
- **Web App Manifest**: Native app-like installation on mobile devices
- **Responsive Design**: Mobile-first approach with touch-friendly interfaces
- **Push Notifications**: Browser notifications for check-in reminders

## External Dependencies

### Core Dependencies
- **express**: Backend API server with routing and middleware
- **pg**: PostgreSQL database driver
- **bcryptjs**: Password hashing and verification
- **express-session**: Session management with secure cookies
- **csurf**: CSRF protection middleware
- **nodemailer**: Email service for confirmations and notifications
- **chart.js**: Data visualization for progress analytics and dashboard charts
- **date-fns**: Date manipulation and formatting utilities
- **vite**: Build tool and development server for modern JavaScript bundling

### Development Dependencies
- **jest**: Unit and integration testing framework
- **playwright**: End-to-end testing across multiple browsers
- **eslint**: Code linting and style enforcement
- **prettier**: Code formatting

### Optional Services
- **EmailJS**: Third-party email service for witness notifications (frontend fallback)
- **SMTP Server**: For sending verification and notification emails (nodemailer)

### Environment Configuration
The application uses environment variables managed through Replit Secrets:
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string (auto-configured by Replit)
- `SESSION_SECRET`: Secret key for session encryption (generated automatically if missing)
- `NODE_ENV`: Environment mode (development/production)

The build system (Vite) handles environment variable injection and provides hot module replacement for development, with production optimization including code splitting and asset optimization.

## Replit Environment Setup

### Latest Update: January 3, 2026

**✅ Express + PostgreSQL Architecture Fully Configured:**

1. **Dependencies**: All npm packages installed successfully
   - Installed via `npm install`
   - All dependencies from package.json resolved
   - Removed: @supabase/supabase-js
   - Added: csurf, nodemailer

2. **Build System**: Vite configured for Replit environment:
   - Host: `0.0.0.0` (accepts all connections for Replit proxy)
   - Port: `5000` (frontend server)
   - `allowedHosts: true` (required for Replit's iframe proxy)
   - Cache-Control headers configured (no-cache for development)
   - Environment variable injection configured via `define` in vite.config.js
   - HMR (Hot Module Replacement) configured with WSS protocol

3. **Workflows**: Two workflows configured:
   - **Backend API**: `node server/index.js` (port 3000)
   - **MotiveMe**: `npm run dev` (port 5000, frontend Vite server)
   - Status: Both workflows auto-restart on changes

4. **Database**: PostgreSQL (Replit-hosted) fully configured:
   - ✅ DATABASE_URL environment variable configured
   - ✅ Database tables created and verified:
     - `users` - User profiles
     - `auth_credentials` - Authentication credentials
     - `challenges` - Challenge definitions
     - `check_ins` - Daily check-ins
     - `notifications` - System notifications
     - `witness_interactions` - Witness relationships
     - `achievements` - Badges and achievements
     - `file_uploads` - File tracking
   - ✅ Indexes created for performance
   - ✅ Triggers configured for auto-updates

5. **Application Status**:
   - ✅ Frontend loading successfully on port 5000
   - ✅ Backend API running on port 3000
   - ✅ Database connection established
   - ✅ All core features operational

## Development Guidelines

### Running the Application
```bash
# Install dependencies (if not already done)
npm install

# Start both workflows (backend + frontend)
# Backend: node server/index.js (port 3000)
# Frontend: npm run dev (port 5000)
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Database Management
When modifying database schema:
1. Update `server/db.js` table creation queries
2. Backend will auto-create missing tables on startup
3. For major schema changes, backup data first

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Security audit
npm run security
```

## Known Issues and Solutions

### Issue 1: Backend won't start
**Symptom**: Error "relation 'users' does not exist"
**Solution**: Tables are created in correct order on startup. If issue persists, check DATABASE_URL is set.

### Issue 2: Session not persisting
**Symptom**: User logged out on page refresh
**Solution**: Ensure SESSION_SECRET is set in environment variables. Express session uses MemoryStore (okay for development).

### Issue 3: Emails not sending
**Symptom**: No confirmation emails received
**Solution**: Configure SMTP settings in environment variables, or emails will be simulated (logged to console).

### Issue 4: Frontend can't reach backend
**Symptom**: API calls failing with CORS errors
**Solution**: Backend automatically allows localhost:5000. For production, update CORS settings in server/index.js.

## Recent Changes

### January 3, 2026
- ✅ Removed all Supabase references
- ✅ Migrated to pure Express.js + PostgreSQL architecture
- ✅ Added CSRF protection middleware
- ✅ Added nodemailer for email confirmations
- ✅ Fixed backend startup order (users table created first)
- ✅ Improved input validation and sanitization
- ✅ Auto-login after signup implemented
- ✅ Session endpoint returns complete user profile

### Architecture Decisions
- **Why Express over Supabase?**: Full control over backend logic, no vendor lock-in, easier debugging
- **Why session-based auth?**: Simpler than JWT for this use case, secure with httpOnly cookies
- **Why PostgreSQL?**: Robust, reliable, great for relational data with complex queries
- **Why nodemailer?**: Industry standard, supports all major SMTP providers