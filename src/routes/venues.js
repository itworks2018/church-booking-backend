import express from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js'

const router = express.Router()

// Get all active venues
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('is_active', true)

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// Admin: create venue
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, area, capacity_min, capacity_max, description } = req.body

  const allowedAreas = [
    'Main Worship Hall',
    'Phase 2 Area 1',
    'Phase 2 Area 2',
    'NxtGen Room'
  ]

  if (!allowedAreas.includes(area)) {
    return res.status(400).json({ error: 'Invalid area selected' })
  }

  const { data, error } = await supabase
    .from('venues')
    .insert([{ name, area, capacity_min, capacity_max, description }])

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

export default router