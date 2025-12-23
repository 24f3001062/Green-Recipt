import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectId = z.string().regex(objectIdRegex, "Invalid id");

const money = z
  .number({ invalid_type_error: "Must be a number" })
  .min(0, "Price must be positive");

const quantity = z
  .number({ invalid_type_error: "Must be a number" })
  .int("Quantity must be an integer")
  .min(1, "Quantity must be at least 1");

export const createReceiptSchema = {
  body: z.object({
    userId: objectId.optional(),
    merchantId: objectId.optional(),
    merchantCode: z.string().trim().optional(),
    items: z
      .array(
        z.object({
          name: z.string().min(1, "Item name is required"),
          unitPrice: money.optional(),
          quantity: quantity.optional(),
          // Allow QR short keys; controller will normalize
          n: z.string().optional(),
          p: z.number().optional(),
          q: z.number().optional(),
        })
      )
      .default([]),
    source: z.enum(["qr", "upload", "manual"]).default("qr"),
    paymentMethod: z.enum(["upi", "card", "cash", "other"]).default("upi"),
    status: z.enum(["completed", "pending", "void"]).optional(),
    transactionDate: z
      .union([z.string(), z.date()])
      .optional(),
    note: z.string().trim().max(500).optional(),
    imageUrl: z.string().url().optional(),
    excludeFromStats: z.boolean().optional(),
    footer: z.string().trim().max(200).optional(),
    category: z.string().trim().max(100).optional(),
    total: money.optional(),
  }),
};

export const claimReceiptSchema = {
  body: z.object({
    receiptId: objectId,
  }),
};

export const receiptIdParamSchema = { params: z.object({ id: objectId }) };

export const updateReceiptSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    paymentMethod: z.enum(["upi", "card", "cash", "other"]).optional(),
    status: z.enum(["completed", "pending", "void"]).optional(),
    note: z.string().trim().max(500).optional(),
    excludeFromStats: z.boolean().optional(),
    category: z.string().trim().max(100).optional(),
  }),
};
