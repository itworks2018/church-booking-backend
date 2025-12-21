import { supabase } from "../supabaseClient.js";

// GET /api/profile/my
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, contact_number, role")
      .eq("id", userId)
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
    const userId = req.user.id;
    const { email, contact_number, role } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({ email, contact_number, role })
      .eq("id", userId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Profile updated", user: data });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};