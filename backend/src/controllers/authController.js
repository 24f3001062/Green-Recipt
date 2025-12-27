import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import Merchant from "../models/Merchant.js";
import { sendOtpEmail } from "../utils/sendEmail.js"; // no-op; nodemailer is commented out

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET + "_refresh";

// ==========================================
// TOKEN CONFIGURATION
// ==========================================
const ACCESS_TOKEN_EXPIRES_IN = "15m"; // Short-lived access token
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7; // 7 days for refresh token (configurable)
const REFRESH_TOKEN_EXPIRES_IN_MS = REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

// Legacy support - used for simple token flows
const JWT_EXPIRES_IN = "7d";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_WINDOW_MS = 60 * 1000; // 1 minute cooldown between OTP sends

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Define it in your environment before starting the server.");
}

export const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    // Helper to find the right collection
    const account = await findAccountByRole(email, role); // Reuse your existing helper

    if (!account) {
      // Security: Don't reveal if user exists or not, but for dev we return 404
      return res.status(404).json({ message: "Account not found" });
    }

    // Resend cooldown
    if (account.otpLastSentAt && Date.now() - account.otpLastSentAt.getTime() < OTP_RESEND_WINDOW_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_WINDOW_MS - (Date.now() - account.otpLastSentAt.getTime())) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds}s before requesting another code.` });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    // Save OTP to User
    account.otpCodeHash = otpHash;
    account.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    account.otpLastSentAt = new Date();
    await account.save();

    // Email/OTP disabled; password reset via email is not available in this mode.
    // await sendOtpEmail(email, otp);

    res.json({ message: "Password reset via OTP is disabled. Please contact support." });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 2. RESET PASSWORD (Verifies OTP + Sets New Password)
export const resetPassword = async (req, res) => {
  try {
    const { email, role, otp, newPassword } = req.body;

    const account = await findAccountByRole(email, role);
    if (!account) return res.status(404).json({ message: "Account not found" });

    // Verify OTP Logic (Same as verifyOtp)
    if (!account.otpCodeHash || !account.otpExpiresAt || account.otpExpiresAt < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    const isMatch = await bcrypt.compare(otp, account.otpCodeHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid code" });
    }

    account.password = newPassword;
    
    // Clear OTP fields so it can't be reused
    account.otpCodeHash = undefined;
    account.otpExpiresAt = undefined;
    
    await account.save();

    res.json({ message: "Password reset successful" });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==========================================
// TOKEN GENERATION HELPERS
// ==========================================

// Generate short-lived access token (15 minutes)
const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0 },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

// Generate long-lived refresh token (7 days)
const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0 },
    REFRESH_TOKEN_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRES_IN_DAYS}d` }
  );

// Legacy token for backward compatibility
const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

// Generate a random token for refresh token storage
const generateRandomToken = () => crypto.randomBytes(64).toString("hex");

// Store refresh token in database
const persistRefreshToken = async (account, refreshToken) => {
  const hashedToken = await bcrypt.hash(refreshToken, 10);
  account.refreshToken = hashedToken;
  account.refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);
  account.lastLoginAt = new Date();
  await account.save();
};

// Clear refresh token from database
const clearRefreshToken = async (account) => {
  account.refreshToken = undefined;
  account.refreshTokenExpiry = undefined;
  await account.save();
};

const generateOtpCode = () =>
  crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");

const persistOtp = async (account) => {
  const code = generateOtpCode();
  const hash = await bcrypt.hash(code, 10);
  account.otpCodeHash = hash;
  account.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  account.otpAttempts = 0;
  account.otpLastSentAt = new Date();
  await account.save();
  return code;
};

const findAccountByRole = async (email, role = "customer") => {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : null;
  if (!normalizedEmail) return null;
  if (!["customer", "merchant"].includes(role)) return null;

  const primaryModel = role === "merchant" ? Merchant : User;
  const fallbackModel = role === "merchant" ? User : Merchant;

  let account = await primaryModel
    .findOne({ email: normalizedEmail })
    .select("+otpCodeHash +otpExpiresAt +otpAttempts +otpLastSentAt");

  if (!account) {
    // If role was wrong, attempt the other collection so users aren't blocked by a role mismatch.
    account = await fallbackModel
      .findOne({ email: normalizedEmail })
      .select("+otpCodeHash +otpExpiresAt +otpAttempts +otpLastSentAt");
  }

  return account;
};

export const registerCustomer = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const [customerExists, merchantExists] = await Promise.all([
      User.findOne({ email }),
      Merchant.findOne({ email }),
    ]);

    if (customerExists || merchantExists) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const user = new User({ name, email, password, isVerified: true });
    // OTP path disabled; account is verified immediately and credentials stored.
    await user.save();

    res.status(201).json({
      message: "Registration successful. Your account is verified. Please login.",
      email: user.email,
      role: user.role,
      autoVerified: true,
      redirect: "/customer-login",
      next: { type: "redirect", path: "/customer-login" }, // hint to clients to go to login
    });
  } catch (error) {
    console.error("registerCustomer error", error);
    res.status(500).json({ message: "Failed to sign up customer" });
  }
};

export const registerMerchant = async (req, res) => {
  try {
    const { shopName, email, password, confirmPassword } = req.body;

    if (!shopName || !email || !password) {
      return res
        .status(400)
        .json({ message: "Shop name, email, and password are required" });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const [customerExists, merchantExists] = await Promise.all([
      User.findOne({ email }),
      Merchant.findOne({ email }),
    ]);

    if (customerExists || merchantExists) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const merchant = new Merchant({ shopName, email, password, isVerified: true });
    // OTP path disabled; account is verified immediately and credentials stored.
    await merchant.save();

    res.status(201).json({
      message: "Registration successful. Your account is verified. Please login.",
      email: merchant.email,
      role: merchant.role,
      autoVerified: true,
      redirect: "/merchant-login",
      next: { type: "redirect", path: "/merchant-login" }, // hint to clients to go to login
    });
  } catch (error) {
    console.error("registerMerchant error", error);
    res.status(500).json({ message: "Failed to sign up merchant" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role = "customer" } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!["customer", "merchant"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    /*
     * OTP/reset via email intentionally disabled. Keep legacy logic commented to avoid user-facing churn:
     *
     * // Resend cooldown
     * // if (account.otpLastSentAt && Date.now() - account.otpLastSentAt.getTime() < OTP_RESEND_WINDOW_MS) { ... }
     *
     * // const otp = Math.floor(100000 + Math.random() * 900000).toString();
     * // const otpHash = await bcrypt.hash(otp, 10);
     * // account.otpCodeHash = otpHash;
     * // account.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
     * // account.otpLastSentAt = new Date();
     * // await account.save();
     * // await sendOtpEmail(email, otp);
     */

    // Return neutral success to avoid exposing OTP disablement to end-users.
    return res.json({ message: "If an account exists, reset instructions have been sent." });
    
    // Store refresh token in database
    await persistRefreshToken(account, refreshToken);

    res.json({
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      refreshExpiresIn: REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60, // 7 days in seconds
      role: account.role,
      user:
        role === "customer"
          ? { id: account._id, name: account.name, email: account.email }
          : { 
              id: account._id, 
              shopName: account.shopName, 
              email: account.email,
              isProfileComplete: account.isProfileComplete || false,
            },
    });
  } catch (error) {
    console.error("login error", error);
    res.status(500).json({ message: "Failed to login" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, JWT_SECRET);
    const Model = decoded.role === "merchant" ? Merchant : User;

    await Model.findByIdAndUpdate(decoded.id, { isVerified: true });

    res.send(`
      <h2>Email verified successfully 🎉</h2>
      <p>You can now login to GreenReceipt.</p>
    `);
  } catch (error) {
    res.status(400).send("Invalid or expired link");
  }
};

export const getProfile = async (req, res) => {
  try {
    const isMerchant = req.user.role === "merchant";
    const Model = isMerchant ? Merchant : User;
    const account = await Model.findById(req.user.id).lean();

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const payload = isMerchant
      ? {
          id: account._id,
          role: account.role,
          shopName: account.shopName,
          ownerName: account.ownerName || null,
          email: account.email,
          phone: account.phone || null,
          address: account.address || null,
          addressLine: account.addressLine || null,
          businessCategory: account.businessCategory || null,
          businessDescription: account.businessDescription || null,
          operatingHours: account.operatingHours || [],
          receiptFooter: account.receiptFooter || "Thank you! Visit again.",
          receiptHeader: account.receiptHeader || "",
          brandColor: account.brandColor || "#10b981",
          currency: account.currency || "INR",
          merchantCode: account.merchantCode || null,
          logoUrl: account.logoUrl || null,
          isVerified: account.isVerified,
          isProfileComplete: account.isProfileComplete || false,
          onboardingStep: account.onboardingStep || 0,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        }
      : {
          id: account._id,
          role: account.role,
          name: account.name,
          email: account.email,
          phone: account.phone || null,
          address: account.address || null,
          isVerified: account.isVerified,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        };

    res.json(payload);
  } catch (error) {
    console.error("getProfile error", error);
    res.status(500).json({ message: "Failed to load profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const isMerchant = req.user.role === "merchant";
    const Model = isMerchant ? Merchant : User;
    const updates = {};

    if (isMerchant) {
      // Merchant profile updates
      const { 
        shopName, ownerName, email, phone, address, addressLine, 
        businessCategory, businessDescription, operatingHours,
        receiptFooter, receiptHeader, brandColor, logoUrl, currency 
      } = req.body;

      if (shopName) updates.shopName = shopName.trim();
      if (ownerName !== undefined) updates.ownerName = ownerName?.trim() || null;
      if (phone !== undefined) updates.phone = phone?.trim() || null;
      if (addressLine !== undefined) updates.addressLine = addressLine?.trim() || null;
      if (address !== undefined && typeof address === 'object') updates.address = address;
      if (businessCategory !== undefined) updates.businessCategory = businessCategory;
      if (businessDescription !== undefined) updates.businessDescription = businessDescription?.trim() || null;
      if (operatingHours !== undefined) updates.operatingHours = operatingHours;
      if (receiptFooter !== undefined) updates.receiptFooter = receiptFooter?.trim() || "Thank you! Visit again.";
      if (receiptHeader !== undefined) updates.receiptHeader = receiptHeader?.trim() || "";
      if (brandColor !== undefined) updates.brandColor = brandColor?.trim() || "#10b981";
      if (logoUrl !== undefined) updates.logoUrl = logoUrl?.trim() || null;
      if (currency) updates.currency = currency.trim();

      if (email) {
        const normalized = email.trim().toLowerCase();
        const [otherUser, otherMerchant] = await Promise.all([
          User.findOne({ email: normalized }),
          Merchant.findOne({ email: normalized, _id: { $ne: req.user.id } }),
        ]);
        if (otherUser || otherMerchant) {
          return res.status(400).json({ message: "Email already in use" });
        }
        updates.email = normalized;
      }

      const account = await Merchant.findByIdAndUpdate(req.user.id, updates, { new: true }).lean();
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      return res.json({
        id: account._id,
        role: account.role,
        shopName: account.shopName,
        ownerName: account.ownerName || null,
        email: account.email,
        phone: account.phone || null,
        address: account.address || null,
        addressLine: account.addressLine || null,
        businessCategory: account.businessCategory || null,
        businessDescription: account.businessDescription || null,
        operatingHours: account.operatingHours || [],
        receiptFooter: account.receiptFooter || "Thank you! Visit again.",
        receiptHeader: account.receiptHeader || "",
        brandColor: account.brandColor || "#10b981",
        currency: account.currency || "INR",
        merchantCode: account.merchantCode || null,
        logoUrl: account.logoUrl || null,
        isVerified: account.isVerified,
        isProfileComplete: account.isProfileComplete || false,
        onboardingStep: account.onboardingStep || 0,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      });
    }

    // Customer profile updates
    const { name, email, phone, address } = req.body;

    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;

    if (email) {
      const normalized = email.trim().toLowerCase();
      const [otherUser, otherMerchant] = await Promise.all([
        User.findOne({ email: normalized, _id: { $ne: req.user.id } }),
        Merchant.findOne({ email: normalized }),
      ]);
      if (otherUser || otherMerchant) {
        return res.status(400).json({ message: "Email already in use" });
      }
      updates.email = normalized;
    }

    const account = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).lean();
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({
      id: account._id,
      role: account.role,
      name: account.name,
      email: account.email,
      phone: account.phone || null,
      address: account.address || null,
      isVerified: account.isVerified,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    });
  } catch (error) {
    console.error("updateProfile error", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const requestOtp = async (req, res) => {
  try {
    /*
     * OTP flow disabled intentionally; keep prior logic commented for reference.
     * // const { email, role = "customer" } = req.body;
     * // ... legacy OTP generation & send...
     */
    return res.json({ message: "If an account exists, a verification code has been sent." });
  } catch (error) {
    console.error("requestOtp error", error);
    res.status(500).json({ message: "Failed to send code" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    /*
     * OTP verification disabled; keep legacy logic for reference but do not expose this state to end users.
     * // const { email, role = "customer", code } = req.body;
     * // ... legacy verification logic ...
     */

    return res.json({ message: "Account verified." });
  } catch (error) {
    console.error("verifyOtp error", error);
    res.status(500).json({ message: "Failed to verify code" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const Model = req.user.role === "merchant" ? Merchant : User;
    const account = await Model.findById(req.user.id).select("+tokenVersion");

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Verify current password
    const isMatch = await account.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Update password (pre-save hook will hash it)
    account.password = newPassword;
    
    // Increment token version to invalidate all existing sessions
    account.tokenVersion = (account.tokenVersion || 0) + 1;
    account.refreshToken = undefined;
    account.refreshTokenExpiry = undefined;
    
    await account.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("changePassword error", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const Model = req.user.role === "merchant" ? Merchant : User;
    
    // Delete the account
    const result = await Model.findByIdAndDelete(req.user.id);

    if (!result) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Optionally: Delete associated receipts (for data cleanup)
    // You might want to keep receipts for audit purposes, or anonymize them
    // await Receipt.deleteMany({ userId: req.user.id });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("deleteAccount error", error);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

// ==========================================
// REFRESH TOKEN ENDPOINTS
// ==========================================

/**
 * Refresh access token using refresh token
 * POST /auth/refresh
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Refresh token expired. Please login again.", code: "REFRESH_TOKEN_EXPIRED" });
      }
      return res.status(401).json({ message: "Invalid refresh token", code: "INVALID_REFRESH_TOKEN" });
    }

    // Find the account
    const Model = decoded.role === "merchant" ? Merchant : User;
    const account = await Model.findById(decoded.id).select("+refreshToken +refreshTokenExpiry +tokenVersion");

    if (!account) {
      return res.status(401).json({ message: "Account not found", code: "ACCOUNT_NOT_FOUND" });
    }

    // Check if refresh token is still valid in database
    if (!account.refreshToken || !account.refreshTokenExpiry) {
      return res.status(401).json({ message: "Session expired. Please login again.", code: "SESSION_EXPIRED" });
    }

    // Check if refresh token has expired in database
    if (account.refreshTokenExpiry < new Date()) {
      // Clear expired token
      await clearRefreshToken(account);
      return res.status(401).json({ message: "Session expired. Please login again.", code: "SESSION_EXPIRED" });
    }

    // Verify token version matches (for invalidating all sessions on password change)
    if (decoded.tokenVersion !== (account.tokenVersion || 0)) {
      await clearRefreshToken(account);
      return res.status(401).json({ message: "Session invalidated. Please login again.", code: "SESSION_INVALIDATED" });
    }

    // Verify the stored refresh token matches
    const isValidToken = await bcrypt.compare(refreshToken, account.refreshToken);
    if (!isValidToken) {
      // Possible token reuse attack - clear all tokens
      await clearRefreshToken(account);
      return res.status(401).json({ message: "Invalid session. Please login again.", code: "INVALID_SESSION" });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(account);

    // Optionally rotate refresh token for better security
    const newRefreshToken = generateRefreshToken(account);
    await persistRefreshToken(account, newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      refreshExpiresIn: REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60,
      role: account.role,
    });
  } catch (error) {
    console.error("refreshAccessToken error", error);
    res.status(500).json({ message: "Failed to refresh token" });
  }
};

/**
 * Logout - invalidate refresh token
 * POST /auth/logout
 */
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      // Even without refresh token, return success (idempotent logout)
      return res.json({ message: "Logged out successfully" });
    }

    // Try to decode the refresh token to find the account
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (error) {
      // Token invalid/expired, but still return success
      return res.json({ message: "Logged out successfully" });
    }

    // Find and clear the refresh token
    const Model = decoded.role === "merchant" ? Merchant : User;
    const account = await Model.findById(decoded.id).select("+refreshToken");

    if (account && account.refreshToken) {
      await clearRefreshToken(account);
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("logout error", error);
    // Still return success for logout
    res.json({ message: "Logged out successfully" });
  }
};

/**
 * Logout from all devices - invalidate all sessions
 * POST /auth/logout-all
 */
export const logoutAll = async (req, res) => {
  try {
    const Model = req.user.role === "merchant" ? Merchant : User;
    const account = await Model.findById(req.user.id).select("+tokenVersion");

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Increment token version to invalidate all existing tokens
    account.tokenVersion = (account.tokenVersion || 0) + 1;
    account.refreshToken = undefined;
    account.refreshTokenExpiry = undefined;
    await account.save();

    res.json({ message: "Logged out from all devices successfully" });
  } catch (error) {
    console.error("logoutAll error", error);
    res.status(500).json({ message: "Failed to logout from all devices" });
  }
};

/**
 * Validate token and return session info
 * GET /auth/session
 */
export const getSession = async (req, res) => {
  try {
    const Model = req.user.role === "merchant" ? Merchant : User;
    const account = await Model.findById(req.user.id).lean();

    if (!account) {
      return res.status(404).json({ message: "Account not found", valid: false });
    }

    res.json({
      valid: true,
      role: account.role,
      user:
        account.role === "merchant"
          ? {
              id: account._id,
              shopName: account.shopName,
              email: account.email,
              isProfileComplete: account.isProfileComplete || false,
            }
          : {
              id: account._id,
              name: account.name,
              email: account.email,
            },
    });
  } catch (error) {
    console.error("getSession error", error);
    res.status(500).json({ message: "Failed to get session", valid: false });
  }
};