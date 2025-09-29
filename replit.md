# MotiveMe - Challenge Yourself

## Overview

MotiveMe is a goal achievement application that leverages social pressure and witnesses to help users complete personal challenges. It's a Progressive Web App (PWA) built with vanilla JavaScript ES6+ modules, using Supabase as the backend database and authentication provider. The application allows users to create challenges, invite witnesses, perform daily check-ins, and track progress through a gamified system with badges and analytics.

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
The application uses Supabase as a Backend-as-a-Service (BaaS) solution, providing:

- **Database**: PostgreSQL database with Row Level Security (RLS) policies
- **Authentication**: Built-in auth with email/password, session management, and user profiles
- **Real-time**: WebSocket subscriptions for live updates
- **Storage**: File uploads for challenge proof photos/videos

The database interface is abstracted through a centralized `database.js` module that handles all Supabase interactions, error handling, and response normalization.

### Data Storage Solutions
**Primary Database**: Supabase PostgreSQL with the following key tables:
- `users`: User profiles and metadata
- `challenges`: Challenge definitions and settings
- `check_ins`: Daily progress entries with proof
- `witnesses`: Challenge witness relationships
- `badges`: User achievement tracking
- `notifications`: System notifications

**Client Storage**: LocalStorage for session persistence and offline capability through a Service Worker implementation.

### Authentication and Authorization
**Authentication Strategy**: Email/password authentication through Supabase Auth with the following security measures:
- Password validation requiring 8+ characters, uppercase, lowercase, numbers, and special characters
- Rate limiting on login attempts (5 max with temporary blocking)
- Email verification for new accounts
- Session refresh tokens for persistent login
- XSS protection through input sanitization

**Authorization**: Row Level Security (RLS) policies ensure users can only access their own data and authorized witness relationships.

### Progressive Web App Features
The application is configured as a PWA with:
- **Service Worker**: Intelligent caching strategy for offline functionality
- **Web App Manifest**: Native app-like installation on mobile devices
- **Responsive Design**: Mobile-first approach with touch-friendly interfaces
- **Push Notifications**: Browser notifications for check-in reminders

## External Dependencies

### Core Dependencies
- **@supabase/supabase-js**: Backend database and authentication service
- **chart.js**: Data visualization for progress analytics and dashboard charts
- **date-fns**: Date manipulation and formatting utilities
- **vite**: Build tool and development server for modern JavaScript bundling

### Development Dependencies
- **jest**: Unit and integration testing framework
- **playwright**: End-to-end testing across multiple browsers
- **eslint**: Code linting and style enforcement
- **prettier**: Code formatting

### Optional Services
- **EmailJS**: Third-party email service for witness notifications (configured but optional)
- **Social Auth Providers**: Google and GitHub OAuth (configured for future implementation)

### Environment Configuration
The application uses environment variables managed through Replit Secrets:
- `SUPABASE_URL`: Database connection endpoint
- `SUPABASE_ANON_KEY`: Public API key for client-side operations
- `SUPABASE_SERVICE_ROLE_KEY`: Admin API key for server-side operations
- `SESSION_SECRET`: Encryption key for session security

The build system (Vite) handles environment variable injection and provides hot module replacement for development, with production optimization including code splitting and asset optimization.

## Replit Environment Setup

### Date: September 29, 2025

**Setup completed for Replit environment:**

1. **Dependencies Installed**: All npm packages installed via `npm install`
2. **Build System**: Vite configured for Replit with:
   - Host: `0.0.0.0` (accepts all connections)
   - Port: `5000` (frontend server)
   - `allowedHosts: true` (required for Replit's proxy/iframe)
   - Cache headers disabled for development
3. **Workflow**: Development server configured to run `npm run dev` (Vite)
4. **Deployment**: Configured for autoscale deployment:
   - Build: `npm run build`
   - Run: `npm run preview`
5. **.gitignore**: Added comprehensive Node.js patterns

**Current State:**
- Application running successfully on port 5000
- Login screen displaying correctly
- Service Worker registered
- PWA features active
- Supabase connection configured with fallback credentials in vite.config.js