import { Router } from "express";
import { signup, login } from "../controllers/auth.controller.js";
import rateLimit from "express-rate-limit";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many attempts. Try again later.",
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);

export default router;
