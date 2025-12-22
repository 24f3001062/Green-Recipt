import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
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
		role: {
			type: String,
			enum: ["customer"],
			default: "customer",
			immutable: true,
		},
		phone: {
			type: String,
			trim: true,
		},
		address: {
			line1: { type: String, trim: true },
			line2: { type: String, trim: true },
			city: { type: String, trim: true },
			state: { type: String, trim: true },
			postalCode: { type: String, trim: true },
			country: { type: String, trim: true },
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

userSchema.pre("save", async function hashPassword(next) {
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 10);
	next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
	return bcrypt.compare(candidate, this.password);
};

// Database indexes for query optimization
userSchema.index({ email: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model("User", userSchema);

export default User;
