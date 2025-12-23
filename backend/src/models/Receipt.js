import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

itemSchema.virtual("lineTotal").get(function getLineTotal() {
  return (this.unitPrice || 0) * (this.quantity || 0);
});

const receiptSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    items: {
      type: [itemSchema],
      default: [],
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    source: {
      type: String,
      enum: ["qr", "upload", "manual"],
      default: "qr",
    },
    status: {
      type: String,
      enum: ["completed", "pending", "void"],
      default: "completed",
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "cash", "other"],
      default: "upi",
    },
    transactionDate: {
      type: Date,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
      trim: true,
    },
    excludeFromStats: {
      type: Boolean,
      default: false,
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    footer: {
      type: String,
      default: "",
      trim: true,
    },
    merchantSnapshot: {
      shopName: { type: String, trim: true },
      merchantCode: { type: String, trim: true },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      logoUrl: { type: String, trim: true },
      receiptHeader: { type: String, trim: true },
      receiptFooter: { type: String, trim: true },
      brandColor: { type: String, trim: true, default: "#10b981" },
    },
    customerSnapshot: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    category: {
      type: String,
      trim: true,
      default: "general",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

receiptSchema.index({ merchantId: 1, transactionDate: -1 });
receiptSchema.index({ userId: 1, transactionDate: -1 });
receiptSchema.index({ source: 1 });
receiptSchema.index({ excludeFromStats: 1 });

const Receipt = mongoose.model("Receipt", receiptSchema);

export default Receipt;
