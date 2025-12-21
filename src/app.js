import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRouter from "./routes/index.js";

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

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

// ✅ API ROUTES (this now includes /api/bookings/my)
app.use("/api", apiRouter);

// ✅ ROOT
app.get("/", (req, res) => res.send("Server running"));

// ✅ START SERVER
app.listen(PORT || 10000, () =>
  console.log(`✅ Server running on port ${PORT || 10000}`)
);