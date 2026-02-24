# Helpdesk Flow Forge - Documentation

## Summary
Helpdesk Flow Forge is a role-based helpdesk platform that lets users submit support requests, route them to departments, assign technicians, and track ticket progress. It includes a dashboard, analytics, broadcasts, and optional AI-assisted ticket intake.

## Roles
- **Super Admin**: Full access to everything (tickets, users, departments, analytics, knowledge base).
- **Department Admin**: Manages tickets and users for their department.
- **Department Technician**: Works assigned tickets and updates status.
- **End User**: Creates tickets and tracks their own requests.

## Key Areas
### Dashboard
- Overview stats
- Broadcast announcements
- Quick actions

### Tickets
- Create a ticket with details and attachments
- Filter/search by status and priority
- Assign tickets (admins)
- Update status (admins/assigned techs)
- View ticket details and chat history

### Departments (Super Admin)
- Create/edit/delete departments
- Assign users to departments

### Users (Super Admin / Department Admin)
- Create users
- Edit roles and department
- Deactivate users

### Broadcasts
- Announcements to all users or a specific role/department

### AI Ticket Assistant (Optional)
- Summarizes ticket context and highlights missing details
- Provides troubleshooting steps and operational next actions

## Quick Start (Local)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the app:
   ```bash
   npm run dev
   ```
3. (Optional) Use Supabase locally:
   ```bash
   supabase start
   ```

## Demo Seed
Use `supabase/seed.sql` to populate demo data. **Warning:** running it will wipe existing rows in key tables.

## Notes
- Navigation uses `/dashboard/*` routes with tab-based sections.
- Permissions are enforced in the UI and supported by Supabase policies.
