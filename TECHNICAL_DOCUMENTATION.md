# Helpdesk Flow Forge - Technical Documentation

## Architecture
- **Frontend**: Vite + React + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Postgres, Storage, Edge Functions)
- **State/Data**: TanStack Query

## Role Model
Roles are stored in the `users` table:
- `super_admin`
- `department_admin`
- `department_technician`
- `end_user`

Role-based restrictions are applied at the UI level and reinforced by Supabase policies.

## Frontend Layout
- `src/pages/Dashboard.tsx`:
  - Main shell, tab-based routing via `/dashboard/*`
- `src/components/AppSidebar.tsx`:
  - Role-based navigation items
- `src/components/TicketManagement.tsx`:
  - Ticket list + create/assign flows
- `src/components/TicketTable.tsx`:
  - Filters, paging, status updates
- `src/pages/TicketDetails.tsx`:
  - Full ticket details + status updates + chat

## Authentication (Custom)
This project uses a custom `users` table (not Supabase Auth).

Flow:
1. Login via RPC `authenticate_user`
2. Session token saved to `user_sessions`
3. Token stored in localStorage and attached to Supabase requests

Key files:
- `src/contexts/AuthContext.tsx`
- `supabase/migrations/20250613051912_8046e272-09b1-4b74-a014-c8b8bcec442e.sql`

## Database Schema (High Level)
- `users`: custom user table with role + department
- `departments`: department registry
- `tickets`: support tickets
- `ticket_chat_messages`: ticket chat history
- `knowledge_articles`: knowledge base
- `knowledge_chat_sessions` / `knowledge_chat_messages`: AI assistant chat history
- `broadcasts` + `broadcast_recipients` + `broadcast_notifications`
- `notifications`: user alerts
- `user_sessions`: auth session tokens

## Supabase Storage
- Bucket: `ticket-attachments`
- Used for ticket attachments and AI context files

## Edge Functions
Located in `supabase/functions/`:
- `ai-knowledge-assistant`: ticket intake assistant (no troubleshooting)
- `ai-ticket-assistant`: triage summarization and missing details
- `authenticate-user`: login RPC proxy
- `register-user`: signup RPC proxy
- `create-user-by-admin`: admin user creation

### AI Configuration
Requires `GEMINI_API_KEY` in Supabase function environment variables.

## Seed Data
- `supabase/seed.sql` creates demo departments, users, and tickets.
- WARNING: This script truncates tables before inserting.

## Build & Lint
- `npm run lint`
- `npm run build`

## Key Permissions in UI
- **Assign tickets**: department_admin + super_admin
- **Update ticket status**: super_admin, department_admin, assigned technician
- **Manage departments**: super_admin
- **Manage users**: super_admin, department_admin (limited scope)

