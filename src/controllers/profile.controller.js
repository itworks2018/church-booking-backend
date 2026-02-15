import { db as supabase } from "../config/supabase.js";

// GET /api/profile/my
export const getMyProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("user_id, full_name, email, contact_number, role")
      .eq("user_id", req.user.id)
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/profile/my
export const updateMyProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ✅ SECURITY: Only allow email and contact_number updates
    // Users are NOT allowed to change their own role
    const { email, contact_number } = req.body;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const { data, error } = await supabase
      .from("users")
      .update({ 
        email, 
        contact_number 
        // role intentionally NOT included - cannot be changed by user
      })
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Profile updated", user: data });
  } catch (err) {
    console.error("Profile update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET /api/profiles
export const getAllProfiles = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("user_id, full_name, email, contact_number, role");

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};