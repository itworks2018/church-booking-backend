// Load environment variables first
import 'dotenv/config'
import bookingsRouter from './routes/bookings.js'

app.use('/api/bookings', bookingsRouter)
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, requireAdmin } from './middlewares/authMiddleware.js'
import { supabase } from './config/supabase.js'
import errorHandler from './middlewares/errorHandler.js'
import authRoutes from './routes/auth.js'
import profilesRouter from './routes/profiles.js'
app.use('/api/profiles', profilesRouter)

// ✅ Create Express app FIRST
const app = express()

// ✅ Middlewares
app.use(cors())
app.use(express.json())

// ✅ Register routes AFTER app is created
app.use('/api/auth', authRoutes)

// ✅ Root route
app.get('/', (req, res) => {
  res.send('Server is running')
})

// ✅ Supabase test route
app.get('/api/test', async (req, res) => {
  const { data, error } = await supabase.from('venues').select('*')
  if (error) return res.status(400).json({ error: error.message })
  res.json({ message: 'Supabase connected!', venues: data })
})

// ✅ Auth client for signup/login
const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// ✅ AUTH: signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' })

  const { data, error } = await authClient.auth.signUp({ email, password })
  if (error) return res.status(400).json({ error: error.message })

  res.json({ message: 'User created', user: data.user })
})

// ✅ AUTH: login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' })

  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password
  })

  if (error) return res.status(400).json({ error: error.message })

  res.json({
    access_token: data.session?.access_token,
    user: data.user
  })
})

// ✅ PROFILES
app.post('/api/profiles', requireAuth, async (req, res) => {
  const { name } = req.body || {}
  if (!name) return res.status(400).json({ error: 'Name is required' })

  const { data, error } = await supabase
    .from('profiles')
    .insert([{ id: req.user.id, name, role: 'user' }])
    .select()
    .single()   // ✅ THIS FIXES THE CRASH

  if (error) return res.status(400).json({ error: error.message })

  res.json(data)
})

app.get('/api/profiles/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ✅ VENUES
app.get('/api/venues', async (req, res) => {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .order('name')

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ✅ BOOKINGS
app.post('/api/bookings', requireAuth, async (req, res) => {
  const { venue_id, event_name, event_purpose, start_datetime, end_datetime } =
    req.body || {}

  if (!venue_id || !event_name || !start_datetime || !end_datetime) {
    return res
      .status(400)
      .json({ error: 'Missing required booking fields' })
  }

  const payload = {
    user_id: req.user.id,
    venue_id,
    event_name,
    event_purpose,
    start_datetime,
    end_datetime,
    status: 'pending'
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([payload])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

app.get('/api/bookings/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, venues:venues(*)')
    .eq('user_id', req.user.id)
    .order('start_datetime', { ascending: true })

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

app.get('/api/bookings', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, profiles:user_id(*), venues:venue_id(*)')
    .order('start_datetime', { ascending: true })

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ✅ Final error handler
app.use(errorHandler)

// ✅ Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})