import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import receiptRoutes from "./routes/receiptRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

const app = express();

// ============ SECURITY MIDDLEWARE ============

// Set security HTTP headers
app.use(helmet());

// Global rate limiting - prevent DDoS/brute force
const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 200, // 200 requests per IP per window
	message: { message: "Too many requests, please try again later" },
	standardHeaders: true,
	legacyHeaders: false,
});
app.use("/api", globalLimiter);

// CORS Configuration - Safe defaults
const allowedOrigins = process.env.CLIENT_URL
	? process.env.CLIENT_URL.split(",")
	: ["http://localhost:5173"];

const corsOptions = {
	origin: (origin, callback) => {
		// Allow requests with no origin (mobile apps, curl, Postman)
		if (!origin) return callback(null, true);
		if (allowedOrigins.includes(origin)) {
			return callback(null, true);
		}
		return callback(new Error("CORS not allowed"), false);
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
	allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Body parsing with size limits (prevent DoS)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Compression for responses
app.use(compression());

// ============ DATABASE CONNECTION ============
connectDB();

// ============ ROUTES ============
app.get("/api/health", (req, res) => {
	res.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	});
});

app.use("/api/auth", authRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/analytics", analyticsRoutes);

// 404 Handler
app.use((req, res) => {
	res.status(404).json({ message: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
	console.error("Error:", err.message);

	// Don't leak error details in production
	const isProd = process.env.NODE_ENV === "production";

	res.status(err.status || 500).json({
		message: isProd ? "Something went wrong" : err.message,
	});
});

// ============ SERVER ============
const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
	console.log(
		`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`
	);
});

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("SIGTERM received. Shutting down gracefully...");
	server.close(() => {
		console.log("Process terminated");
		process.exit(0);
	});
});
