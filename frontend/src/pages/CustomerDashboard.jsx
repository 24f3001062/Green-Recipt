// import React, { useState, useEffect } from 'react';
// import { Scanner } from '@yudiel/react-qr-scanner'; // 👈 NEW LIBRARY
// import CustomerSidebar from '../components/customer/CustomerSidebar';
// import CustomerHome from '../components/customer/CustomerHome';
// import CustomerReceipts from '../components/customer/CustomerReceipts';
// import CustomerCalendar from '../components/customer/CustomerCalendar';
// import CustomerInsights from '../components/customer/CustomerInsights';
// import CustomerProfile from '../components/customer/CustomerProfile';
// import CustomerNotifications from '../components/customer/CustomerNotifications';
// import CustomerRecurringBills from '../components/customer/CustomerRecurringBills';
// import { useTheme } from '../contexts/ThemeContext';
// import { ScanLine, Bell, X, CheckCircle, AlertCircle, Smartphone, Banknote, Clock, ShoppingBag } from 'lucide-react';
// import { createReceipt, claimReceipt, fetchCustomerReceipts } from '../services/api';
// import toast from 'react-hot-toast';

// const CustomerDashboard = () => {
//   const [activeTab, setActiveTab] = useState("home");
//   const [receipts, setReceipts] = useState([]);

//   // 📸 SCANNER STATE
//   const [isScanning, setIsScanning] = useState(false);
//   const [scanResult, setScanResult] = useState(null); // null | 'success' | 'error' | 'payment-choice'

//   // 💳 SCANNED BILL DATA (for immediate payment choice screen)
//   const [scannedBillData, setScannedBillData] = useState(null);
//   const [customerPaymentIntent, setCustomerPaymentIntent] = useState(null); // 'upi' | 'cash' | null

//   // Load receipts for eco impact calculation
//   useEffect(() => {
//     const loadReceipts = async () => {
//       try {
//         const { data } = await fetchCustomerReceipts();
//         // Backend returns { receipts: [...], pagination: {...} }
//         const receiptsData = data.receipts || data || [];
//         setReceipts(receiptsData);
//         localStorage.setItem("customerReceipts", JSON.stringify(receiptsData));
//       } catch (e) {
//         // Fallback to localStorage
//         const cached = JSON.parse(
//           localStorage.getItem("customerReceipts") || "[]"
//         );
//         setReceipts(cached);
//       }
//     };
//     loadReceipts();

//     // Listen for receipt updates
//     const handleUpdate = () => {
//       const cached = JSON.parse(
//         localStorage.getItem("customerReceipts") || "[]"
//       );
//       setReceipts(cached);
//     };
//     window.addEventListener("customer-receipts-updated", handleUpdate);
//     window.addEventListener("storage", handleUpdate);

//     return () => {
//       window.removeEventListener("customer-receipts-updated", handleUpdate);
//       window.removeEventListener("storage", handleUpdate);
//     };
//   }, []);

//   // Trigger Scanner Modal
//   const handleGlobalScan = () => {
//     setScanResult(null);
//     setScannedBillData(null);
//     setCustomerPaymentIntent(null);
//     setIsScanning(true);
//   };

//   // 🧠 HANDLE REAL SCAN RESULT - NOW SHOWS IMMEDIATE PAYMENT CHOICE
//   const handleScan = async (rawText) => {
//     if (rawText && !scanResult) {
//       try {
//         // 1. Parse the text from QR
//         const receiptData = JSON.parse(rawText);

//         // 2. Validate GreenReceipt format - only total is strictly required
//         if (typeof receiptData.total !== 'number' && !receiptData.total) {
//           throw new Error("Invalid GreenReceipt QR - missing total");
//         }

//         // 🟢 FIX: TRANSLATE SHORT KEYS BACK TO FULL KEYS
//         const fixedItems = (receiptData.items || []).map((item) => {
//           const quantity = item.q || item.qty || item.quantity || 1;
//           const unitPrice = item.p || item.price || item.unitPrice || 0;
//           const name = item.n || item.name || "Item";
//           return {
//             name,
//             quantity,
//             unitPrice,
//           };
//         });

//         // 3. Create Receipt Object with Fixed Items
//         const newReceipt = {
//           ...receiptData,
//           merchant: receiptData.merchant || receiptData.m || "Unknown Merchant",
//           id: receiptData.id || `GR-${Date.now()}`,
//           items: fixedItems,
//           type: "qr",
//           excludeFromStats: false,
//         };

//         // 4. Store scanned bill data and show IMMEDIATE PAYMENT CHOICE SCREEN
//         setScannedBillData(newReceipt);
//         setScanResult("payment-choice"); // Show payment options immediately!
//       } catch (err) {
//         console.error("QR Parse Error:", err);
//         toast.error("Invalid QR code format");
//       }
//     }
//   };

//   // 💳 HANDLE CUSTOMER PAYMENT INTENT SELECTION
//   // NOTE: This is INFORMATIONAL ONLY - does NOT update database!
//   // Only the merchant can finalize payment status
//   const handlePaymentIntentSelection = async (method) => {
//     if (!scannedBillData) return;

//     setCustomerPaymentIntent(method);

//     // Save receipt to customer's journal (status remains 'pending' until merchant confirms)
//     try {
//       // Helper to check for Mongo ID
//       const isObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

//       const payload = {
//         // Validation: Only send merchantId if it's a valid ObjectId, otherwise backend might fail lookup
//         merchantId: (scannedBillData.merchantId && isObjectId(scannedBillData.merchantId)) ? scannedBillData.merchantId : null,
//         merchantCode: scannedBillData.mid || scannedBillData.merchantCode || null,
//         // Pass merchant name so backend can create snapshot even without registered merchant
//         merchantName: scannedBillData.merchant || scannedBillData.merchantName || "Unknown Merchant",
//         items: scannedBillData.items,
//         source: "qr",
//         // This is the customer's selected payment method - will be preserved
//         paymentMethod: method,
//         transactionDate: scannedBillData.date || new Date().toISOString(),
//         total: scannedBillData.total,
//         note: scannedBillData.note || "",
//         footer: scannedBillData.footer || "",
//         category: scannedBillData.category || "general",
//         // Customer's transaction is saved immediately as completed
//         status: "completed",
//       };

//       // Only use claimReceipt if rid is a valid MongoDB ObjectId
//       // Dynamic QRs use "GR-..." IDs which should be created as new receipts
      
//       const apiCall = (scannedBillData.rid && isObjectId(scannedBillData.rid))
//         ? claimReceipt({ receiptId: scannedBillData.rid })
//         : createReceipt(payload);

//       const { data } = await apiCall;
      
//       // Update local storage with the real data from server
//       const existing = JSON.parse(localStorage.getItem("customerReceipts")) || [];
//       // Remove any temp/duplicate if exists
//       const filtered = existing.filter((r) => r.id !== data.id && r._id !== data.id);
//       const merged = [data, ...filtered];
      
//       localStorage.setItem("customerReceipts", JSON.stringify(merged));
//       window.dispatchEvent(new Event("customer-receipts-updated"));
      
//       // Show success briefly then close
//       setScanResult("success");
//       toast.success("Receipt saved successfully!");
//       setTimeout(() => {
//         setIsScanning(false);
//         setActiveTab("receipts");
//         window.dispatchEvent(new Event("storage"));
//       }, 1500);

//     } catch (apiError) {
//       console.error("Failed to save receipt:", apiError);
//       // Extract detailed error message
//       const errorMessage = apiError.response?.data?.message 
//         || apiError.response?.data?.issues?.[0]?.message
//         || apiError.message 
//         || "Failed to save receipt. Please try again.";
//       toast.error(errorMessage);
//       setScanResult(null); // Reset so user can try again
//       setScannedBillData(null);
//       setCustomerPaymentIntent(null);
//     }
//   };

//   const { isDark } = useTheme();

//   return (
//     <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${
//       isDark 
//         ? 'bg-[#0f0f12] text-slate-100' 
//         : 'bg-slate-50 text-slate-900'
//     }`}>
//       <CustomerSidebar
//         activeTab={activeTab}
//         onNavigate={setActiveTab}
//         receipts={receipts}
//       />

//       <div className="flex-1 flex flex-col min-w-0 h-full relative">
//         {/* MOBILE HEADER */}
//         <div className={`md:hidden h-16 border-b flex items-center justify-between px-4 shrink-0 sticky top-0 z-30 transition-colors duration-300 ${
//           isDark 
//             ? 'bg-[#18181b]/95 backdrop-blur-xl border-slate-800 shadow-lg shadow-black/20' 
//             : 'bg-white/95 backdrop-blur-xl border-slate-100 shadow-sm'
//         }`}>
//           <button
//             onClick={handleGlobalScan}
//             className={`p-2 rounded-full active:scale-95 transition-all ${
//               isDark 
//                 ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' 
//                 : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
//             }`}
//           >
//             <ScanLine size={22} />
//           </button>
//           <h1 className="text-xl font-extrabold tracking-tight">
//             <span className="text-emerald-500">Green</span>
//             <span className={isDark ? 'text-white' : 'text-slate-800'}>Receipt</span>
//           </h1>
//           <div className="flex items-center gap-2">
//             <button
//               onClick={() => setActiveTab("notifications")}
//               className={`p-2 rounded-full active:scale-95 transition-all relative ${
//                 isDark 
//                   ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
//                   : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
//               }`}
//             >
//               <Bell size={22} />
//               <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
//             </button>
//           </div>
//         </div>

//         {/* MAIN CONTENT */}
//         <main className={`flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 ${
//           isDark ? 'dark-ambient' : ''
//         }`}>
//           <div className="max-w-4xl mx-auto animate-fade-in relative z-10">
//             {activeTab === "home" && (
//               <CustomerHome
//                 onNavigate={setActiveTab}
//                 onScanTrigger={handleGlobalScan}
//               />
//             )}
//             {activeTab === "receipts" && <CustomerReceipts />}
//             {activeTab === "bills" && <CustomerRecurringBills />}
//             {activeTab === "calendar" && <CustomerCalendar />}
//             {activeTab === "insights" && <CustomerInsights />}
//             {activeTab === "profile" && <CustomerProfile />}
//             {activeTab === "notifications" && <CustomerNotifications />}
//           </div>
//         </main>
//       </div>

//       {/* 📸 ROBUST CAMERA OVERLAY */}
//       {isScanning && (
//         <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-fade-in">
//           <button
//             onClick={() => setIsScanning(false)}
//             className="absolute top-6 right-6 text-white p-2 z-50 bg-white/20 rounded-full backdrop-blur-sm"
//           >
//             <X size={24} />
//           </button>

//           <div className="w-full max-w-sm px-6 text-center relative">
//             {/* 💳 IMMEDIATE PAYMENT CHOICE SCREEN - Shows right after QR scan! */}
//             {scanResult === "payment-choice" && scannedBillData ? (
//               <div className="animate-[popIn_0.3s_ease-out] bg-white rounded-3xl p-6 shadow-2xl">
//                 {/* Header */}
//                 <div className="mb-4">
//                   <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
//                     <ShoppingBag className="text-emerald-600" size={28} />
//                   </div>
//                   <h3 className="text-slate-800 text-xl font-bold">
//                     {scannedBillData.merchant}
//                   </h3>
//                   <p className="text-slate-500 text-sm">
//                     {scannedBillData.date} • {scannedBillData.time}
//                   </p>
//                 </div>

//                 {/* Bill Amount */}
//                 <div className="bg-slate-50 rounded-2xl p-4 mb-5">
//                   <p className="text-slate-500 text-xs font-bold uppercase mb-1">
//                     Total Amount
//                   </p>
//                   <p className="text-3xl font-black text-slate-800">
//                     ₹{scannedBillData.total}
//                   </p>
//                   <p className="text-slate-400 text-xs mt-1">
//                     {scannedBillData.items?.length || 0} items
//                   </p>
//                 </div>

//                 {/* Payment Choice Buttons - IMMEDIATE! */}
//                 <p className="text-slate-600 text-sm font-bold mb-3">
//                   How would you like to pay?
//                 </p>

//                 <div className="grid grid-cols-2 gap-3 mb-4">
//                   <button
//                     onClick={() => handlePaymentIntentSelection("upi")}
//                     className="flex flex-col items-center gap-2 p-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 active:scale-95"
//                   >
//                     <Smartphone size={28} />
//                     <span className="text-sm">Pay via UPI</span>
//                   </button>

//                   <button
//                     onClick={() => handlePaymentIntentSelection("cash")}
//                     className="flex flex-col items-center gap-2 p-4 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/30 active:scale-95"
//                   >
//                     <Banknote size={28} />
//                     <span className="text-sm">Pay via Cash</span>
//                   </button>
//                 </div>

//                 {/* Info Note */}
//                 <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-xl p-3">
//                   <Clock size={14} className="shrink-0" />
//                   <span>Merchant will confirm your payment</span>
//                 </div>
//               </div>
//             ) : scanResult === "success" ? (
//               <div className="animate-[popIn_0.3s_ease-out]">
//                 <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
//                   <CheckCircle className="text-white" size={48} />
//                 </div>
//                 <h3 className="text-white text-2xl font-bold mb-2">
//                   {customerPaymentIntent
//                     ? `${
//                         customerPaymentIntent === "upi" ? "UPI" : "Cash"
//                       } Selected!`
//                     : "Receipt Scanned!"}
//                 </h3>
//                 <p className="text-emerald-400">Saving to your journal...</p>
//                 {customerPaymentIntent && (
//                   <p className="text-slate-400 text-sm mt-2">
//                     Waiting for merchant confirmation
//                   </p>
//                 )}
//               </div>
//             ) : scanResult === "error" ? (
//               <div className="animate-[popIn_0.3s_ease-out]">
//                 <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
//                   <AlertCircle className="text-white" size={48} />
//                 </div>
//                 <h3 className="text-white text-2xl font-bold mb-2">
//                   Camera Error
//                 </h3>
//                 <p className="text-slate-300">
//                   Please check your browser permissions.
//                 </p>
//               </div>
//             ) : (
//               <>
//                 <h3 className="text-white text-xl font-bold mb-6">
//                   Scan GreenReceipt QR
//                 </h3>

//                 {/* 🎥 SCANNER CONTAINER */}
//                 <div className="relative overflow-hidden rounded-3xl border-4 border-emerald-500/50 shadow-2xl bg-black aspect-square">
//                   <Scanner
//                     onScan={(result) => {
//                       if (result && result[0]) handleScan(result[0].rawValue);
//                     }}
//                     onError={(error) => console.log(error)}
//                     components={{
//                       audio: false,
//                       onOff: true,
//                     }}
//                     styles={{
//                       container: { width: "100%", height: "100%" },
//                       video: {
//                         width: "100%",
//                         height: "100%",
//                         objectFit: "cover",
//                       },
//                     }}
//                   />

//                   {/* Scanning Animation */}
//                   <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-[scan_2s_ease-in-out_infinite] z-10 pointer-events-none"></div>
//                 </div>

//                 <p className="text-slate-400 text-sm mt-6">
//                   Point at the merchant's screen
//                 </p>
//               </>
//             )}
//           </div>
//           <style>{`@keyframes scan { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CustomerDashboard;



import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner'; 
import CustomerSidebar from '../components/customer/CustomerSidebar';
import CustomerHome from '../components/customer/CustomerHome';
import CustomerReceipts from '../components/customer/CustomerReceipts';
import CustomerCalendar from '../components/customer/CustomerCalendar';
import CustomerInsights from '../components/customer/CustomerInsights';
import CustomerProfile from '../components/customer/CustomerProfile';
import CustomerNotifications from '../components/customer/CustomerNotificationsNew';
import CustomerRecurringBills from '../components/customer/CustomerRecurringBills';
import { useTheme } from '../contexts/ThemeContext';
import { ScanLine, Bell, X, CheckCircle, AlertCircle, ShoppingBag, Smartphone, Banknote, Wallet, Clock } from 'lucide-react';
import { claimReceipt, fetchCustomerReceipts } from '../services/api';
import toast from 'react-hot-toast';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [receipts, setReceipts] = useState([]);

  // 📸 SCANNER STATE
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // null | 'payment-choice' | 'processing' | 'success' | 'error'

  // 💳 SCANNED BILL DATA (for immediate payment intent screen)
  const [scannedBillData, setScannedBillData] = useState(null);

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
    setIsScanning(true);
  };

  // 🧠 HANDLE REAL SCAN RESULT
  // Customer chooses an INTENT (upi/cash/khata). Merchant still finalizes status.
  const handleScan = async (rawText) => {
    if (rawText && !scanResult) {
      try {
        // 1. Parse the text from QR
        const receiptData = JSON.parse(rawText);

        // 2. Validate GreenReceipt format - only total is strictly required
        if (typeof receiptData.total !== 'number' && !receiptData.total) {
          throw new Error("Invalid GreenReceipt QR - missing total");
        }

        // 🟢 FIX: TRANSLATE SHORT KEYS BACK TO FULL KEYS
        const fixedItems = (receiptData.items || []).map((item) => {
          const quantity = item.q || item.qty || item.quantity || 1;
          const unitPrice = item.p || item.price || item.unitPrice || 0;
          const name = item.n || item.name || "Item";
          return {
            name,
            quantity,
            unitPrice,
          };
        });

        // 3. Create Receipt Object with Fixed Items (for UI only)
        const newReceipt = {
          ...receiptData,
          merchant: receiptData.merchant || receiptData.m || "Unknown Merchant",
          id: receiptData.id || `GR-${Date.now()}`,
          items: fixedItems,
          type: "qr",
          excludeFromStats: false,
        };

        // 4. Show payment intent choice (must be a real backend receipt id)
        const isObjectId = (id) => /^[a-f\d]{24}$/i.test(id);
        const rid = newReceipt.rid || newReceipt.id;
        if (!rid || !isObjectId(rid)) {
          throw new Error("Invalid GreenReceipt QR - missing receipt id");
        }

        setScannedBillData(newReceipt);
        setScanResult("payment-choice");
      } catch (err) {
        console.error("QR Parse Error:", err);
        toast.error(err?.message || "Invalid QR code format");
        setScanResult(null);
      }
    }
  };

  const handlePaymentIntentSelection = async (intent) => {
    if (!scannedBillData) return;

    try {
      const isObjectId = (id) => /^[a-f\d]{24}$/i.test(id);
      const rid = scannedBillData.rid || scannedBillData.id;
      if (!rid || !isObjectId(rid)) {
        toast.error("Invalid receipt id");
        return;
      }

      setScanResult("processing");
      const { data } = await claimReceipt({ receiptId: rid, paymentIntent: intent });

      const existing = JSON.parse(localStorage.getItem("customerReceipts")) || [];
      const filtered = existing.filter((r) => r.id !== data.id && r._id !== data.id);
      const merged = [data, ...filtered];
      localStorage.setItem("customerReceipts", JSON.stringify(merged));
      window.dispatchEvent(new Event("customer-receipts-updated"));

      setScanResult("success");
      toast.success("Receipt saved! Waiting for merchant confirmation");
      setTimeout(() => {
        setIsScanning(false);
        setActiveTab("receipts");
        window.dispatchEvent(new Event("storage"));
      }, 1400);
    } catch (apiError) {
      const errorMessage = apiError.response?.data?.message || apiError.message || "Failed to save receipt";
      toast.error(errorMessage);
      setScanResult("payment-choice");
    }
  };

  const { isDark } = useTheme();

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${
      isDark 
        ? 'bg-[#0f0f12] text-slate-100' 
        : 'bg-slate-50 text-slate-900'
    }`}>
      <CustomerSidebar
        activeTab={activeTab}
        onNavigate={setActiveTab}
        receipts={receipts}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* MOBILE HEADER */}
        <div className={`md:hidden h-16 border-b flex items-center justify-between px-4 shrink-0 sticky top-0 z-30 transition-colors duration-300 ${
          isDark 
            ? 'bg-[#18181b]/95 backdrop-blur-xl border-slate-800 shadow-lg shadow-black/20' 
            : 'bg-white/95 backdrop-blur-xl border-slate-100 shadow-sm'
        }`}>
          <button
            onClick={handleGlobalScan}
            className={`p-3 rounded-full active:scale-95 transition-all ${
              isDark 
                ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' 
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ScanLine size={24} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight">
            <span className="text-emerald-500">Green</span>
            <span className={isDark ? 'text-white' : 'text-slate-800'}>Receipt</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("notifications")}
              className={`p-3 rounded-full active:scale-95 transition-all relative ${
                isDark 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Bell size={24} />
              <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 ${
          isDark ? 'dark-ambient' : ''
        }`}>
          <div className="max-w-4xl mx-auto animate-fade-in relative z-10">
            {activeTab === "home" && (
              <CustomerHome
                onNavigate={setActiveTab}
                onScanTrigger={handleGlobalScan}
              />
            )}
            {activeTab === "receipts" && <CustomerReceipts />}
            {activeTab === "bills" && <CustomerRecurringBills />}
            {activeTab === "calendar" && <CustomerCalendar />}
            {activeTab === "insights" && <CustomerInsights />}
            {activeTab === "profile" && <CustomerProfile />}
            {activeTab === "notifications" && <CustomerNotifications />}
          </div>
        </main>
      </div>

      {/* 🗓️ 3D FLOATING CALENDAR BUTTON (WhatsApp Style) */}
      <button 
        onClick={() => setActiveTab("calendar")}
        className={`
          fixed right-5 bottom-24 md:bottom-10 z-40 group
          w-14 h-14 rounded-full flex items-center justify-center 
          bg-gradient-to-br from-emerald-500 to-emerald-700
          text-white shadow-[0_8px_25px_-5px_rgba(16,185,129,0.5)]
          border border-emerald-400/30
          transform transition-all duration-300 ease-out
          hover:-translate-y-1 hover:shadow-[0_15px_30px_-5px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95
          ${activeTab === 'calendar' ? 'translate-y-20 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}
        `}
        title="View Calendar"
      >
        {/* Inner Glare for 3D effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/10 to-white/20 pointer-events-none" />
        
        <Calendar size={24} strokeWidth={2.5} className="relative z-10 drop-shadow-sm" />
      </button>

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
            {scanResult === "payment-choice" && scannedBillData ? (
              <div className="animate-[popIn_0.3s_ease-out] bg-white rounded-3xl p-6 shadow-2xl">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag className="text-emerald-600" size={28} />
                  </div>
                  <h3 className="text-slate-800 text-xl font-bold">{scannedBillData.merchant}</h3>
                  <p className="text-slate-500 text-sm">{scannedBillData.date} • {scannedBillData.time}</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 mb-5">
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Amount</p>
                  <p className="text-3xl font-black text-slate-800">₹{scannedBillData.total}</p>
                  <p className="text-slate-400 text-xs mt-1">{scannedBillData.items?.length || 0} items</p>
                </div>

                <p className="text-slate-600 text-sm font-bold mb-3">How would you like to pay?</p>

                <div className="grid grid-cols-2 gap-3 mb-3">
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

                <button
                  onClick={() => handlePaymentIntentSelection("khata")}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-black/30 active:scale-95"
                >
                  <Wallet size={22} />
                  <span className="text-sm">Pay via Khata (Pending)</span>
                </button>

                <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-xl p-3 mt-4">
                  <Clock size={14} className="shrink-0" />
                  <span>Merchant will confirm your payment</span>
                </div>
              </div>
            ) : scanResult === "processing" ? (
              <div className="animate-[popIn_0.3s_ease-out]">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                  <ShoppingBag className="text-white" size={44} />
                </div>
                <h3 className="text-white text-2xl font-bold mb-2">Linking receipt…</h3>
                <p className="text-emerald-400">Please wait</p>
                <p className="text-slate-400 text-sm mt-2">Merchant will choose Paid / Khata</p>
              </div>
            ) : scanResult === "success" ? (
              <div className="animate-[popIn_0.3s_ease-out]">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                  <CheckCircle className="text-white" size={48} />
                </div>
                <h3 className="text-white text-2xl font-bold mb-2">
                  Receipt Linked!
                </h3>
                <p className="text-emerald-400">Added to your receipts</p>
                <p className="text-slate-400 text-sm mt-2">Merchant will confirm Paid / Khata</p>
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