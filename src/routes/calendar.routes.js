import { Router } from "express";
import { getVenueBookings, getVenueAvailableSlots } from "../controllers/calendar.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Get all bookings (pending and approved) for a venue
router.get("/venue/:venueId/bookings", requireAuth, getVenueBookings);

// Get available slots for a venue on a specific date
router.get("/venue/:venueId/available", requireAuth, getVenueAvailableSlots);

export default router;
