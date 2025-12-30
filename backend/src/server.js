import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import receiptRoutes from "./routes/receiptRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import merchantRoutes from "./routes/merchantRoutes.js";

const app = express();

// Required when behind a proxy (Render/Cloudflare) for correct IP and rate limiting
app.set("trust proxy", 1);

// ============ DATABASE ============
connectDB();

// ============ SECURITY & BASICS ============
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",")
  : ["http://localhost:5173", "https://green-recipt.vercel.app"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow tools/curl/postman
    if (allowedOrigins.includes(origin) || origin.includes("vercel.app")) {
      return callback(null, true);
    }
    return callback(new Error("CORS not allowed"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(helmet());
app.use(cookieParser()); // Parse cookies for refresh token
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// ============ ROUTES ============
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is awake and healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/merchant", merchantRoutes);

// ============ ERROR HANDLERS ============
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  const isProd = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    message: isProd ? "Something went wrong" : err.message,
  });
});

// ============ SERVER ============
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});
