import express from 'express'
import { supabase } from '../config/supabase.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// ✅ CREATE BOOKING (User must be logged in)
router.post('/create', authenticateToken, async (req, res) => {
  const userId = req.user.id
  const { venue, date, time, notes } = req.body

  // Validate input
  if (!venue || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Insert booking into Supabase
  const { data, error } = await supabase
    .from('bookings')
    .insert([
      {
        user_id: userId,
        venue,
        date,
        time,
        notes: notes || ''
      }
    ])
    .select()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.json({ booking: data[0] })
})


// ✅ GET USER'S OWN BOOKINGS
router.get('/my-bookings', authenticateToken, async (req, res) => {
  const userId = req.user.id

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.json({ bookings: data })
})


// ✅ ADMIN: GET ALL BOOKINGS
router.get('/all', authenticateToken, async (req, res) => {
  // Only allow admins
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden: Admins only' })
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.json({ bookings: data })
})

export default router