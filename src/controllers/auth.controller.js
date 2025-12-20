import { db, auth } from "../config/supabase.js";
import jwt from "jsonwebtoken";

const { JWT_SECRET } = process.env;

const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

export const signup = async (req, res) => {
  const { full_name, email, contact_number, password } = req.body;

  if (!full_name || !email || !contact_number || !password)
    return res.status(400).json({ error: "All fields are required" });

  try {
    // 1) Create Supabase Auth user
    const { data, error } = await auth.auth.signUp({
      email,
      password,
      options: { data: { full_name, contact_number } },
    });

    if (error) return res.status(400).json({ error: error.message });

    // ✅ Defensively check for a null user object to prevent crashes
    if (!data.user) {
      return res.status(400).json({
        error:
          "User creation failed unexpectedly. The user may already exist or email confirmation is pending.",
      });
    }

    const user = data.user;

    // 2) Insert into the correct 'users' table
    const { error: profileErr } = await db
      .from("users")
      .insert([
        { user_id: user.id, full_name, email, contact_number, role: "user" },
      ]);

    if (profileErr) {
      // If profile insert fails, roll back the auth user creation
      // Use the 'db' client which has the service_role_key for admin operations
      await db.auth.admin.deleteUser(user.id).catch(console.error);
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
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
};
