import { Router } from "express";
import {
  createBooking,
  updateBookingStatus,
} from "../controllers/bookings.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", requireAuth, createBooking);
router.patch("/:id/status", requireAuth, requireAdmin, updateBookingStatus);

export default router;
