import { Router } from "express";
import {
  createChangeRequest,
  getUserChangeRequests,
  getAllChangeRequests,
  updateChangeRequestStatus,
  deleteChangeRequest
} from "../controllers/change-requests.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// ✅ Public routes (require authentication)
router.post("/", verifyToken, createChangeRequest); // Create new change request
router.get("/my", verifyToken, getUserChangeRequests); // Get user's change requests

// ✅ Admin routes (require admin authentication)
router.get("/", verifyToken, getAllChangeRequests); // Get all change requests
router.patch("/:id", verifyToken, updateChangeRequestStatus); // Update change request status
router.delete("/:id", verifyToken, deleteChangeRequest); // Delete change request

export default router;
