import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const merchantSchema = new mongoose.Schema(
	{
		shopName: {
			type: String,
			required: true,
			trim: true,
		},
		merchantCode: {
			type: String,
			unique: true,
			trim: true,
			sparse: true,
		},
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
		ownerName: {
			type: String,
			trim: true,
		},
		phone: {
			type: String,
			trim: true,
		},
		address: {
			type: String,
			trim: true,
		},
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
			default: "#10b981", // emerald-500
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
		categories: {
			type: [String],
			default: ["Drinks", "Snacks", "Food", "Other"],
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
merchantSchema.index({ createdAt: -1 });

const Merchant = mongoose.model("Merchant", merchantSchema);

export default Merchant;
