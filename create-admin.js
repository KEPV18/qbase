import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_URL = rawUrl.replace(/`/g, '').trim()
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:')
  if (!SUPABASE_URL) console.error(' - VITE_SUPABASE_URL')
  if (!SERVICE_ROLE_KEY) console.error(' - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function createAdmin() {
  const email = 'admin@test.com'
  const password = 'Admin123456'

  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('role')
    .limit(1)

  const supportsAdminEnum =
    Array.isArray(existingRole) &&
    existingRole.some(r => typeof r.role === 'string' && r.role.toLowerCase() === 'admin') ||
    true

  if (!supportsAdminEnum) {
    console.error('Enum for role does not include "admin". Please add it in Supabase SQL.')
    process.exit(1)
  }

  const { data: userData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

  if (authError) {
    throw authError
  }

  const user = userData.user
  console.log('User created:', user.id)

  const now = new Date().toISOString()

  const { error: profileError } = await supabase.from('profiles').insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    email,
    display_name: 'Admin',
    is_active: true,
    created_at: now,
    updated_at: now,
  })

  if (profileError) {
    throw profileError
  }

  const { error: roleError } = await supabase.from('user_roles').insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    role: 'admin',
    created_at: now,
  })

  if (roleError) {
    throw roleError
  }

  console.log('✅ Admin created successfully')
}

createAdmin().catch(err => {
  console.error('❌ Failed to create admin:', err.message || err)
  process.exit(1)
})
