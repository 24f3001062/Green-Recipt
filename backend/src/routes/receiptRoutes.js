import express from "express";
import rateLimit from "express-rate-limit";
import {
  createReceipt,
  getCustomerReceipts,
  getMerchantReceipts,
  getReceiptById,
  claimReceipt,
  markReceiptPaid,
  updateReceipt,
  deleteReceipt,
} from "../controllers/receiptController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { createReceiptSchema, receiptIdParamSchema, claimReceiptSchema, updateReceiptSchema } from "../validators/receiptSchemas.js";

const router = express.Router();

// Rate limiting for receipt operations
const receiptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { message: "Too many receipt requests, please try again later" },
});

const createReceiptLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 receipts per minute
  message: { message: "Too many receipts created, please slow down" },
});

router.use(receiptLimiter);

router.post("/", protect, requireRole("merchant", "customer"), createReceiptLimiter, validate(createReceiptSchema), createReceipt);
router.get("/customer", protect, requireRole("customer"), getCustomerReceipts);
router.get("/merchant", protect, requireRole("merchant"), getMerchantReceipts);
router.post("/claim", protect, requireRole("customer"), validate(claimReceiptSchema), claimReceipt);
router.patch("/:id/mark-paid", protect, requireRole("merchant"), validate(receiptIdParamSchema), markReceiptPaid);
router.patch("/:id", protect, validate(updateReceiptSchema), updateReceipt);
router.delete("/:id", protect, validate(receiptIdParamSchema), deleteReceipt);
router.get("/:id", protect, validate(receiptIdParamSchema), getReceiptById);

export default router;
