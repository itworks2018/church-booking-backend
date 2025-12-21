import express from "express";
import { getMyProfile, updateMyProfile } from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET logged-in user's profile
router.get("/my", requireAuth, getMyProfile);

// UPDATE logged-in user's profile
router.patch("/my", requireAuth, updateMyProfile);

export default router;