-- Demo seed for hosted Supabase (wipes existing data)
-- NOTE: Running this will delete ALL existing rows in the listed tables.

BEGIN;

-- Wipe existing data (order doesn't matter with CASCADE)
TRUNCATE TABLE
  public.broadcast_recipients,
  public.broadcast_notifications,
  public.notifications,
  public.ticket_chat_messages,
  public.ticket_comments,
  public.user_sessions,
  public.broadcasts,
  public.knowledge_chat_messages,
  public.knowledge_chat_sessions,
  public.knowledge_articles,
  public.tickets,
  public.users,
  public.departments
RESTART IDENTITY CASCADE;

WITH departments AS (
  INSERT INTO public.departments (name, description)
  VALUES
    ('IT', 'Internal IT support and infrastructure'),
    ('HR', 'Human Resources and onboarding'),
    ('Facilities', 'Office and facilities management')
  RETURNING id, name
),
users AS (
  INSERT INTO public.users (
    email,
    password_hash,
    first_name,
    last_name,
    role,
    department_id,
    is_active
  )
  VALUES
    -- Super admin (login: admin@helpdesk.com / admin123)
    ('admin@helpdesk.com', crypt('admin123', gen_salt('bf')), 'Super', 'Admin', 'super_admin', NULL, true),

    -- Department admins (password: Admin123!)
    ('it.admin@helpdesk.com', crypt('Admin123!', gen_salt('bf')), 'Ivy', 'Admin', 'department_admin',
      (SELECT id FROM departments WHERE name = 'IT'), true),
    ('hr.admin@helpdesk.com', crypt('Admin123!', gen_salt('bf')), 'Hugh', 'Admin', 'department_admin',
      (SELECT id FROM departments WHERE name = 'HR'), true),

    -- Technicians (password: Tech123!)
    ('it.tech1@helpdesk.com', crypt('Tech123!', gen_salt('bf')), 'Tina', 'Tech', 'department_technician',
      (SELECT id FROM departments WHERE name = 'IT'), true),
    ('it.tech2@helpdesk.com', crypt('Tech123!', gen_salt('bf')), 'Tom', 'Tech', 'department_technician',
      (SELECT id FROM departments WHERE name = 'IT'), true),
    ('hr.tech1@helpdesk.com', crypt('Tech123!', gen_salt('bf')), 'Hana', 'Tech', 'department_technician',
      (SELECT id FROM departments WHERE name = 'HR'), true),
    ('facilities.tech1@helpdesk.com', crypt('Tech123!', gen_salt('bf')), 'Faye', 'Tech', 'department_technician',
      (SELECT id FROM departments WHERE name = 'Facilities'), true),

    -- End users (password: User123!)
    ('alice@helpdesk.com', crypt('User123!', gen_salt('bf')), 'Alice', 'Ng', 'end_user',
      (SELECT id FROM departments WHERE name = 'IT'), true),
    ('bob@helpdesk.com', crypt('User123!', gen_salt('bf')), 'Bob', 'Khan', 'end_user',
      (SELECT id FROM departments WHERE name = 'IT'), true),
    ('carol@helpdesk.com', crypt('User123!', gen_salt('bf')), 'Carol', 'Diaz', 'end_user',
      (SELECT id FROM departments WHERE name = 'IT'), true),
    ('dave@helpdesk.com', crypt('User123!', gen_salt('bf')), 'Dave', 'Patel', 'end_user',
      (SELECT id FROM departments WHERE name = 'HR'), true),
    ('erin@helpdesk.com', crypt('User123!', gen_salt('bf')), 'Erin', 'Lee', 'end_user',
      (SELECT id FROM departments WHERE name = 'HR'), true),
    ('frank@helpdesk.com', crypt('User123!', gen_salt('bf')), 'Frank', 'Moore', 'end_user',
      (SELECT id FROM departments WHERE name = 'HR'), true),
    ('grace@helpdesk.com', crypt('User123!', gen_salt('bf')), 'Grace', 'Kim', 'end_user',
      (SELECT id FROM departments WHERE name = 'Facilities'), true),
    ('heidi@helpdesk.com', crypt('User123!', gen_salt('bf')), 'Heidi', 'Zhou', 'end_user',
      (SELECT id FROM departments WHERE name = 'Facilities'), true)
  RETURNING id, email, role, department_id
),
tickets AS (
  INSERT INTO public.tickets (
    title,
    description,
    status,
    priority,
    created_by,
    assigned_to,
    department_id,
    category,
    urgency_level,
    affected_systems,
    steps_to_reproduce,
    expected_behavior,
    actual_behavior,
    business_impact,
    additional_info,
    created_at,
    updated_at
  )
  VALUES
    (
      'VPN not connecting',
      'VPN fails to connect from home Wi-Fi.',
      'open',
      'high',
      (SELECT id FROM users WHERE email = 'alice@helpdesk.com'),
      (SELECT id FROM users WHERE email = 'it.tech1@helpdesk.com'),
      (SELECT id FROM departments WHERE name = 'IT'),
      'Access',
      'High',
      'VPN, Laptop',
      'Open VPN client, click Connect',
      'VPN should connect within 10 seconds',
      'Connection times out after 30 seconds',
      'Unable to access internal systems remotely',
      'Happens on both home and hotspot',
      now() - interval '3 days',
      now() - interval '3 days'
    ),
    (
      'Laptop overheating',
      'Device gets very hot and shuts down during video calls.',
      'in_progress',
      'medium',
      (SELECT id FROM users WHERE email = 'bob@helpdesk.com'),
      (SELECT id FROM users WHERE email = 'it.tech2@helpdesk.com'),
      (SELECT id FROM departments WHERE name = 'IT'),
      'Hardware',
      'Medium',
      'Laptop',
      'Start Zoom call for 10+ minutes',
      'Laptop should remain stable',
      'Laptop powers off unexpectedly',
      'Lost time in customer meetings',
      'Cooling fan sounds loud',
      now() - interval '5 days',
      now() - interval '2 days'
    ),
    (
      'Email account locked',
      'Account locked after password reset attempts.',
      'resolved',
      'medium',
      (SELECT id FROM users WHERE email = 'carol@helpdesk.com'),
      (SELECT id FROM users WHERE email = 'it.tech1@helpdesk.com'),
      (SELECT id FROM departments WHERE name = 'IT'),
      'Access',
      'Low',
      'Email',
      'Attempted reset 3 times',
      'Should be able to reset password',
      'Account locked',
      'Cannot access email',
      'Unlocked via admin console',
      now() - interval '7 days',
      now() - interval '1 day'
    ),
    (
      'Onboarding access needed',
      'New hire needs access to HR portal.',
      'open',
      'low',
      (SELECT id FROM users WHERE email = 'dave@helpdesk.com'),
      (SELECT id FROM users WHERE email = 'hr.admin@helpdesk.com'),
      (SELECT id FROM departments WHERE name = 'HR'),
      'Access',
      'Low',
      'HR Portal',
      'Login with new credentials',
      'Account should have HR portal access',
      'Access denied',
      'Delayed onboarding tasks',
      NULL,
      now() - interval '2 days',
      now() - interval '2 days'
    ),
    (
      'Payroll report incorrect',
      'Payroll summary totals seem off by ~5%.',
      'in_progress',
      'high',
      (SELECT id FROM users WHERE email = 'erin@helpdesk.com'),
      (SELECT id FROM users WHERE email = 'hr.tech1@helpdesk.com'),
      (SELECT id FROM departments WHERE name = 'HR'),
      'Reporting',
      'High',
      'Payroll System',
      'Generate report for last pay period',
      'Totals should match ledger',
      'Totals are lower than expected',
      'Potential payroll errors',
      'Need investigation with finance',
      now() - interval '4 days',
      now() - interval '1 day'
    ),
    (
      'Benefits enrollment page error',
      'Enrollment page shows 500 error.',
      'open',
      'urgent',
      (SELECT id FROM users WHERE email = 'frank@helpdesk.com'),
      (SELECT id FROM users WHERE email = 'hr.admin@helpdesk.com'),
      (SELECT id FROM departments WHERE name = 'HR'),
      'Web App',
      'Urgent',
      'Benefits Portal',
      'Click “Enroll Now”',
      'Enrollment page should load',
      '500 error shown',
      'Employees cannot enroll benefits',
      'Happens in Chrome and Edge',
      now() - interval '1 day',
      now() - interval '1 day'
    ),
    (
      'Office badge not working',
      'Badge fails to open main entrance.',
      'open',
      'medium',
      (SELECT id FROM users WHERE email = 'grace@helpdesk.com'),
      (SELECT id FROM users WHERE email = 'facilities.tech1@helpdesk.com'),
      (SELECT id FROM departments WHERE name = 'Facilities'),
      'Access',
      'Medium',
      'Badge System',
      'Tap badge at entrance',
      'Door should unlock',
      'Access denied',
      'Cannot enter building',
      'Started this morning',
      now() - interval '1 day',
      now() - interval '1 day'
    ),
    (
      'Conference room projector flickers',
      'Projector flickers during presentations.',
      'in_progress',
      'medium',
      (SELECT id FROM users WHERE email = 'heidi@helpdesk.com'),
      (SELECT id FROM users WHERE email = 'facilities.tech1@helpdesk.com'),
      (SELECT id FROM departments WHERE name = 'Facilities'),
      'Hardware',
      'Low',
      'Projector',
      'Power on projector and connect HDMI',
      'Stable image',
      'Image flickers every few minutes',
      'Disrupts meetings',
      'Tried different cables',
      now() - interval '6 days',
      now() - interval '2 days'
    ),
    (
      'Printer not found',
      'Cannot find floor printer in list.',
      'open',
      'low',
      (SELECT id FROM users WHERE email = 'alice@helpdesk.com'),
      NULL,
      (SELECT id FROM departments WHERE name = 'IT'),
      'Hardware',
      'Low',
      'Printer',
      'Open print dialog',
      'Printer should appear',
      'Printer missing',
      'Delays printing contracts',
      NULL,
      now() - interval '8 days',
      now() - interval '8 days'
    ),
    (
      'Account deactivation request',
      'Please deactivate contractor account.',
      'closed',
      'medium',
      (SELECT id FROM users WHERE email = 'dave@helpdesk.com'),
      (SELECT id FROM users WHERE email = 'hr.admin@helpdesk.com'),
      (SELECT id FROM departments WHERE name = 'HR'),
      'Access',
      'Low',
      'HR Portal',
      'Submit deactivation request',
      'Account should be disabled',
      'Request completed',
      'Security compliance',
      'Completed same day',
      now() - interval '12 days',
      now() - interval '10 days'
    )
  RETURNING id, title
)
SELECT 'seed complete' AS result;

COMMIT;
