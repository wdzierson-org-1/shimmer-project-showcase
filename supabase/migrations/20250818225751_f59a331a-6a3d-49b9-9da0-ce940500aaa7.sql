-- First, let's check if the user already has a profile and update it, or create a new one
DO $$
BEGIN
  -- Check if the user profile exists and update it to admin role
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = '53d3529e-95c1-450a-a8e3-d3a3c4911f10') THEN
    UPDATE public.profiles 
    SET role = 'admin'::app_role 
    WHERE id = '53d3529e-95c1-450a-a8e3-d3a3c4911f10';
    
    RAISE NOTICE 'Updated existing profile to admin role';
  ELSE
    -- Create a new profile with admin role
    INSERT INTO public.profiles (id, email, role)
    SELECT 
      '53d3529e-95c1-450a-a8e3-d3a3c4911f10'::uuid,
      au.email,
      'admin'::app_role
    FROM auth.users au
    WHERE au.id = '53d3529e-95c1-450a-a8e3-d3a3c4911f10';
    
    RAISE NOTICE 'Created new admin profile';
  END IF;
END $$;