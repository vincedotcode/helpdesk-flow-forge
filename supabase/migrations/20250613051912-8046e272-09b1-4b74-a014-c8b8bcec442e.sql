
-- Create the authenticate_user function
CREATE OR REPLACE FUNCTION public.authenticate_user(
  user_email TEXT,
  user_password TEXT
)
RETURNS TABLE(
  id UUID,
  email VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role user_role,
  department_id UUID,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  password_valid BOOLEAN;
BEGIN
  -- Get user record
  SELECT * INTO user_record
  FROM users u
  WHERE u.email = user_email AND u.is_active = true;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Verify password using crypt function
  SELECT (user_record.password_hash = crypt(user_password, user_record.password_hash)) INTO password_valid;
  
  -- If password is valid, return user data
  IF password_valid THEN
    RETURN QUERY
    SELECT 
      user_record.id,
      user_record.email,
      user_record.first_name,
      user_record.last_name,
      user_record.role,
      user_record.department_id,
      user_record.is_active;
  END IF;
END;
$$;

-- Create the register_user function  
CREATE OR REPLACE FUNCTION public.register_user(
  user_email TEXT,
  user_password TEXT,
  user_first_name TEXT,
  user_last_name TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  user_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_user_id UUID;
  new_user_id UUID;
  hashed_password TEXT;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id
  FROM users
  WHERE email = user_email;
  
  IF existing_user_id IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'User already exists'::TEXT;
    RETURN;
  END IF;
  
  -- Hash the password using crypt
  SELECT crypt(user_password, gen_salt('bf')) INTO hashed_password;
  
  -- Insert new user
  INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
  VALUES (user_email, hashed_password, user_first_name, user_last_name, 'end_user', true)
  RETURNING id INTO new_user_id;
  
  RETURN QUERY SELECT true, new_user_id, 'User created successfully'::TEXT;
END;
$$;

-- Create the create_user_by_admin function
CREATE OR REPLACE FUNCTION public.create_user_by_admin(
  user_email TEXT,
  user_password TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_role user_role DEFAULT 'end_user',
  user_department_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  user_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_user_id UUID;
  new_user_id UUID;
  hashed_password TEXT;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id
  FROM users
  WHERE email = user_email;
  
  IF existing_user_id IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'User already exists'::TEXT;
    RETURN;
  END IF;
  
  -- Hash the password using crypt
  SELECT crypt(user_password, gen_salt('bf')) INTO hashed_password;
  
  -- Insert new user
  INSERT INTO users (email, password_hash, first_name, last_name, role, department_id, is_active)
  VALUES (user_email, hashed_password, user_first_name, user_last_name, user_role, user_department_id, true)
  RETURNING id INTO new_user_id;
  
  RETURN QUERY SELECT true, new_user_id, 'User created successfully'::TEXT;
END;
$$;

-- Update the existing super admin user with a properly hashed password
UPDATE users 
SET password_hash = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin@helpdesk.com';
