import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

// ✅ ENVIRONMENT VALIDATION
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  JWT_SECRET,
  PORT
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY || !JWT_SECRET) {
  throw new Error("Missing required Supabase or JWT environment variables.");
}

// ✅ SUPABASE CLIENTS
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ CORS (supports multiple origins + credentials)
const allowedOrigins = [
  "http://localhost:5500",
  "http://localhost:5173",
  "https://church-booking-frontend-gamma.vercel.app",
  "https://church-booking-frontend-git-main-jey-tutorials-projects.vercel.app"
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS blocked"));
    },
    credentials: true
  })
);

// ✅ RATE LIMITING (protect login/signup)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many attempts. Try again later."
});

// ✅ JWT HELPER
const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

// ✅ AUTH MIDDLEWARE
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin access only" });
  next();
};

// ✅ SIGNUP
app.post("/api/auth/signup", authLimiter, async (req, res) => {
  const { full_name, email, contact_number, role, password } = req.body;

  if (!full_name || !email || !contact_number || !role || !password)
    return res.status(400).json({ error: "All fields are required" });

  try {
    // 1) Create Supabase Auth user
    const { data, error } = await auth.auth.signUp({
      email,
      password,
      options: { data: { full_name, contact_number, role } }
    });

    if (error) return res.status(400).json({ error: error.message });

    // ✅ Defensively check for a null user object to prevent crashes
    if (!data.user) {
      return res.status(400).json({ error: "User creation failed unexpectedly. The user may already exist or email confirmation is pending." });
    }

    const user = data.user;

    // 2) Insert into the correct 'users' table
    const { error: profileErr } = await db.from("users").insert([
      { user_id: user.id, full_name, email, contact_number, role }
    ]);

    if (profileErr) {
      // If profile insert fails, roll back the auth user creation
      // Use the 'db' client which has the service_role_key for admin operations
      await db.auth.admin.deleteUser(user.id).catch(console.error);
      console.error("Error inserting profile:", profileErr);
      return res.status(500).json({ error: "Failed to create profile." });
    }

    return res.status(201).json({
      message: "Account created. Please verify email if required."
    });
  } catch (err) {
    console.error("Unhandled signup error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ LOGIN
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const { data, error } = await auth.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user)
      return res.status(401).json({ error: "Invalid credentials" });

    const { data: profile } = await db
      .from("users")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    const token = signToken({
      id: data.user.id,
      email: data.user.email,
      role: profile?.role || "user"
    });

    return res.json({
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name,
        role: profile?.role
      }
    });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ CREATE BOOKING
app.post("/api/bookings", requireAuth, async (req, res) => {
  const { event_name, start_datetime, end_datetime, venue_id } = req.body;

  if (!event_name || !start_datetime || !end_datetime || !venue_id)
    return res.status(400).json({ error: "Missing fields" });

  const start = new Date(start_datetime);
  const end = new Date(end_datetime);

  if (isNaN(start) || isNaN(end))
    return res.status(400).json({ error: "Invalid date format" });

  if (end <= start)
    return res.status(400).json({ error: "End time must be after start time" });

  try {
    const { data, error } = await db.from("bookings").insert([
      {
        user_id: req.user.id,
        event_name,
        start_datetime,
        end_datetime,
        venue_id,
        status: "pending"
      }
    ]);

    if (error) return res.status(500).json({ error: "Booking failed" });

    return res.status(201).json({ booking: data[0] });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ UPDATE BOOKING STATUS (ADMIN)
app.patch("/api/bookings/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "approved", "rejected", "cancelled"];

  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status" });

  try {
    const { data, error } = await db
      .from("bookings")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: "Update failed" });

    await db.from("audit_logs").insert([
      {
        booking_id: req.params.id,
        admin_id: req.user.id,
        action: `status_changed_to_${status}`
      }
    ]);

    return res.json({ booking: data });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ ROOT
app.get("/", (req, res) => res.send("Server running"));

app.listen(PORT || 10000, () =>
  console.log(`✅ Server running on port ${PORT || 10000}`)
);