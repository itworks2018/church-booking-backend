import express from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js'

const router = express.Router()

// Create booking
router.post('/', requireAuth, async (req, res) => {
  const { venue_id, event_name, event_purpose, start_datetime, end_datetime } = req.body

  if (new Date(start_datetime) >= new Date(end_datetime)) {
    return res.status(400).json({ error: 'Start time must be before end time' })
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      user_id: req.user.id,
      venue_id,
      event_name,
      event_purpose,
      start_datetime,
      end_datetime
    }])

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// User: my bookings
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, venues(name, area)')
    .eq('user_id', req.user.id)
    .order('start_datetime')

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// Admin: all bookings
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query

  let query = supabase
    .from('bookings')
    .select('*, profiles(name), venues(name, area)')
    .order('start_datetime')

  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// Admin: update status
router.put('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body

  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

export default router