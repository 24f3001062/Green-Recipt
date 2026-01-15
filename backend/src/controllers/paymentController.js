import crypto from "crypto";
import POSBill from "../models/POSBill.js";
import Receipt from "../models/Receipt.js";
import Merchant from "../models/Merchant.js";

/**
 * Payment Controller - Cashfree Payment Gateway Integration
 * 
 * This implements Cashfree's hosted checkout flow (Zomato-style):
 * - Smart QR contains ONLY a URL (no UPI intent)
 * - Customer scans QR → opens payment page
 * - Backend creates Cashfree order (server-side using secret key)
 * - Customer redirected to Cashfree hosted checkout
 * - Cashfree handles UPI app selection and payment
 * - Webhook confirms payment (source of truth)
 * 
 * WHY Cashfree instead of UPI deep links?
 * - Higher success rate across all PSPs/banks
 * - Merchant KYC compliance (no "merchant not verified" errors)
 * - Reliable webhooks for payment confirmation
 * - Works consistently on iOS and Android
 * - Production-ready and scalable
 */

// Cashfree API configuration from environment
const CASHFREE_BASE = process.env.CASHFREE_API_BASE || "https://sandbox.cashfree.com/pg";
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;

// Frontend URL for redirects
const FRONTEND_URL = process.env.CLIENT_URL?.split(",")[0] || "http://localhost:5173";

/**
 * Helper: Make authenticated request to Cashfree API
 * Uses x-client-id and x-client-secret headers as per Cashfree docs
 */
const cashfreeRequest = async (method, endpoint, data = null) => {
  const url = `${CASHFREE_BASE}${endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    "x-client-id": CASHFREE_APP_ID,
    "x-client-secret": CASHFREE_SECRET_KEY,
    "x-api-version": "2023-08-01", // Use latest stable API version
  };
  
  const options = {
    method,
    headers,
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  const responseData = await response.json();
  
  if (!response.ok) {
    console.error("[Cashfree] API Error:", responseData);
    throw new Error(responseData.message || `Cashfree API error: ${response.status}`);
  }
  
  return responseData;
};

/**
 * POST /api/payments/create-order/:billId
 * Create a Cashfree order for a bill
 * 
 * This endpoint is called when customer clicks "Pay via UPI" on the payment page.
 * It creates a Cashfree order and returns the payment session for hosted checkout.
 * 
 * SECURITY: 
 * - Secret key is used server-side only
 * - Frontend only receives session ID (safe to expose)
 * - Order is mapped to bill for reconciliation
 */
export const createCashfreeOrder = async (req, res) => {
  try {
    const { billId } = req.params;
    const { customerPhone, customerEmail, customerName } = req.body;
    
    // Validate Cashfree configuration
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.error("[Cashfree] Missing API credentials in environment");
      return res.status(500).json({ 
        message: "Payment gateway not configured",
        code: "GATEWAY_NOT_CONFIGURED"
      });
    }
    
    // Find the bill
    const bill = await POSBill.findById(billId).populate("merchantId", "shopName merchantCode");
    
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    
    // Validate bill state
    if (bill.status === "PAID") {
      return res.status(400).json({ 
        message: "Bill is already paid",
        code: "ALREADY_PAID"
      });
    }
    
    if (bill.status === "EXPIRED") {
      return res.status(400).json({ 
        message: "Bill has expired",
        code: "BILL_EXPIRED"
      });
    }
    
    if (bill.status === "CANCELLED") {
      return res.status(400).json({ 
        message: "Bill was cancelled",
        code: "BILL_CANCELLED"
      });
    }
    
    // Check expiry
    if (new Date() > bill.expiresAt) {
      bill.status = "EXPIRED";
      await bill.save();
      return res.status(400).json({ 
        message: "Bill has expired",
        code: "BILL_EXPIRED"
      });
    }
    
    // IDEMPOTENCY: If order already created, return existing session
    // This prevents multiple Cashfree orders for the same bill
    if (bill.cashfreeOrderId && bill.paymentSessionId && bill.cashfreeOrderStatus === "ACTIVE") {
      console.log("[Cashfree] Returning existing order for bill:", billId);
      return res.json({
        orderId: bill.cashfreeOrderId,
        paymentSessionId: bill.paymentSessionId,
        billId: bill._id,
        amount: bill.total,
        message: "Existing order returned"
      });
    }
    
    // Generate unique order ID: GR_<billId>_<timestamp>
    // This ensures uniqueness even if customer retries payment
    const orderId = `GR_${bill._id}_${Date.now().toString(36)}`;
    
    // Build Cashfree order payload
    // Reference: https://docs.cashfree.com/reference/pgcreateorder
    const orderPayload = {
      order_id: orderId,
      order_amount: parseFloat(bill.total.toFixed(2)),
      order_currency: "INR",
      
      // Customer details (required by Cashfree)
      customer_details: {
        customer_id: `CUST_${bill._id}`,
        customer_phone: customerPhone || bill.customerPhone || "9999999999", // Fallback for required field
        customer_email: customerEmail || "", // Optional
        customer_name: customerName || bill.customerName || "Customer",
      },
      
      // Order metadata
      order_meta: {
        // Return URL after payment (success or failure)
        return_url: `${FRONTEND_URL}/pay/result?billId=${bill._id}&order_id={order_id}`,
        // Notify URL is for webhooks (handled separately)
        notify_url: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/payments/webhook`,
      },
      
      // Order note (shown in UPI app)
      order_note: bill.upiNote || `Payment to ${bill.merchantId?.shopName || 'Merchant'}`,
      
      // Order expiry (optional - Cashfree default is 30 mins)
      // We set it to match bill expiry or 30 mins, whichever is sooner
      order_expiry_time: new Date(Math.min(
        bill.expiresAt.getTime(),
        Date.now() + 30 * 60 * 1000
      )).toISOString(),
    };
    
    console.log("[Cashfree] Creating order:", { orderId, amount: orderPayload.order_amount });
    
    // Create order via Cashfree API
    const cashfreeResponse = await cashfreeRequest("POST", "/orders", orderPayload);
    
    console.log("[Cashfree] Order created successfully:", {
      order_id: cashfreeResponse.order_id,
      payment_session_id: cashfreeResponse.payment_session_id,
    });
    
    // Update bill with Cashfree order details
    bill.cashfreeOrderId = cashfreeResponse.order_id || orderId;
    bill.paymentSessionId = cashfreeResponse.payment_session_id;
    bill.cashfreeOrderStatus = "ACTIVE";
    bill.isCashfreePayment = true;
    bill.paymentMethod = "upi";
    bill.customerSelected = true;
    
    // Update customer details if provided
    if (customerPhone) bill.customerPhone = customerPhone;
    if (customerName) bill.customerName = customerName;
    
    await bill.save();
    
    // Return response to frontend
    // Frontend will use payment_session_id to initialize Cashfree checkout
    res.json({
      success: true,
      orderId: bill.cashfreeOrderId,
      paymentSessionId: cashfreeResponse.payment_session_id,
      billId: bill._id,
      amount: bill.total,
      // If Cashfree returns a payment link, include it (for redirect flow)
      checkoutUrl: cashfreeResponse.payment_link || null,
    });
    
  } catch (error) {
    console.error("[Cashfree] Create order error:", error);
    res.status(500).json({ 
      message: "Failed to create payment order",
      error: error.message,
      code: "ORDER_CREATION_FAILED"
    });
  }
};

/**
 * POST /api/payments/webhook
 * Cashfree webhook handler
 * 
 * CRITICAL SECURITY:
 * - Verify webhook signature using HMAC-SHA256
 * - Use raw body (not parsed JSON) for signature verification
 * - This is the ONLY authoritative source for payment confirmation
 * 
 * Signature verification:
 * 1. Extract x-webhook-signature and x-webhook-timestamp from headers
 * 2. Concatenate timestamp + raw_body
 * 3. Compute HMAC-SHA256 using secret key
 * 4. Base64 encode and compare with signature header
 * 
 * Reference: https://docs.cashfree.com/reference/webhooks
 */
export const handleCashfreeWebhook = async (req, res) => {
  try {
    // Raw body is set by Express middleware (bodyParser.raw)
    // IMPORTANT: Must be raw Buffer, not parsed JSON
    const rawBody = req.body;
    
    if (!Buffer.isBuffer(rawBody)) {
      console.error("[Cashfree Webhook] Body is not raw buffer - check middleware");
      return res.status(400).json({ message: "Invalid request body format" });
    }
    
    // Extract signature headers
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    
    if (!signature || !timestamp) {
      console.error("[Cashfree Webhook] Missing signature headers");
      return res.status(400).json({ message: "Missing webhook signature" });
    }
    
    // Verify signature
    // Format: HMAC-SHA256(timestamp + raw_body) -> base64
    const hmac = crypto.createHmac("sha256", CASHFREE_SECRET_KEY);
    hmac.update(timestamp + rawBody.toString("utf8"));
    const computedSignature = hmac.digest("base64");
    
    if (computedSignature !== signature) {
      console.error("[Cashfree Webhook] Invalid signature:", {
        expected: computedSignature,
        received: signature,
      });
      return res.status(401).json({ message: "Invalid webhook signature" });
    }
    
    // Signature valid - now parse the payload
    const payload = JSON.parse(rawBody.toString("utf8"));
    
    console.log("[Cashfree Webhook] Received event:", {
      type: payload.type,
      order_id: payload.data?.order?.order_id,
      payment_status: payload.data?.payment?.payment_status,
    });
    
    // Handle different webhook event types
    // Reference: https://docs.cashfree.com/reference/webhooks#payment-webhooks
    const eventType = payload.type;
    const orderData = payload.data?.order;
    const paymentData = payload.data?.payment;
    
    if (!orderData?.order_id) {
      console.warn("[Cashfree Webhook] No order_id in payload");
      return res.status(200).json({ message: "No action needed" });
    }
    
    // Extract bill ID from order_id (format: GR_<billId>_<timestamp>)
    const orderIdParts = orderData.order_id.split("_");
    if (orderIdParts.length < 2 || orderIdParts[0] !== "GR") {
      console.warn("[Cashfree Webhook] Unknown order_id format:", orderData.order_id);
      return res.status(200).json({ message: "Order not from GreenReceipt" });
    }
    
    const billId = orderIdParts[1];
    
    // Find the bill
    const bill = await POSBill.findById(billId);
    
    if (!bill) {
      console.warn("[Cashfree Webhook] Bill not found:", billId);
      return res.status(200).json({ message: "Bill not found" });
    }
    
    // IDEMPOTENCY: Check if already processed
    if (bill.status === "PAID" && bill.cashfreePaymentId) {
      console.log("[Cashfree Webhook] Bill already marked PAID, skipping");
      return res.status(200).json({ message: "Already processed" });
    }
    
    // Store raw webhook payload for debugging/reconciliation
    bill.cashfreeWebhookPayload = payload;
    
    // Handle payment success
    if (eventType === "PAYMENT_SUCCESS" || 
        paymentData?.payment_status === "SUCCESS" ||
        orderData?.order_status === "PAID") {
      
      console.log("[Cashfree Webhook] Payment SUCCESS for bill:", billId);
      
      // Mark bill as PAID
      bill.status = "PAID";
      bill.paidAt = new Date();
      bill.cashfreeOrderStatus = "PAID";
      bill.cashfreePaymentId = paymentData?.cf_payment_id || paymentData?.payment_id;
      bill.paymentMethod = "upi";
      
      await bill.save();
      
      // Generate receipt
      await generateReceiptFromBill(bill);
      
      console.log("[Cashfree Webhook] Bill marked PAID and receipt generated");
      
      // TODO: Send notification to merchant (push notification / websocket)
      // TODO: Send receipt to customer email if provided
      
    } else if (eventType === "PAYMENT_FAILED" || 
               paymentData?.payment_status === "FAILED") {
      
      console.log("[Cashfree Webhook] Payment FAILED for bill:", billId);
      
      // Keep bill in AWAITING_PAYMENT state so customer can retry
      bill.cashfreeOrderStatus = "ACTIVE";
      await bill.save();
      
    } else if (eventType === "ORDER_EXPIRED" || 
               orderData?.order_status === "EXPIRED") {
      
      console.log("[Cashfree Webhook] Order EXPIRED for bill:", billId);
      
      // Only mark expired if not already paid
      if (bill.status !== "PAID") {
        bill.cashfreeOrderStatus = "EXPIRED";
        // Note: We don't mark bill as EXPIRED here - only the Cashfree order expired
        // Customer can create a new order if bill is still valid
      }
      await bill.save();
    }
    
    // Always return 200 to acknowledge webhook
    // Cashfree will retry on non-200 responses
    res.status(200).json({ message: "Webhook processed" });
    
  } catch (error) {
    console.error("[Cashfree Webhook] Error:", error);
    // Return 200 even on error to prevent infinite retries
    // Log the error for investigation
    res.status(200).json({ message: "Error logged" });
  }
};

/**
 * GET /api/payments/status/:billId
 * Get payment status for a bill
 * 
 * Can optionally verify with Cashfree API for real-time status
 * Useful for frontend polling and result page
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { billId } = req.params;
    const { verify } = req.query; // If true, verify with Cashfree API
    
    const bill = await POSBill.findById(billId)
      .populate("merchantId", "shopName merchantCode")
      .populate("receiptId");
    
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    
    // Optionally verify with Cashfree API
    if (verify === "true" && bill.cashfreeOrderId && CASHFREE_APP_ID && CASHFREE_SECRET_KEY) {
      try {
        const cashfreeStatus = await cashfreeRequest("GET", `/orders/${bill.cashfreeOrderId}`);
        
        // Update local status if Cashfree shows PAID
        if (cashfreeStatus.order_status === "PAID" && bill.status !== "PAID") {
          console.log("[Payment Status] Cashfree shows PAID but local is", bill.status);
          bill.status = "PAID";
          bill.paidAt = new Date();
          bill.cashfreeOrderStatus = "PAID";
          await bill.save();
          await generateReceiptFromBill(bill);
        }
      } catch (cfError) {
        console.error("[Payment Status] Cashfree verification failed:", cfError);
        // Continue with local status
      }
    }
    
    res.json({
      billId: bill._id,
      status: bill.status,
      paymentMethod: bill.paymentMethod,
      amount: bill.total,
      paidAt: bill.paidAt,
      cashfreeOrderId: bill.cashfreeOrderId,
      cashfreeOrderStatus: bill.cashfreeOrderStatus,
      receiptId: bill.receiptId?._id,
      merchant: {
        name: bill.merchantId?.shopName,
        code: bill.merchantId?.merchantCode,
      },
    });
    
  } catch (error) {
    console.error("[Payment Status] Error:", error);
    res.status(500).json({ message: "Failed to get payment status" });
  }
};

/**
 * Helper: Generate receipt from a paid bill
 * Called after webhook confirms payment
 */
const generateReceiptFromBill = async (bill) => {
  try {
    // Check if receipt already exists
    if (bill.receiptId) {
      console.log("[Receipt] Receipt already exists for bill:", bill._id);
      return await Receipt.findById(bill.receiptId);
    }
    
    // Get merchant details
    const merchant = await Merchant.findById(bill.merchantId).select(
      "shopName merchantCode addressLine phone logoUrl receiptHeader receiptFooter brandColor businessCategory"
    );
    
    // Create receipt
    const receipt = await Receipt.create({
      merchantId: bill.merchantId,
      merchantCode: merchant?.merchantCode,
      userId: bill.customerId, // May be null if customer didn't log in
      items: bill.items.map(item => ({
        name: item.name,
        unitPrice: item.price,
        quantity: item.quantity || 1,
      })),
      total: bill.total,
      subtotal: bill.total,
      discount: 0,
      source: "qr",
      status: "completed",
      paymentMethod: bill.paymentMethod || "upi",
      transactionDate: bill.paidAt || new Date(),
      currency: "INR",
      note: `Reference: ${bill.upiNote} | Cashfree: ${bill.cashfreeOrderId || 'N/A'}`,
    });
    
    // Link receipt to bill
    bill.receiptId = receipt._id;
    await bill.save();
    
    console.log("[Receipt] Created receipt:", receipt._id, "for bill:", bill._id);
    
    return receipt;
    
  } catch (error) {
    console.error("[Receipt] Failed to generate receipt:", error);
    throw error;
  }
};

export default {
  createCashfreeOrder,
  handleCashfreeWebhook,
  getPaymentStatus,
};
