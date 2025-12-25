import React, { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner"; // 👈 NEW LIBRARY
import CustomerSidebar from "../components/customer/CustomerSidebar";
import CustomerHome from "../components/customer/CustomerHome";
import CustomerReceipts from "../components/customer/CustomerReceipts";
import CustomerCalendar from "../components/customer/CustomerCalendar";
import CustomerInsights from "../components/customer/CustomerInsights";
import CustomerProfile from "../components/customer/CustomerProfile";
import CustomerNotifications from "../components/customer/CustomerNotifications";
import {
  ScanLine,
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Banknote,
  Clock,
  ShoppingBag,
} from "lucide-react";
import {
  createReceipt,
  claimReceipt,
  fetchCustomerReceipts,
} from "../services/api";

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [receipts, setReceipts] = useState([]);

  // 📸 SCANNER STATE
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // null | 'success' | 'error' | 'payment-choice'

  // 💳 SCANNED BILL DATA (for immediate payment choice screen)
  const [scannedBillData, setScannedBillData] = useState(null);
  const [customerPaymentIntent, setCustomerPaymentIntent] = useState(null); // 'upi' | 'cash' | null

  // Load receipts for eco impact calculation
  useEffect(() => {
    const loadReceipts = async () => {
      try {
        const { data } = await fetchCustomerReceipts();
        // Backend returns { receipts: [...], pagination: {...} }
        const receiptsData = data.receipts || data || [];
        setReceipts(receiptsData);
        localStorage.setItem("customerReceipts", JSON.stringify(receiptsData));
      } catch (e) {
        // Fallback to localStorage
        const cached = JSON.parse(
          localStorage.getItem("customerReceipts") || "[]"
        );
        setReceipts(cached);
      }
    };
    loadReceipts();

    // Listen for receipt updates
    const handleUpdate = () => {
      const cached = JSON.parse(
        localStorage.getItem("customerReceipts") || "[]"
      );
      setReceipts(cached);
    };
    window.addEventListener("customer-receipts-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("customer-receipts-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Trigger Scanner Modal
  const handleGlobalScan = () => {
    setScanResult(null);
    setScannedBillData(null);
    setCustomerPaymentIntent(null);
    setIsScanning(true);
  };

  // 🧠 HANDLE REAL SCAN RESULT - NOW SHOWS IMMEDIATE PAYMENT CHOICE
  const handleScan = async (rawText) => {
    if (rawText && !scanResult) {
      try {
        // 1. Parse the text from QR
        const receiptData = JSON.parse(rawText);

        // 2. Validate GreenReceipt format
        if (!receiptData.merchant || !receiptData.total) {
          throw new Error("Invalid GreenReceipt QR");
        }

        // 🟢 FIX: TRANSLATE SHORT KEYS BACK TO FULL KEYS
        const fixedItems = (receiptData.items || []).map((item) => {
          const quantity = item.q || item.qty || item.quantity;
          const unitPrice = item.p || item.price || item.unitPrice;
          return {
            name: item.n || item.name,
            quantity,
            unitPrice,
            qty: quantity,
            price: unitPrice,
          };
        });

        // 3. Create Receipt Object with Fixed Items
        const newReceipt = {
          ...receiptData,
          id: receiptData.id || `GR-${Date.now()}`,
          items: fixedItems,
          type: "qr",
          excludeFromStats: false,
        };

        // 4. Store scanned bill data and show IMMEDIATE PAYMENT CHOICE SCREEN
        setScannedBillData(newReceipt);
        setScanResult("payment-choice"); // Show payment options immediately!
      } catch (err) {
        console.log("Ignored invalid QR code or Scan Error");
      }
    }
  };

  // 💳 HANDLE CUSTOMER PAYMENT INTENT SELECTION
  // NOTE: This is INFORMATIONAL ONLY - does NOT update database!
  // Only the merchant can finalize payment status
  const handlePaymentIntentSelection = async (method) => {
    if (!scannedBillData) return;

    setCustomerPaymentIntent(method);

    // Save receipt to customer's journal (status remains 'pending' until merchant confirms)
    try {
      const payload = {
        merchantId: scannedBillData.merchantId,
        merchantCode: scannedBillData.mid || scannedBillData.merchantCode,
        items: scannedBillData.items,
        source: "qr",
        // Note: This paymentMethod is customer's INTENT, not final - merchant will confirm
        paymentMethod: method,
        transactionDate: scannedBillData.date || new Date().toISOString(),
        total: scannedBillData.total,
        note: scannedBillData.note,
        footer: scannedBillData.footer,
        // Bill stays PENDING until merchant confirms payment
        status: "pending",
      };

      const apiCall = scannedBillData.rid
        ? claimReceipt({ receiptId: scannedBillData.rid })
        : createReceipt(payload);

      const { data } = await apiCall;
      const existing =
        JSON.parse(localStorage.getItem("customerReceipts")) || [];
      const merged = [
        data,
        ...existing.filter((r) => r.id !== data.id && r._id !== data.id),
      ];
      localStorage.setItem("customerReceipts", JSON.stringify(merged));
      window.dispatchEvent(new Event("customer-receipts-updated"));
    } catch (apiError) {
      // Fallback to local storage
      const existing =
        JSON.parse(localStorage.getItem("customerReceipts")) || [];
      if (!existing.find((r) => r.id === scannedBillData.id)) {
        localStorage.setItem(
          "customerReceipts",
          JSON.stringify([
            { ...scannedBillData, status: "pending" },
            ...existing,
          ])
        );
      }
      window.dispatchEvent(new Event("customer-receipts-updated"));
    }

    // Show success briefly then close
    setScanResult("success");
    setTimeout(() => {
      setIsScanning(false);
      setActiveTab("receipts");
      window.dispatchEvent(new Event("storage"));
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <CustomerSidebar
        activeTab={activeTab}
        onNavigate={setActiveTab}
        receipts={receipts}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* MOBILE HEADER */}
        <div className="md:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 shrink-0 sticky top-0 z-30 shadow-sm">
          <button
            onClick={handleGlobalScan}
            className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 active:scale-95 transition-all"
          >
            <ScanLine size={22} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight">
            <span className="text-emerald-600">Green</span>
            <span className="text-slate-800">Receipt</span>
          </h1>
          <button
            onClick={() => setActiveTab("notifications")}
            className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 active:scale-95 transition-all relative"
          >
            <Bell size={22} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto animate-fade-in">
            {activeTab === "home" && (
              <CustomerHome
                onNavigate={setActiveTab}
                onScanTrigger={handleGlobalScan}
              />
            )}
            {activeTab === "receipts" && <CustomerReceipts />}
            {activeTab === "calendar" && <CustomerCalendar />}
            {activeTab === "insights" && <CustomerInsights />}
            {activeTab === "profile" && <CustomerProfile />}
            {activeTab === "notifications" && <CustomerNotifications />}
          </div>
        </main>
      </div>

      {/* 📸 ROBUST CAMERA OVERLAY */}
      {isScanning && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-fade-in">
          <button
            onClick={() => setIsScanning(false)}
            className="absolute top-6 right-6 text-white p-2 z-50 bg-white/20 rounded-full backdrop-blur-sm"
          >
            <X size={24} />
          </button>

          <div className="w-full max-w-sm px-6 text-center relative">
            {/* 💳 IMMEDIATE PAYMENT CHOICE SCREEN - Shows right after QR scan! */}
            {scanResult === "payment-choice" && scannedBillData ? (
              <div className="animate-[popIn_0.3s_ease-out] bg-white rounded-3xl p-6 shadow-2xl">
                {/* Header */}
                <div className="mb-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag className="text-emerald-600" size={28} />
                  </div>
                  <h3 className="text-slate-800 text-xl font-bold">
                    {scannedBillData.merchant}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    {scannedBillData.date} • {scannedBillData.time}
                  </p>
                </div>

                {/* Bill Amount */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-5">
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1">
                    Total Amount
                  </p>
                  <p className="text-3xl font-black text-slate-800">
                    ₹{scannedBillData.total}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {scannedBillData.items?.length || 0} items
                  </p>
                </div>

                {/* Payment Choice Buttons - IMMEDIATE! */}
                <p className="text-slate-600 text-sm font-bold mb-3">
                  How would you like to pay?
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => handlePaymentIntentSelection("upi")}
                    className="flex flex-col items-center gap-2 p-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 active:scale-95"
                  >
                    <Smartphone size={28} />
                    <span className="text-sm">Pay via UPI</span>
                  </button>

                  <button
                    onClick={() => handlePaymentIntentSelection("cash")}
                    className="flex flex-col items-center gap-2 p-4 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/30 active:scale-95"
                  >
                    <Banknote size={28} />
                    <span className="text-sm">Pay via Cash</span>
                  </button>
                </div>

                {/* Info Note */}
                <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-xl p-3">
                  <Clock size={14} className="shrink-0" />
                  <span>Merchant will confirm your payment</span>
                </div>
              </div>
            ) : scanResult === "success" ? (
              <div className="animate-[popIn_0.3s_ease-out]">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                  <CheckCircle className="text-white" size={48} />
                </div>
                <h3 className="text-white text-2xl font-bold mb-2">
                  {customerPaymentIntent
                    ? `${
                        customerPaymentIntent === "upi" ? "UPI" : "Cash"
                      } Selected!`
                    : "Receipt Scanned!"}
                </h3>
                <p className="text-emerald-400">Saving to your journal...</p>
                {customerPaymentIntent && (
                  <p className="text-slate-400 text-sm mt-2">
                    Waiting for merchant confirmation
                  </p>
                )}
              </div>
            ) : scanResult === "error" ? (
              <div className="animate-[popIn_0.3s_ease-out]">
                <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="text-white" size={48} />
                </div>
                <h3 className="text-white text-2xl font-bold mb-2">
                  Camera Error
                </h3>
                <p className="text-slate-300">
                  Please check your browser permissions.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-white text-xl font-bold mb-6">
                  Scan GreenReceipt QR
                </h3>

                {/* 🎥 SCANNER CONTAINER */}
                <div className="relative overflow-hidden rounded-3xl border-4 border-emerald-500/50 shadow-2xl bg-black aspect-square">
                  <Scanner
                    onScan={(result) => {
                      if (result && result[0]) handleScan(result[0].rawValue);
                    }}
                    onError={(error) => console.log(error)}
                    components={{
                      audio: false,
                      onOff: true,
                    }}
                    styles={{
                      container: { width: "100%", height: "100%" },
                      video: {
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      },
                    }}
                  />

                  {/* Scanning Animation */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-[scan_2s_ease-in-out_infinite] z-10 pointer-events-none"></div>
                </div>

                <p className="text-slate-400 text-sm mt-6">
                  Point at the merchant's screen
                </p>
              </>
            )}
          </div>
          <style>{`@keyframes scan { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
