import { db, auth } from "../config/supabase.js";
import jwt from "jsonwebtoken";

const { JWT_SECRET } = process.env;

const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

// =========================
// SIGNUP
// =========================
export const signup = async (req, res) => {
  const { full_name, email, contact_number, role, password } = req.body;

  // Roles MUST match frontend values
  const allowedRoles = [
    "DGroup Leader",
    "Ministry Head",
    "DGroup Member",
    "COS",
    "Ministry Assistants",
  ];

  if (!full_name || !email || !contact_number || !password || !role)
    return res.status(400).json({ error: "All fields are required" });

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role selected." });
  }

  try {
    // 1) Create Supabase Auth user (anon key)
    const { data, error } = await auth.auth.signUp({
      email,
      password,
      options: { data: { full_name, contact_number, role } },
    });

    if (error) return res.status(400).json({ error: error.message });

    if (!data.user) {
      return res.status(400).json({
        error:
          "User creation failed unexpectedly. The user may already exist or email confirmation is pending.",
      });
    }

    const user = data.user;

    // 2) Insert into users table (service role key)
    const { error: profileErr } = await db
      .from("users")
      .insert([
        {
          user_id: user.id,
          full_name,
          email,
          contact_number,
          role,
        },
      ]);

    if (profileErr) {
      // Rollback using the AUTH client with service role key
      await auth.auth.admin.deleteUser(user.id).catch(console.error);

      console.error("Error inserting profile:", profileErr);
      return res.status(500).json({ error: "Failed to create profile." });
    }

    return res
      .status(201)
      .json({ message: "Account created. Please verify email if required." });
  } catch (err) {
    console.error("Unhandled signup error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// =========================
// LOGIN
// =========================
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const { data, error } = await auth.auth.signInWithPassword({
      email,
      password,
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
      role: profile?.role || "user",
    });

    return res.json({
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name,
        role: profile?.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};