import "dotenv/config";
import "./utils/reminder.cron.js"; // 24-hour reminder cron
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import adminAuthRoutes from "./routes/admin.auth.routes.js";
import apiRouter from "./routes/index.js";
import profileRoutes from "./routes/profile.routes.js";




const app = express();
app.set("trust proxy", 1);

// ✅ SECURITY: Add security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://cdn.tailwindcss.com",
        "https://cdn.jsdelivr.net"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false
  }
}));

// ✅ ENVIRONMENT VALIDATION
const { JWT_SECRET, PORT } = process.env;

if (!JWT_SECRET) {
  throw new Error("Missing required JWT environment variables.");
}

// ✅ CORS (supports multiple origins + credentials)
const allowedOrigins = [
  "http://localhost:5500",
  "http://localhost:5173",
  "https://church-booking-frontend-gamma.vercel.app",
  "https://church-booking-frontend-git-main-jey-tutorials-projects.vercel.app"
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ JSON PARSER with size limit (security: prevent DoS)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb" }));

// ✅ SECURITY: Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ SECURITY: Stricter rate limiter for sensitive operations
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP
  message: "Too many attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ Apply global rate limiting to all API endpoints
app.use("/api/", apiLimiter);

// ✅ API ROUTES (this now includes /api/bookings/my)
app.use("/api/auth/admin", adminAuthRoutes);
app.use("/api/profile", strictLimiter, profileRoutes);
app.use("/api/bookings", strictLimiter); // ✅ Strict limiting for booking operations
app.use("/api", apiRouter);

// ✅ ROOT
app.get("/", (req, res) => res.send("Server running"));

// ✅ START SERVER
app.listen(PORT || 10000, () =>
  console.log(`✅ Server running on port ${PORT || 10000}`)
);



