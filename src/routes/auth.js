import express from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'

const router = express.Router()

// SIGNUP
router.post('/signup', async (req, res) => {
  const { full_name, email, contact_number, role, password } = req.body;

  // ✅ 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    return res.status(400).json({ error: authError.message });
  }

  const userId = authData.user.id;

  // ✅ 2. Insert into your custom users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert([
      {
        user_id: userId,
        full_name,
        email,
        contact_number,
        role
      }
    ])
    .select();

  if (userError) {
    return res.status(400).json({ error: userError.message });
  }

  return res.json({
    message: "User registered successfully",
    user: userData[0]
  });
});

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