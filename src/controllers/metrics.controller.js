import { db } from "../config/supabase.js";

export const getMetricsCounts = async (req, res) => {
  try {
    const { data, error } = await db.rpc("get_metrics_counts");
    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
