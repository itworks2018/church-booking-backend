import express from 'express'
import { supabase } from '../config/supabase.js'
import { authenticateToken } from '../middlewares/auth.js'

const router = express.Router()

// CREATE PROFILE
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.id
  const { name } = req.body

  const { data, error } = await supabase
    .from('profiles')
    .insert([{ user_id: userId, name }])
    .select()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.json({ profile: data[0] })
})

// GET MY PROFILE
router.get('/me', authenticateToken, async (req, res) => {
  const userId = req.user.id

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.json(data)
})

export default router