# Lost Box System

## Overview

Lost Box is a lost-and-found item tracking system designed for schools or organizations. Users can report lost or found items, search through the database to find matches, and administrators can manage item statuses. Found items are automatically tracked with a 30-day deadline before donation.

The application follows a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens (CSS variables)
- **Animations**: Framer Motion for page transitions
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: REST API with typed route definitions in `shared/routes.ts`
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: express-session with PostgreSQL session store (connect-pg-simple)
- **Authentication**: Replit Auth integration via OpenID Connect

### Shared Code Structure
- `shared/schema.ts` - Database schema definitions using Drizzle
- `shared/routes.ts` - API route contracts with Zod validation schemas
- `shared/models/auth.ts` - User and session table definitions

### Key Design Patterns
- **Type-safe API contracts**: Route definitions include input validation and response schemas
- **Shared validation**: Zod schemas used on both client and server
- **Component-driven UI**: Reusable shadcn/ui components with consistent styling

### Build System
- **Development**: Vite dev server with HMR proxied through Express
- **Production**: esbuild bundles server code, Vite builds client assets
- **Database migrations**: Drizzle Kit for schema management (`db:push` command)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication
- **Replit Auth**: OpenID Connect integration for user authentication
- **Session storage**: PostgreSQL-backed sessions via connect-pg-simple
- Required environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

### UI Framework Dependencies
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, forms, etc.)
- **Tailwind CSS**: Utility-first styling with custom theme configuration
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend build tool and dev server
- **esbuild**: Server-side bundling for production
- **TypeScript**: Full type coverage across the stack