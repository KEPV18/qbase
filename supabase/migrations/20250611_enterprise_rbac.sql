-- ============================================================================
-- QBase Enterprise Migration: RBAC + Approval Workflow + Audit Trail
-- Adds: department columns, approval_status, record_department
-- ============================================================================

-- 1. Add department to profiles table
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS department VARCHAR(50);

-- 2. Add department to user_roles table (canonical source for user's dept)
ALTER TABLE IF EXISTS user_roles
  ADD COLUMN IF NOT EXISTS department VARCHAR(50);

-- 3. Add approval_status to records table (separate from lifecycle status)
ALTER TABLE IF EXISTS records
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Approved';

-- 4. Add department to records table (for RBAC filtering)
ALTER TABLE IF EXISTS records
  ADD COLUMN IF NOT EXISTS department VARCHAR(50);

-- 5. Ensure indexes exist for new columns
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_records_approval_status ON records(approval_status);
CREATE INDEX IF NOT EXISTS idx_records_department ON records(department);

-- 6. Update existing records: derive department from form_code section mapping
DO $$
BEGIN
  UPDATE records r
  SET department = CASE
    WHEN r.section_name ILIKE '%Sales%' OR r.form_code IN ('F/08','F/09','F/10','F/50') THEN 'Sales'
    WHEN r.section_name ILIKE '%HR%' OR r.section_name ILIKE '%Training%' OR r.form_code IN ('F/28','F/29','F/30','F/40','F/41','F/42','F/43','F/44') THEN 'HR'
    WHEN r.section_name ILIKE '%Operat%' OR r.form_code IN ('F/11','F/12','F/13','F/14','F/15','F/16','F/18','F/19','F/22','F/24','F/25') THEN 'Operations'
    WHEN r.section_name ILIKE '%Qualit%' OR r.form_code IN ('F/17','F/47') THEN 'Quality'
    WHEN r.section_name ILIKE '%R&D%' OR r.section_name ILIKE '%Design%' OR r.form_code IN ('F/32','F/34','F/35','F/37') THEN 'RD'
    WHEN r.section_name ILIKE '%Management%' OR r.section_name ILIKE '%Doc%' OR r.form_code IN ('F/20','F/21','F/23','F/45','F/46','F/48') THEN 'Management'
    ELSE 'Operations'
  END
  WHERE r.department IS NULL;
END $$;
