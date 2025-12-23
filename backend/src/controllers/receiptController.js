import Receipt from "../models/Receipt.js";
import Merchant from "../models/Merchant.js";
import User from "../models/User.js";

const normalizeItems = (items = []) =>
  items.map((item) => ({
    name: item.name || item.n || "Unknown",
    unitPrice:
      typeof item.unitPrice === "number"
        ? item.unitPrice
        : typeof item.price === "number"
        ? item.price
        : Number(item.p) || 0,
    quantity:
      typeof item.quantity === "number"
        ? item.quantity
        : typeof item.qty === "number"
        ? item.qty
        : Number(item.q) || 1,
  }));

const computeTotal = (items) =>
  items.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0);

const mapReceiptToClient = (receipt) => {
  const date = receipt.transactionDate || receipt.createdAt;
  const iso = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  const [isoDate, timePart] = iso.split("T");
  const time = timePart?.slice(0, 5) || "";

  return {
    id: receipt._id,
    merchant: receipt.merchantSnapshot?.shopName,
    merchantCode: receipt.merchantSnapshot?.merchantCode,
    merchantSnapshot: receipt.merchantSnapshot || null,
    customerName: receipt.customerSnapshot?.name || null,
    customerEmail: receipt.customerSnapshot?.email || null,
    amount: receipt.total,
    date: isoDate,
    time,
    type: receipt.source,
    items: (receipt.items || []).map((item) => ({
      name: item.name,
      qty: item.quantity,
      price: item.unitPrice,
    })),
    image: receipt.imageUrl,
    note: receipt.note,
    excludeFromStats: receipt.excludeFromStats,
    footer: receipt.footer || receipt.merchantSnapshot?.receiptFooter || "",
    status: receipt.status,
    paymentMethod: receipt.paymentMethod,
  };
};

export const createReceipt = async (req, res) => {
  try {
    const {
      userId: bodyUserId = null,
      merchantId: bodyMerchantId = null,
      merchantCode = null,
      mid = null,
      items: rawItems = [],
      source = "qr",
      paymentMethod = "upi",
      transactionDate,
      note = "",
      imageUrl = null,
      excludeFromStats = false,
      footer = "",
      category = "general",
      total: providedTotal,
      status = "completed",
      receiptId = null,
      // For customer uploads without merchant
      merchantName = null,
    } = req.body;

    const resolvedMerchantId = req.user.role === "merchant" ? req.user.id : bodyMerchantId;
    const resolvedMerchantCode = merchantCode || mid;

    const userId = req.user.role === "customer" ? req.user.id : bodyUserId;

    const items = normalizeItems(rawItems);
    const computedTotal = computeTotal(items);

    // For uploads, allow providedTotal without items
    const finalTotal = source === "upload" && typeof providedTotal === "number" 
      ? providedTotal 
      : computedTotal;

    if (source !== "upload" && typeof providedTotal === "number" && Math.abs(providedTotal - computedTotal) > 0.01) {
      return res.status(400).json({ message: "Total does not match items sum" });
    }

    let merchant = null;
    // For customer uploads, merchant is optional
    if (source !== "upload" || resolvedMerchantId || resolvedMerchantCode) {
      if (resolvedMerchantId) {
        merchant = await Merchant.findById(resolvedMerchantId).lean();
      } else if (resolvedMerchantCode) {
        merchant = await Merchant.findOne({ merchantCode: resolvedMerchantCode }).lean();
      }
      // Only require merchant for non-upload sources
      if (!merchant && source !== "upload") {
        return res.status(400).json({ message: "Merchant not found" });
      }
    }

    let customerSnapshot;
    if (userId) {
      const user = await User.findById(userId).lean();
      if (!user) {
        return res.status(400).json({ message: "Customer not found" });
      }
      customerSnapshot = { name: user.name, email: user.email };
    }

    // Build merchant snapshot - use merchant data if available, otherwise use provided name
    const merchantSnapshot = merchant 
      ? {
          shopName: merchant.shopName,
          merchantCode: merchant.merchantCode,
          address: merchant.address,
          phone: merchant.phone,
          logoUrl: merchant.logoUrl,
          receiptHeader: merchant.receiptHeader || "",
          receiptFooter: merchant.receiptFooter || "Thank you! Visit again.",
          brandColor: merchant.brandColor || "#10b981",
        }
      : merchantName 
        ? { shopName: merchantName, merchantCode: null, address: null, phone: null, logoUrl: null, receiptHeader: "", receiptFooter: "", brandColor: "#10b981" }
        : null;

    const receipt = await Receipt.create({
      _id: receiptId || undefined,
      merchantId: merchant?._id || null,
      merchantCode: merchant?.merchantCode || null,
      userId,
      items,
      total: finalTotal,
      source,
      paymentMethod,
      status,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      note,
      imageUrl,
      excludeFromStats: Boolean(excludeFromStats),
      footer: footer || merchant?.receiptFooter || "",
      category,
      merchantSnapshot,
      customerSnapshot,
    });

    res.status(201).json(mapReceiptToClient(receipt.toObject()));
  } catch (error) {
    console.error("createReceipt error", error);
    res.status(500).json({ message: "Failed to create receipt" });
  }
};

export const getCustomerReceipts = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user.id };

    const [receipts, total] = await Promise.all([
      Receipt.find(filter)
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Receipt.countDocuments(filter),
    ]);

    res.json({
      receipts: receipts.map(mapReceiptToClient),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("getCustomerReceipts error", error);
    res.status(500).json({ message: "Failed to load receipts" });
  }
};

export const claimReceipt = async (req, res) => {
  try {
    const { receiptId } = req.body;
    const receipt = await Receipt.findById(receiptId);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (receipt.userId && receipt.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Receipt already claimed" });
    }

    receipt.userId = req.user.id;
    const user = await User.findById(req.user.id).lean();
    if (user) {
      receipt.customerSnapshot = { name: user.name, email: user.email };
    }
    await receipt.save();

    res.json(mapReceiptToClient(receipt.toObject()));
  } catch (error) {
    console.error("claimReceipt error", error);
    res.status(500).json({ message: "Failed to claim receipt" });
  }
};

export const markReceiptPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    if (!receipt.merchantId || receipt.merchantId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update receipt" });
    }

    receipt.status = "completed";
    await receipt.save();
    res.json(mapReceiptToClient(receipt.toObject()));
  } catch (error) {
    console.error("markReceiptPaid error", error);
    res.status(500).json({ message: "Failed to update receipt" });
  }
};

export const getMerchantReceipts = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = { merchantId: req.user.id };

    const [receipts, total] = await Promise.all([
      Receipt.find(filter)
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Receipt.countDocuments(filter),
    ]);

    res.json({
      receipts: receipts.map(mapReceiptToClient),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("getMerchantReceipts error", error);
    res.status(500).json({ message: "Failed to load receipts" });
  }
};

export const getReceiptById = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id).lean();

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    const isOwner =
      (req.user.role === "customer" && receipt.userId?.toString() === req.user.id) ||
      (req.user.role === "merchant" && receipt.merchantId.toString() === req.user.id);

    if (!isOwner) {
      return res.status(403).json({ message: "Not authorized to view this receipt" });
    }

    res.json(mapReceiptToClient(receipt));
  } catch (error) {
    console.error("getReceiptById error", error);
    res.status(500).json({ message: "Failed to load receipt" });
  }
};

export const updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, status, note, excludeFromStats, category } = req.body;

    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Check ownership - customers can update their receipts, merchants can update their receipts
    const isOwner =
      (req.user.role === "customer" && receipt.userId?.toString() === req.user.id) ||
      (req.user.role === "merchant" && receipt.merchantId?.toString() === req.user.id);

    if (!isOwner) {
      return res.status(403).json({ message: "Not authorized to update this receipt" });
    }

    // Update allowed fields
    if (paymentMethod !== undefined) {
      receipt.paymentMethod = paymentMethod;
    }
    if (status !== undefined) {
      receipt.status = status;
    }
    if (note !== undefined) {
      receipt.note = note;
    }
    if (excludeFromStats !== undefined) {
      receipt.excludeFromStats = Boolean(excludeFromStats);
    }
    if (category !== undefined) {
      receipt.category = category;
    }

    await receipt.save();
    res.json(mapReceiptToClient(receipt.toObject()));
  } catch (error) {
    console.error("updateReceipt error", error);
    res.status(500).json({ message: "Failed to update receipt" });
  }
};

export const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Check ownership - customers can delete their receipts, merchants can delete their receipts
    const isOwner =
      (req.user.role === "customer" && receipt.userId?.toString() === req.user.id) ||
      (req.user.role === "merchant" && receipt.merchantId?.toString() === req.user.id);

    if (!isOwner) {
      return res.status(403).json({ message: "Not authorized to delete this receipt" });
    }

    await Receipt.findByIdAndDelete(id);
    res.json({ message: "Receipt deleted successfully" });
  } catch (error) {
    console.error("deleteReceipt error", error);
    res.status(500).json({ message: "Failed to delete receipt" });
  }
};
