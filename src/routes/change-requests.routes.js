import { Router } from "express";
import {
  createChangeRequest,
  getUserChangeRequests,
  getAllChangeRequests,
  updateChangeRequestStatus,
  deleteChangeRequest
} from "../controllers/change-requests.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// ✅ Public routes (require authentication)
router.post("/", requireAuth, createChangeRequest); // Create new change request
router.get("/my", requireAuth, getUserChangeRequests); // Get user's change requests

// ✅ Admin routes (require admin authentication)
router.get("/", requireAuth, requireAdmin, getAllChangeRequests); // Get all change requests
router.patch("/:id", requireAuth, requireAdmin, updateChangeRequestStatus); // Update change request status
router.delete("/:id", requireAuth, requireAdmin, deleteChangeRequest); // Delete change request

export default router;
