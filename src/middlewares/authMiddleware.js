import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Supabase client used for auth and profile role checks
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Require a valid Supabase JWT
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return res.status(401).json({ error: 'Invalid token format' })
  }

  const { data, error } = await supabaseAuth.auth.getUser(token)

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Attach the Supabase user object to the request
  req.user = data.user
  next()
}

// Require the user to have role = 'admin' in profiles table
export const requireAdmin = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const { data, error } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', req.user.id)
    .single()

  if (error) {
    console.error('Error checking admin role:', error)
    return res.status(500).json({ error: 'Error checking admin role' })
  }

  if (!data || data.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access only' })
  }

  next()
}