import { Router } from "express";
import authRouter from "./auth.routes.js";
import bookingsRouter from "./bookings.routes.js";
import usersRouter from "./users.routes.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/bookings", bookingsRouter);
router.use("/users", usersRouter);

export default router;
