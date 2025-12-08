import express from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'

const router = express.Router()

// SIGNUP
router.post('/signup', async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.json({ user: data.user })
})

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  // ✅ Create your own JWT for backend authorization
  const token = jwt.sign(
    { id: data.user.id, email: data.user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  return res.json({
    access_token: token,
    user: {
      id: data.user.id,
      email: data.user.email
    }
  })
})

export default router