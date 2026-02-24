# Helpdesk Flow Forge - Project Documentation

## Overview
Helpdesk Flow Forge is a role-based helpdesk platform for managing support tickets across departments. It provides ticket intake, assignment, status tracking, chat, broadcasts, and administrative tooling for users and departments.

The system is composed of:
- **Frontend**: Vite + React + TypeScript UI with shadcn/ui components and Tailwind CSS.
- **Backend**: Supabase (PostgreSQL, Storage, Edge Functions).
- **AI**: Optional Gemini-powered assistants for ticket intake and triage summaries.

## Roles & Permissions
The application uses four roles:

- **super_admin**
  - Full access to all tickets, users, departments, analytics, and broadcasts.
  - Can assign tickets across all departments.
  - Can manage knowledge base articles.

- **department_admin**
  - Manages tickets within their own department.
  - Can assign department tickets to technicians.
  - Can manage users within their department (end users and technicians).

- **department_technician**
  - Works on tickets assigned to them.
  - Can update ticket status for assigned tickets.

- **end_user**
  - Creates tickets and views their own tickets.

## Key Features
- **Dashboard**: Summary cards, broadcasts, and quick actions.
- **Ticket Management**: Create, search, filter, assign, and update ticket status.
- **Ticket Details**: Full ticket history, attachments, and chat.
- **Department Management** (super_admin): Create, edit, delete departments, and assign users.
- **User Management** (super_admin/department_admin): Create users, edit roles and departments, deactivate users.
- **Broadcasts**: Targeted announcements by role or department.
- **Knowledge Base** (super_admin): Manage articles.
- **AI Ticket Intake Assistant**: Gathers details to create tickets (intake flow, no troubleshooting guidance).
- **AI Ticket Triage Assistant**: Summarizes ticket details, highlights missing information, and provides troubleshooting steps.

## Frontend Structure
- `src/pages/`
  - `Dashboard.tsx`: Main application shell and tab routing.
  - `TicketDetails.tsx`: Detailed ticket view.
  - `Auth.tsx`: Login + signup.
- `src/components/`
  - Ticket list, assignment, and details components.
  - Department and user management views.
  - AI assistant UI.
- `src/hooks/`
  - `useTicketManagement.ts`: Ticket list queries, permissions, and updates.
- `src/contexts/`
  - `AuthContext.tsx`: Custom session-based auth.

## Backend Structure (Supabase)
- **Tables**
  - `users`: Custom user system (not Supabase Auth).
  - `departments`: Department metadata.
  - `tickets`: Ticket core data.
  - `ticket_chat_messages`: Ticket communication log.
  - `knowledge_articles`: Knowledge base entries.
  - `knowledge_chat_sessions` / `knowledge_chat_messages`: Ticket assistant chat history.
  - `broadcasts`, `broadcast_recipients`, `broadcast_notifications`: Announcements.
  - `notifications`: User-level notifications.
  - `user_sessions`: Session tokens for custom auth.

- **Storage**
  - `ticket-attachments`: File uploads for tickets and AI assistant context.

- **Edge Functions** (`supabase/functions/`)
  - `ai-knowledge-assistant`: Ticket intake assistant (creates/updates tickets only).
  - `ai-ticket-assistant`: Ticket triage summaries and missing-details prompts.
  - `authenticate-user`: Auth RPC endpoint.
  - `register-user`: Signup RPC endpoint.
  - `create-user-by-admin`: Admin user creation.

## Authentication Flow
This project uses a **custom users table** (not Supabase Auth).

1. Login calls the `authenticate_user` RPC.
2. A session token is stored in `user_sessions`.
3. The token is stored in localStorage and sent with Supabase requests.

See: `src/contexts/AuthContext.tsx`.

## AI Configuration
AI features are optional and require:
- `GEMINI_API_KEY` set in Supabase Edge Function environment variables.

Functions are located in:
- `supabase/functions/ai-knowledge-assistant/index.ts`
- `supabase/functions/ai-ticket-assistant/index.ts`

## Environment & Configuration
- Supabase client config: `src/integrations/supabase/client.ts`
- If desired, replace hard-coded keys with environment variables.

## Seeding Data
A demo seed is available at:
- `supabase/seed.sql`

It creates departments, users, and tickets with sample data. **Running it will wipe existing data.**

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the frontend:
   ```bash
   npm run dev
   ```
3. (Optional) Run Supabase locally:
   ```bash
   supabase start
   ```

## Quality Checks
- Lint:
  ```bash
  npm run lint
  ```
- Build:
  ```bash
  npm run build
  ```

## Configuration Notes
- The dashboard uses URL paths for tab navigation, e.g. `/dashboard/tickets`.
- Role-based navigation is handled in `src/components/AppSidebar.tsx`.

## Common Tasks
- **Create a department**: Dashboard → Departments (super_admin).
- **Assign users to department**: Dashboard → Departments → Manage Users.
- **Edit user role/department**: Dashboard → Users → Edit.
- **Assign ticket**: Dashboard → Tickets → Assign.
- **Update ticket status**: Dashboard → Tickets or Ticket Details.

---

If you need deployment guidance or CI/CD setup, add a section for your hosting target (Vercel, Netlify, etc.).
