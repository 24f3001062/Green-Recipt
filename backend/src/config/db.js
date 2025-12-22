import mongoose from "mongoose";

const connectDB = async () => {
	const mongoUri = process.env.MONGO_URI;

	if (!mongoUri) {
		console.error("❌ MONGO_URI environment variable not set");
		process.exit(1);
	}

	try {
		await mongoose.connect(mongoUri, {
			// Connection pool settings
			maxPoolSize: 10,
			minPoolSize: 2,

			// Timeouts
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000,

			// Write concern
			retryWrites: true,
			w: "majority",
		});

		console.log("✅ MongoDB connected successfully");

		// Connection event handlers
		mongoose.connection.on("disconnected", () => {
			console.warn("⚠️ MongoDB disconnected. Attempting reconnection...");
		});

		mongoose.connection.on("reconnected", () => {
			console.log("✅ MongoDB reconnected");
		});

		mongoose.connection.on("error", (err) => {
			console.error("❌ MongoDB error:", err.message);
		});
	} catch (error) {
		console.error("❌ MongoDB connection error:", error.message);
		// Retry connection after 5 seconds instead of hard exit
		console.log("Retrying connection in 5 seconds...");
		setTimeout(connectDB, 5000);
	}
};

export default connectDB;
