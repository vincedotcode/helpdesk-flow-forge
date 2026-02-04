-- Resolve custom session users from a dedicated request header, with backward-compatible authorization fallback.
CREATE OR REPLACE FUNCTION public.get_current_user_from_session()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  request_headers json;
  token text;
  auth_header text;
BEGIN
  BEGIN
    request_headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN OTHERS THEN
    request_headers := '{}'::json;
  END;

  token := nullif(trim(coalesce(request_headers->>'x-session-token', '')), '');

  IF token IS NULL THEN
    auth_header := nullif(trim(coalesce(request_headers->>'authorization', '')), '');
    IF auth_header IS NOT NULL THEN
      IF lower(auth_header) LIKE 'bearer %' THEN
        token := nullif(trim(substr(auth_header, 8)), '');
      ELSE
        token := auth_header;
      END IF;
    END IF;
  END IF;

  IF token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT us.user_id INTO user_id
  FROM public.user_sessions us
  WHERE us.session_token = token
    AND us.expires_at > now()
  ORDER BY us.expires_at DESC
  LIMIT 1;

  RETURN user_id;
END;
$$;
