-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    casual_leave_balance INTEGER DEFAULT 12,
    sick_leave_balance INTEGER DEFAULT 12,
    earned_leave_balance INTEGER DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- 2. Create attendance_settings table
CREATE TABLE IF NOT EXISTS attendance_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_in_cutoff TIME NOT NULL DEFAULT '09:30:00',
    auto_logout_time TIME NOT NULL DEFAULT '18:00:00',
    working_days TEXT[] NOT NULL DEFAULT '{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default row if empty
INSERT INTO attendance_settings (check_in_cutoff, auto_logout_time)
SELECT '09:30:00', '18:00:00'
WHERE NOT EXISTS (SELECT 1 FROM attendance_settings);

-- Enable RLS
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Users can read settings" ON attendance_settings
    FOR SELECT USING (auth.role() = 'authenticated');


-- 3. Admin Policies (Bypassing RLS for admin)
-- Replace 'admin@wtp.com' with the actual admin email if you change it.
-- This allows the admin to SELECT, INSERT, UPDATE, and DELETE across these tables.

-- Admin policies for PROFILES
CREATE POLICY "Admins can do everything on profiles" ON profiles
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@wtp.com');

-- Admin policies for ATTENDANCE
CREATE POLICY "Admins can do everything on attendance" ON attendance
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@wtp.com');

-- Admin policies for LEAVES
CREATE POLICY "Admins can do everything on leaves" ON leaves
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@wtp.com');

-- Admin policies for SETTINGS
CREATE POLICY "Admins can update settings" ON attendance_settings
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@wtp.com');
