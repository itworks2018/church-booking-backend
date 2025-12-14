// Load environment variables
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// ====== CONFIG ======

// Supabase client (service)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // use service key on backend
);

// Auth client (anon key) for Supabase Auth
const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// ====== EXPRESS APP ======

const app = express();

// CORS – allow your Vercel frontend + local dev
app.use(
  cors({
    origin: [
      'https://church-booking-frontend-git-main-jey-tutorials-projects.vercel.app',
      'http://localhost:3000',
      'http://localhost:5500',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// ====== AUTH HELPERS ======

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

async function getAdminById(id) {
  const { data, error } = await supabase
    .from('admin')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

// ====== MIDDLEWARES ======

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // type: 'user' or 'admin'
    req.user = {
      id: decoded.id,
      email: decoded.email,
      type: decoded.type,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Admin access only' });
  }
  next();
}

// ====== ROOT / HEALTH CHECK ======

app.get('/', (req, res) => {
  res.send('Server is running');
});

// ====== AUTH ROUTES ======

/**
 * USER SIGNUP
 * POST /api/auth/signup
 * Body: { full_name, email, contact_number, role, password }
 * Flow:
 * 1) Create user in Supabase Auth
 * 2) Insert row into users table
 */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { full_name, email, contact_number, role, password } = req.body || {};

    if (!full_name || !email || !contact_number || !role || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // 1) Create Auth user
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // 2) Insert into users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          full_name,
          email,
          contact_number,
          role,
        },
      ])
      .select()
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    return res.json({
      message: 'User registered successfully',
      user: userData,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * USER LOGIN
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { access_token, user }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Ensure this user exists in users table
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError || !dbUser) {
      return res
        .status(400)
        .json({ error: 'User not found in users table' });
    }

    const token = generateToken({
      id: dbUser.id,
      email: dbUser.email,
      type: 'user',
    });

    return res.json({
      access_token: token,
      user: dbUser,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ADMIN LOGIN
 * POST /api/auth/admin/login
 * Body: { email, password }
 * - Auth via Supabase Auth
 * - Then check admin table
 */
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Check admin table
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (adminError || !adminData) {
      return res.status(403).json({ error: 'Not an admin account' });
    }

    const token = generateToken({
      id: adminData.id,
      email: adminData.email,
      type: 'admin',
    });

    return res.json({
      access_token: token,
      admin: adminData,
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ====== USER INFO ROUTE (CURRENT USER) ======

/**
 * GET /api/users/me
 * Get current logged-in user (from users table)
 */
app.get('/api/users/me', requireAuth, async (req, res) => {
  try {
    if (req.user.type !== 'user') {
      return res.status(403).json({ error: 'User access only' });
    }

    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ====== BOOKINGS ======

/**
 * USER: Create booking
 * POST /api/bookings
 * Body: { venue_id, event_name, event_purpose, start_datetime, end_datetime, needs }
 */
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    if (req.user.type !== 'user') {
      return res.status(403).json({ error: 'User access only' });
    }

    const {
      venue_id,
      event_name,
      event_purpose,
      start_datetime,
      end_datetime,
      needs,
    } = req.body || {};

    if (!venue_id || !event_name || !start_datetime || !end_datetime) {
      return res
        .status(400)
        .json({ error: 'Missing required booking fields' });
    }

    const payload = {
      user_id: req.user.id,
      venue_id,
      event_name,
      event_purpose,
      start_datetime,
      end_datetime,
      needs: needs || '',
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * USER: Get own bookings
 * GET /api/bookings/me
 */
app.get('/api/bookings/me', requireAuth, async (req, res) => {
  try {
    if (req.user.type !== 'user') {
      return res.status(403).json({ error: 'User access only' });
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', req.user.id)
      .order('start_datetime', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Get my bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ADMIN: Get all bookings
 * GET /api/bookings
 */
app.get('/api/bookings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('start_datetime', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Get all bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ADMIN: Update booking status (approve/reject/etc.)
 * POST /api/bookings/:id/status
 * Body: { status, notes }
 * - Creates audit_logs entry automatically
 */
app.post(
  '/api/bookings/:id/status',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const bookingId = req.params.id;
      const { status, notes } = req.body || {};

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      // 1) Update booking status
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)
        .select()
        .single();

      if (updateError || !updatedBooking) {
        return res
          .status(400)
          .json({ error: updateError?.message || 'Booking not found' });
      }

      // 2) Insert audit log
      const { error: logError } = await supabase.from('audit_logs').insert([
        {
          booking_id: bookingId,
          admin_id: req.user.id,
          action: status,
          notes: notes || '',
        },
      ]);

      if (logError) {
        console.error('Audit log insert error:', logError);
        // don't fail the whole request, just log it
      }

      res.json(updatedBooking);
    } catch (err) {
      console.error('Update booking status error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ====== AUDIT LOGS (ADMIN) ======

/**
 * ADMIN: Get audit logs
 * GET /api/audit-logs
 */
app.get('/api/audit-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ====== START SERVER ======

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});