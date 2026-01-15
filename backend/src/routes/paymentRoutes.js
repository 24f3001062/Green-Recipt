import { Router } from "express";
import express from "express";
import {
  createCashfreeOrder,
  handleCashfreeWebhook,
  getPaymentStatus,
} from "../controllers/paymentController.js";

const router = Router();

/**
 * Payment Routes - Cashfree Payment Gateway Integration
 * 
 * These routes handle the Zomato-style payment flow:
 * 1. Customer scans QR → opens /pay/:billId page
 * 2. Frontend calls POST /api/payments/create-order/:billId
 * 3. Backend creates Cashfree order and returns payment session
 * 4. Frontend redirects to Cashfree hosted checkout
 * 5. Cashfree processes payment and sends webhook
 * 6. POST /api/payments/webhook receives and verifies webhook
 * 7. Bill is marked PAID and receipt is generated
 * 
 * SECURITY NOTES:
 * - create-order endpoint is PUBLIC (no auth) since customers scanning QR aren't logged in
 * - However, it only creates orders for existing bills (which were created by authenticated merchants)
 * - Webhook endpoint uses raw body parser for signature verification
 * - Payment confirmation is ONLY via webhook (server-to-server), not client-side
 */

// ==========================================
// PUBLIC ROUTES (No Auth Required)
// These are called by the payment page after QR scan
// ==========================================

/**
 * POST /api/payments/create-order/:billId
 * Create a Cashfree order for the bill
 * 
 * Called when customer clicks "Pay via UPI" on payment page
 * Returns payment session ID for Cashfree checkout
 */
router.post("/create-order/:billId", createCashfreeOrder);

/**
 * GET /api/payments/status/:billId
 * Get payment status for a bill
 * 
 * Used by frontend to poll for payment completion
 * Optional ?verify=true to verify with Cashfree API
 */
router.get("/status/:billId", getPaymentStatus);

/**
 * POST /api/payments/webhook
 * Cashfree webhook endpoint
 * 
 * CRITICAL: This route uses raw body parser (not JSON)
 * This is required for HMAC signature verification
 * 
 * The raw body parser is applied in server.js BEFORE
 * the regular JSON body parser, specifically for this route
 */
router.post(
  "/webhook",
  // Raw body parser is applied at server.js level
  // This middleware just ensures raw body exists
  (req, res, next) => {
    if (!Buffer.isBuffer(req.body)) {
      // If body is not raw, the route-specific middleware wasn't applied
      console.error("[Payment Webhook] Body is not raw buffer");
      return res.status(400).json({ message: "Invalid webhook format" });
    }
    next();
  },
  handleCashfreeWebhook
);

export default router;
