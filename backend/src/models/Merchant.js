import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Operating hours sub-schema
const operatingHoursSchema = new mongoose.Schema(
	{
		day: {
			type: String,
			enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
			required: true,
		},
		isOpen: {
			type: Boolean,
			default: true,
		},
		openTime: {
			type: String,
			default: "09:00",
		},
		closeTime: {
			type: String,
			default: "21:00",
		},
	},
	{ _id: false }
);

// Address sub-schema for detailed location
const addressSchema = new mongoose.Schema(
	{
		street: { type: String, trim: true },
		city: { type: String, trim: true },
		state: { type: String, trim: true },
		postalCode: { type: String, trim: true },
		country: { type: String, trim: true, default: "India" },
	},
	{ _id: false }
);

const merchantSchema = new mongoose.Schema(
	{
		// Basic Auth Fields
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			minlength: 6,
		},
		merchantCode: {
			type: String,
			unique: true,
			trim: true,
			sparse: true,
		},
		role: {
			type: String,
			enum: ["merchant"],
			default: "merchant",
			immutable: true,
		},
		isVerified: {
			type: Boolean,
			default: false,
		},

		// ==========================================
		// ONBOARDING & PROFILE COMPLETION
		// ==========================================
		isProfileComplete: {
			type: Boolean,
			default: false,
		},
		onboardingStep: {
			type: Number,
			default: 0,
		},

		// ==========================================
		// BUSINESS PROFILE (Collected during onboarding)
		// ==========================================
		shopName: {
			type: String,
			trim: true,
			default: "",
		},
		businessCategory: {
			type: String,
			trim: true,
			maxlength: 100,
		},
		businessDescription: {
			type: String,
			trim: true,
			maxlength: 500,
		},
		ownerName: {
			type: String,
			trim: true,
		},
		phone: {
			type: String,
			trim: true,
		},
		
		// Detailed address
		address: addressSchema,
		
		// Legacy simple address (for backward compatibility)
		addressLine: {
			type: String,
			trim: true,
		},

		// Operating hours for each day
		operatingHours: {
			type: [operatingHoursSchema],
			default: [
				{ day: "monday", isOpen: true, openTime: "09:00", closeTime: "21:00" },
				{ day: "tuesday", isOpen: true, openTime: "09:00", closeTime: "21:00" },
				{ day: "wednesday", isOpen: true, openTime: "09:00", closeTime: "21:00" },
				{ day: "thursday", isOpen: true, openTime: "09:00", closeTime: "21:00" },
				{ day: "friday", isOpen: true, openTime: "09:00", closeTime: "21:00" },
				{ day: "saturday", isOpen: true, openTime: "09:00", closeTime: "21:00" },
				{ day: "sunday", isOpen: false, openTime: "09:00", closeTime: "21:00" },
			],
		},

		// ==========================================
		// RECEIPT CUSTOMIZATION
		// ==========================================
		receiptFooter: {
			type: String,
			trim: true,
			default: "Thank you! Visit again.",
		},
		receiptHeader: {
			type: String,
			trim: true,
			default: "",
		},
		brandColor: {
			type: String,
			trim: true,
			default: "#10b981",
		},
		currency: {
			type: String,
			trim: true,
			default: "INR",
		},
		logoUrl: {
			type: String,
			trim: true,
		},

		// ==========================================
		// OTP & VERIFICATION FIELDS
		// ==========================================
		otpCodeHash: {
			type: String,
			select: false,
		},
		otpExpiresAt: {
			type: Date,
			select: false,
		},
		otpAttempts: {
			type: Number,
			default: 0,
			select: false,
		},
		otpLastSentAt: {
			type: Date,
			select: false,
		},
		// ==========================================
		// REFRESH TOKEN FIELDS
		// ==========================================
		refreshToken: {
			type: String,
			select: false,
		},
		refreshTokenExpiry: {
			type: Date,
			select: false,
		},
		lastLoginAt: {
			type: Date,
		},
		tokenVersion: {
			type: Number,
			default: 0,
			select: false,
		},
	},
	{ timestamps: true }
);

merchantSchema.pre("save", async function hashPassword(next) {
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 10);
	next();
});

// Auto-generate unique merchant code
merchantSchema.pre("save", async function generateMerchantCode(next) {
	if (this.merchantCode) return next();

	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let code;
	let exists = true;

	// Keep generating until we find a unique code
	while (exists) {
		code = "";
		for (let i = 0; i < 6; i++) {
			code += chars.charAt(Math.floor(Math.random() * chars.length));
		}
merchantSchema.index({ refreshToken: 1 }); // For token lookup during refresh
		exists = await mongoose.model("Merchant").findOne({ merchantCode: code });
	}

	this.merchantCode = code;
	next();
});

merchantSchema.methods.comparePassword = function comparePassword(candidate) {
	return bcrypt.compare(candidate, this.password);
};

// Database indexes for query optimization
merchantSchema.index({ email: 1 });
merchantSchema.index({ merchantCode: 1 });
merchantSchema.index({ shopName: "text" }); // Text search on shop name
merchantSchema.index({ isVerified: 1 });
merchantSchema.index({ isProfileComplete: 1 }); // Quick lookup for onboarding status
merchantSchema.index({ businessCategory: 1 }); // Filter by business type
merchantSchema.index({ createdAt: -1 });

const Merchant = mongoose.model("Merchant", merchantSchema);

export default Merchant;
