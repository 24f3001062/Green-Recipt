# Razorpay Payment Integration - GreenReceipt

## Overview
This document describes the Razorpay payment gateway integration for GreenReceipt's Smart QR payment system.

## Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Customer      │    │   GreenReceipt   │    │   Razorpay      │
│   (Mobile)      │    │   Backend        │    │   API           │
└────────┬────────┘    └────────┬─────────┘    └────────┬────────┘
         │                      │                       │
    1. Scan QR Code             │                       │
         │                      │                       │
    2. Load /pay/:billId        │                       │
         │──────────────────────>│                       │
         │                      │                       │
    3. Click "Pay via UPI"      │                       │
         │──────────────────────>│                       │
         │                      │  4. Create Order      │
         │                      │──────────────────────>│
         │                      │<──────────────────────│
         │                      │  order_id, key_id     │
         │<──────────────────────│                       │
         │  {orderId, keyId}    │                       │
         │                      │                       │
    5. Open Razorpay Checkout   │                       │
         │                      │                       │
    6. Complete UPI Payment     │                       │
         │                      │                       │
    7. Payment Success Handler  │                       │
         │──────────────────────>│                       │
         │  {payment_id, sig}   │  8. Verify Signature  │
         │                      │  (HMAC-SHA256)        │
         │                      │                       │
    9. Show Success             │                       │
         │<──────────────────────│                       │
         │                      │                       │
         │                      │  10. Webhook (backup) │
         │                      │<──────────────────────│
         │                      │  payment.captured     │
         │                      │                       │
```

## Files Modified/Created

### Backend

1. **`backend/src/models/POSBill.js`**
   - Added Razorpay-specific fields:
     - `razorpayOrderId` - Razorpay order ID
     - `razorpayPaymentId` - Razorpay payment ID
     - `razorpaySignature` - Payment signature for verification
     - `razorpayOrderStatus` - Order status from Razorpay
     - `razorpayWebhookPayload` - Full webhook payload for debugging
     - `isRazorpayPayment` - Flag to identify Razorpay payments

2. **`backend/src/controllers/paymentController.js`**
   - `createRazorpayOrder` - Creates order on Razorpay (amount in paise)
   - `verifyRazorpayPayment` - Verifies signature using HMAC-SHA256
   - `handleRazorpayWebhook` - Handles `payment.captured` webhook
   - `getPaymentStatus` - Returns payment status for a bill

3. **`backend/src/routes/paymentRoutes.js`**
   - `POST /api/payments/create-order/:billId` - Create Razorpay order
   - `POST /api/payments/verify` - Verify payment signature
   - `POST /api/payments/webhook` - Razorpay webhook endpoint
   - `GET /api/payments/status/:billId` - Get payment status

4. **`backend/src/server.js`**
   - Raw body parser for `/api/payments/webhook` (required for signature verification)

### Frontend

1. **`frontend/src/pages/CustomerPayment.jsx`**
   - Loads Razorpay Checkout script dynamically
   - `handleRazorpayPayment` - Creates order and opens Razorpay Checkout
   - UPI-only configuration (disables cards, wallets, netbanking)
   - Success handler verifies payment with backend
   - Fallback to direct UPI if Razorpay not configured

2. **`frontend/src/pages/PaymentResult.jsx`**
   - Updated references from Cashfree to Razorpay
   - Displays `razorpayOrderId` as reference

3. **`frontend/src/services/api.js`**
   - `createRazorpayOrder` - API call to create order
   - `verifyRazorpayPayment` - API call to verify payment
   - `getPaymentStatus` - API call to check status

## Environment Variables

### Backend (`.env`)
```env
# Razorpay TEST MODE keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### Getting Test Credentials
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Sign up for a free account
3. Toggle to **Test Mode** (top-right)
4. Go to **Settings → API Keys**
5. Generate Key ID and Key Secret
6. Go to **Settings → Webhooks** to get webhook secret

## Testing the Integration

### 1. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Test Payment Flow
1. Create a bill via merchant dashboard
2. Scan QR code (or navigate to `/pay/:billId`)
3. Click "Pay via UPI"
4. Razorpay Checkout opens (TEST MODE)
5. In TEST MODE, you can use:
   - **Test UPI ID**: `success@razorpay`
   - **For failures**: `failure@razorpay`
6. Payment completes and status shows as PAID

### 4. Test Webhook (Local Development)
Use ngrok to expose your local server:
```bash
ngrok http 5001
```
Then configure the webhook URL in Razorpay Dashboard:
```
https://your-ngrok-url.ngrok.io/api/payments/webhook
```

## Razorpay Checkout Configuration

```javascript
{
  key: 'rzp_test_xxx',
  amount: 10000, // Amount in paise (₹100)
  currency: 'INR',
  name: 'Merchant Name',
  order_id: 'order_xxx',
  
  // UPI ONLY configuration
  config: {
    display: {
      blocks: {
        upi: {
          name: 'Pay via UPI',
          instruments: [
            { method: 'upi', flows: ['qr', 'collect', 'intent'] }
          ]
        }
      },
      sequence: ['block.upi'],
      preferences: {
        show_default_blocks: false // Hides cards, wallets, netbanking
      }
    }
  }
}
```

## Security Notes

1. **Never expose `RAZORPAY_KEY_SECRET` on frontend**
2. **Always verify signature on backend** before marking payment as complete
3. **Webhook provides backup confirmation** even if frontend verification fails
4. **Use HTTPS in production** for webhook endpoints
5. **Store webhook payloads** for debugging and audit trails

## Signature Verification

```javascript
// Backend verification
const crypto = require('crypto');

const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(`${order_id}|${payment_id}`)
  .digest('hex');

if (expectedSignature === razorpay_signature) {
  // Payment is authentic
}
```

## Error Handling

| Error Code | Description | Action |
|------------|-------------|--------|
| `GATEWAY_NOT_CONFIGURED` | Razorpay keys not set | Falls back to direct UPI |
| `BILL_NOT_FOUND` | Invalid bill ID | Show error message |
| `BILL_ALREADY_PAID` | Payment already completed | Show success screen |
| `SIGNATURE_MISMATCH` | Tampering detected | Reject payment |

## Production Checklist

- [ ] Replace `rzp_test_*` keys with `rzp_live_*` keys
- [ ] Configure webhook URL with HTTPS endpoint
- [ ] Enable webhook signature verification
- [ ] Test complete flow with real UPI payment
- [ ] Monitor webhook deliveries in Razorpay Dashboard
- [ ] Set up error alerting for failed payments
