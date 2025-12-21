import express from "express";
import { getMyProfile, updateMyProfile } from "../controllers/profile.controller.js";
import { authMiddleware } from "../middleware/authmiddleware.js";

const router = express.Router();

// GET logged-in user's profile
router.get("/my", authMiddleware, getMyProfile);

// UPDATE logged-in user's profile
router.patch("/my", authMiddleware, updateMyProfile);

export default router;