import { Router } from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import {
  createBill,
  confirmPayment,
  cancelBill,
  getBillById,
  getBills,
  getActiveBills,
  getPOSStats,
} from "../controllers/posController.js";

const router = Router();

/**
 * POS Routes - Merchant-Confirmed UPI Payment System
 * 
 * All routes require merchant authentication.
 * 
 * Flow:
 * 1. POST /bills - Create bill, get QR
 * 2. Customer scans QR, pays via UPI app
 * 3. POST /bills/:billId/confirm - Merchant confirms payment
 * 4. Receipt auto-generated
 */

// All POS routes require merchant authentication
router.use(protect);
router.use(requireRole("merchant"));

// Stats & active bills (dashboard)
router.get("/stats", getPOSStats);
router.get("/bills/active", getActiveBills);

// Bill CRUD
router.post("/bills", createBill);
router.get("/bills", getBills);
router.get("/bills/:billId", getBillById);

// Payment operations
router.post("/bills/:billId/confirm", confirmPayment);
router.post("/bills/:billId/cancel", cancelBill);

export default router;
