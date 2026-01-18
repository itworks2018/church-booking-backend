
import { Router } from "express";
import authRouter from "./auth.routes.js";
import bookingsRouter from "./bookings.routes.js";
import usersRouter from "./users.routes.js";
import metricsRouter from "./metrics.routes.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/bookings", bookingsRouter);
router.use("/users", usersRouter);
router.use("/metrics", metricsRouter);

export default router;
