import { db } from "../config/supabase.js";

// 🔹 Metric card: Total users
export const getUsersSummary = async (req, res) => {
  try {
    const { count, error } = await db
      .from("users")
      .select("*", { count: "exact", head: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ totalUsers: count });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
