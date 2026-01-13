// import React, { useState, useMemo } from 'react';
// import { ShoppingBag, QrCode, X, Plus, Minus, Trash2, Search, Zap, CheckCircle, Banknote, Smartphone } from 'lucide-react';
// import toast from 'react-hot-toast';
// import { createReceipt, markReceiptPaid } from '../../services/api';

// const MerchantBilling = ({ inventory }) => {
//   // 🛒 Cart & UI State
//   const [cart, setCart] = useState([]);
//   const [showQr, setShowQr] = useState(false);
//   const [qrDataUrl, setQrDataUrl] = useState("");
//   const [generatedBill, setGeneratedBill] = useState(null);

//   // 🔍 Search & Filter State
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState("All");

//   // ⚡ Manual Item State
//   const [manualName, setManualName] = useState("");
//   const [manualPrice, setManualPrice] = useState("");
//   const [manualQty, setManualQty] = useState(1);
//   const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

//   // Load Merchant Profile
//   const merchantProfile = JSON.parse(localStorage.getItem('merchantProfile')) || {
//     shopName: "GreenReceipt Shop",
//     merchantId: "GR-DEMO"
//   };

//   // Calculations
//   const cartTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
//   const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
//   const categories = ["All", ...new Set(inventory.map(i => i.category || "General"))];

//   // Search Logic
//   const filteredItems = useMemo(() => {
//     return inventory.filter(item => {
//       const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
//       const matchesCategory = selectedCategory === "All" || (item.category || "General") === selectedCategory;
//       return matchesSearch && matchesCategory;
//     });
//   }, [inventory, searchQuery, selectedCategory]);

//   // ——— ACTIONS ———

//   const addToCart = (item) => {
//     setCart(prev => {
//       const exists = prev.find(i => i.id === item.id);
//       if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
//       return [...prev, { ...item, quantity: 1 }];
//     });
//   };

//   const addManualItem = (e) => {
//     e.preventDefault();
//     if (!manualName || !manualPrice) return;
//     const newItem = {
//       id: `manual-${Date.now()}`,
//       name: manualName,
//       price: parseFloat(manualPrice),
//       quantity: parseInt(manualQty) > 0 ? parseInt(manualQty) : 1,
//       isManual: true
//     };
//     setCart(prev => [...prev, newItem]);
//     setManualName("");
//     setManualPrice("");
//     setManualQty(1);
//   };

//   const updateQuantity = (itemId, delta) => {
//     setCart(prev => prev.map(item => {
//       if (item.id === itemId) return { ...item, quantity: Math.max(1, item.quantity + delta) };
//       return item;
//     }));
//   };

//   const removeFromCart = (itemId) => setCart(prev => prev.filter(item => item.id !== itemId));

//   // 🚀 GENERATE QR
//   const handleGenerateQR = async () => {
//     const baseBill = {
//       merchant: merchantProfile.shopName,
//       mid: merchantProfile.merchantId,
//       date: new Date().toISOString().split('T')[0],
//       time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
//       total: cartTotal,
//       items: cart.map(item => ({
//         n: item.name,
//         q: item.quantity,
//         p: item.price
//       })),
//       footer: merchantProfile.receiptFooter || "Thank you!"
//     };

//     let createdReceipt = null;
//     try {
//       // We create the initial receipt as PENDING with UPI default
//       const payload = {
//         items: cart.map(item => ({ name: item.name, unitPrice: item.price, quantity: item.quantity })),
//         source: 'qr',
//         paymentMethod: 'upi',
//         transactionDate: new Date().toISOString(),
//         total: cartTotal,
//         footer: merchantProfile.receiptFooter,
//         status: 'pending',
//       };
//       const { data } = await createReceipt(payload);
//       createdReceipt = data;
//       const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//       localStorage.setItem('merchantSales', JSON.stringify([data, ...currentSales]));
//     } catch (err) {
//       createdReceipt = { ...baseBill, id: `GR-${Date.now().toString().slice(-6)}`, status: 'pending' };
//       const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//       localStorage.setItem('merchantSales', JSON.stringify([createdReceipt, ...currentSales]));
//     }

//     const receiptId = createdReceipt?.id || createdReceipt?._id || `GR-${Date.now().toString().slice(-6)}`;
//     const billData = { ...baseBill, id: receiptId, rid: receiptId };
//     setGeneratedBill(billData);
//     const jsonString = JSON.stringify(billData);
//     const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(jsonString)}`;
//     setQrDataUrl(apiUrl);
//     setShowQr(true);
//   };

//   // 💾 SAVE THE SALE (FIXED: Sends 'method' to backend)
//   const handlePaymentReceived = async (method) => {
//       if (!generatedBill) return;

//       const receiptId = generatedBill.rid || generatedBill.id;

//       try {
//         if (receiptId) {
//           // 👇 IMPORTANT FIX: Pass the 'method' ('cash' or 'upi') to the API
//           // You need to update markReceiptPaid in api.js to accept this second argument!
//           const { data } = await markReceiptPaid(receiptId, method);

//           // Update Local Storage with the returned data from backend
//           const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];

//           // Ensure the local data reflects the chosen method
//           const finalData = { ...data, paymentMethod: method };

//           const merged = [finalData, ...currentSales.filter(r => r.id !== receiptId && r._id !== receiptId)];
//           localStorage.setItem('merchantSales', JSON.stringify(merged));

//           window.dispatchEvent(new Event('customer-receipts-updated'));
//           window.dispatchEvent(new Event('merchantStorage'));
//         }
//       } catch (err) {
//         // Fallback for offline/local demo
//         console.error(err);
//         const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];

//         const newSale = {
//           ...generatedBill,
//           total: cartTotal,
//           status: 'completed',
//           paymentMethod: method // Correctly saves 'cash' or 'upi' locally
//         };

//         const merged = [newSale, ...currentSales.filter(r => r.id !== receiptId)];
//         localStorage.setItem('merchantSales', JSON.stringify(merged));
//         window.dispatchEvent(new Event('merchantStorage'));
//       }

//       setShowQr(false);
//       setCart([]);
//       setIsMobileCartOpen(false);

//       const methodText = method === 'upi' ? "UPI" : "Cash";
//       toast.success(`Payment Received via ${methodText}!`);
//   };

//   return (
//     <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6 animate-fade-in relative">

//       {/* 🔹 LEFT: ITEMS GRID */}
//       <div className="flex-1 bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden shadow-sm">
//         <div className="p-4 border-b border-slate-100 bg-white z-10 space-y-4">
//             <div className="relative">
//                 <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
//                 <input type="text" placeholder="Search menu items..." className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
//             </div>
//             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
//                 {categories.map(cat => (
//                     <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
//                 ))}
//             </div>
//         </div>
//         <div className="flex-1 overflow-y-auto p-4 pb-32 md:pb-4">
//             {filteredItems.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60"><Search size={32} className="mb-2"/><p>No items found.</p></div> :
//                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
//                     {filteredItems.map(item => (
//                         <button key={item.id} onClick={() => addToCart(item)} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all text-left group active:scale-95 flex flex-col justify-between h-24">
//                             <div><div className="font-bold text-slate-700 group-hover:text-emerald-700 leading-tight line-clamp-2">{item.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wide">{item.category}</div></div>
//                             <div className="text-sm font-bold text-emerald-600">₹{item.price}</div>
//                         </button>
//                     ))}
//                 </div>
//             }
//         </div>
//       </div>

//       {/* 🔹 MOBILE FLOATING BAR */}
//       {!isMobileCartOpen && (
//         <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-xl z-40 flex items-center justify-between" onClick={() => setIsMobileCartOpen(true)}>
//            <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total ({totalItems} items)</p><p className="text-2xl font-bold text-slate-800">₹{cartTotal}</p></div>
//            <button className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20">View Bill</button>
//         </div>
//       )}

//       {/* 🔹 RIGHT: CART PANEL */}
//       <div className={`fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-out md:static md:w-96 md:bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-xl md:translate-y-0 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
//         <div className="md:hidden p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50"><h2 className="font-bold text-lg text-slate-800">Current Bill</h2><button onClick={() => setIsMobileCartOpen(false)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-500"><X size={20} /></button></div>

//         <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
//             <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Zap size={12} className="text-amber-500"/> Quick Add (Manual)</h3>
//             <form onSubmit={addManualItem} className="flex gap-2"><input className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500 w-full" placeholder="Item Name" value={manualName} onChange={(e) => setManualName(e.target.value)} /><input className="w-16 px-1.5 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500" type="number" placeholder="₹" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />{/*<input className="w-12 px-2 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500 text-center" type="number" placeholder="Qty" onChange={(e) => setManualQty(e.target.value)} />*/}<button type="submit" className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors"><Plus size={16} /></button></form>
//         </div>

//         <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
//           {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60"><ShoppingBag size={32} className="mb-2" /><p className="text-sm">Cart is empty.</p></div> :
//             cart.map(item => (
//               <div key={item.id} className={`p-3 rounded-xl border flex flex-col gap-2 ${item.isManual ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
//                 <div className="flex justify-between items-start"><div><div className="font-bold text-slate-700 text-sm">{item.name}</div>{item.isManual && <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-100 px-1 rounded">Manual</span>}</div><div className="font-bold text-slate-800">₹{item.price * item.quantity}</div></div>
//                 <div className="flex justify-between items-center"><div className="text-xs text-slate-400 font-medium">₹{item.price}/unit</div><div className="flex items-center gap-3"><div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm"><button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-l-lg"><Minus size={14} /></button><span className="w-6 text-center text-xs font-bold text-slate-800">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-r-lg"><Plus size={14} /></button></div><button onClick={() => removeFromCart(item.id)} className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></div></div>
//               </div>
//             ))
//           }
//         </div>

//         <div className="border-t border-slate-100 p-4 bg-slate-50 shrink-0">
//           <div className="flex justify-between items-end mb-4"><span className="text-slate-500 font-bold text-sm">Total Amount</span><span className="text-3xl font-bold text-slate-900">₹{cartTotal}</span></div>
//           <button onClick={handleGenerateQR} disabled={cart.length === 0} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2"><QrCode size={18} /> Generate QR</button>
//         </div>
//       </div>

//       {/* 📸 QR MODAL */}
//       {showQr && (
//         <div className="fixed inset-0 bg-black/90 md:bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
//           <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-[popIn_0.2s_ease-out]">
//             <div className="flex justify-end"><button onClick={() => setShowQr(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20} /></button></div>

//             <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan to Save Bill</h2>
//             <p className="text-xs text-slate-500 mb-4">Customer can scan this to get the receipt instantly.</p>

//             <div className="bg-white p-2 rounded-xl inline-block mb-4 border border-slate-200 shadow-xl">
//                  {qrDataUrl ? <img src={qrDataUrl} alt="Receipt QR" className="w-56 h-56 rounded-lg" /> : <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-slate-400">Loading QR...</div>}
//             </div>

//             <div className="text-3xl font-bold text-emerald-600 mb-2">₹{cartTotal}</div>
//             <div className="text-xs text-slate-400 font-mono mb-6 bg-slate-50 p-2 rounded truncate max-w-[250px] mx-auto">ID: {generatedBill?.id}</div>

//             {/* 👇 UPDATED BUTTONS */}
//             <div className="grid grid-cols-2 gap-3 mt-2">
//                 <button
//                     onClick={() => handlePaymentReceived('upi')}
//                     className="py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex flex-col items-center justify-center gap-1 transition-colors"
//                 >
//                     <Smartphone size={20} />
//                     <span className="text-xs">Paid via UPI</span>
//                 </button>

//                 <button
//                     onClick={() => handlePaymentReceived('cash')}
//                     className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex flex-col items-center justify-center gap-1 transition-colors"
//                 >
//                     <Banknote size={20} />
//                     <span className="text-xs">Paid via Cash</span>
//                 </button>
//             </div>

//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default MerchantBilling;

// import React, { useState, useMemo } from 'react';
// import { ShoppingBag, QrCode, X, Plus, Minus, Trash2, Search, Zap, CheckCircle, Banknote, Smartphone } from 'lucide-react';
// import toast from 'react-hot-toast';
// import { createReceipt, markReceiptPaid } from '../../services/api';

// const MerchantBilling = ({ inventory }) => {
//   // 🛒 Cart & UI State
//   const [cart, setCart] = useState([]);
//   const [showQr, setShowQr] = useState(false);
//   const [qrDataUrl, setQrDataUrl] = useState("");
//   const [generatedBill, setGeneratedBill] = useState(null);

//   // 🔍 Search & Filter State
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState("All");

//   // ⚡ Manual Item State
//   const [manualName, setManualName] = useState("");
//   const [manualPrice, setManualPrice] = useState("");
//   const [manualQty, setManualQty] = useState(1);
//   const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

//   // Load Merchant Profile
//   const merchantProfile = JSON.parse(localStorage.getItem('merchantProfile')) || {
//     shopName: "GreenReceipt Shop",
//     merchantId: "GR-DEMO"
//   };

//   // Calculations
//   const cartTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
//   const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
//   const categories = ["All", ...new Set(inventory.map(i => i.category || "General"))];

//   // Search Logic
//   const filteredItems = useMemo(() => {
//     return inventory.filter(item => {
//       const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
//       const matchesCategory = selectedCategory === "All" || (item.category || "General") === selectedCategory;
//       return matchesSearch && matchesCategory;
//     });
//   }, [inventory, searchQuery, selectedCategory]);

//   // ——— ACTIONS ———

//   const addToCart = (item) => {
//     setCart(prev => {
//       const exists = prev.find(i => i.id === item.id);
//       if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
//       return [...prev, { ...item, quantity: 1 }];
//     });
//   };

//   const addManualItem = (e) => {
//     e.preventDefault();
//     if (!manualName || !manualPrice) return;
//     const newItem = {
//       id: `manual-${Date.now()}`,
//       name: manualName,
//       price: parseFloat(manualPrice),
//       quantity: parseInt(manualQty) > 0 ? parseInt(manualQty) : 1,
//       isManual: true
//     };
//     setCart(prev => [...prev, newItem]);
//     setManualName("");
//     setManualPrice("");
//     setManualQty(1);
//   };

//   const updateQuantity = (itemId, delta) => {
//     setCart(prev => prev.map(item => {
//       if (item.id === itemId) return { ...item, quantity: Math.max(1, item.quantity + delta) };
//       return item;
//     }));
//   };

//   const removeFromCart = (itemId) => setCart(prev => prev.filter(item => item.id !== itemId));

//   // 🚀 GENERATE QR
//   const handleGenerateQR = async () => {
//     const baseBill = {
//       merchant: merchantProfile.shopName,
//       mid: merchantProfile.merchantId,
//       date: new Date().toISOString().split('T')[0],
//       time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
//       total: cartTotal,
//       items: cart.map(item => ({
//         n: item.name,
//         q: item.quantity,
//         p: item.price
//       })),
//       footer: merchantProfile.receiptFooter || "Thank you!"
//     };

//     let createdReceipt = null;
//     try {
//       const payload = {
//         items: cart.map(item => ({ name: item.name, unitPrice: item.price, quantity: item.quantity })),
//         source: 'qr',
//         paymentMethod: 'upi',
//         transactionDate: new Date().toISOString(),
//         total: cartTotal,
//         footer: merchantProfile.receiptFooter,
//         status: 'pending',
//       };
//       const { data } = await createReceipt(payload);
//       createdReceipt = data;
//       const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//       localStorage.setItem('merchantSales', JSON.stringify([data, ...currentSales]));
//     } catch (err) {
//       createdReceipt = { ...baseBill, id: `GR-${Date.now().toString().slice(-6)}`, status: 'pending' };
//       const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//       localStorage.setItem('merchantSales', JSON.stringify([createdReceipt, ...currentSales]));
//     }

//     const receiptId = createdReceipt?.id || createdReceipt?._id || `GR-${Date.now().toString().slice(-6)}`;
//     const billData = { ...baseBill, id: receiptId, rid: receiptId };
//     setGeneratedBill(billData);
//     const jsonString = JSON.stringify(billData);
//     const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(jsonString)}`;
//     setQrDataUrl(apiUrl);
//     setShowQr(true);
//   };

//   // 💾 SAVE THE SALE
//   const handlePaymentReceived = async (method) => {
//       if (!generatedBill) return;

//       const receiptId = generatedBill.rid || generatedBill.id;

//       try {
//         if (receiptId) {
//           const { data } = await markReceiptPaid(receiptId, method);

//           const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//           const finalData = { ...data, paymentMethod: method };

//           const merged = [finalData, ...currentSales.filter(r => r.id !== receiptId && r._id !== receiptId)];
//           localStorage.setItem('merchantSales', JSON.stringify(merged));

//           window.dispatchEvent(new Event('customer-receipts-updated'));
//           window.dispatchEvent(new Event('merchantStorage'));
//         }
//       } catch (err) {
//         console.error(err);
//         const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];

//         const newSale = {
//           ...generatedBill,
//           total: cartTotal,
//           status: 'completed',
//           paymentMethod: method
//         };

//         const merged = [newSale, ...currentSales.filter(r => r.id !== receiptId)];
//         localStorage.setItem('merchantSales', JSON.stringify(merged));
//         window.dispatchEvent(new Event('merchantStorage'));
//       }

//       setShowQr(false);
//       setCart([]);
//       setIsMobileCartOpen(false);

//       const methodText = method === 'upi' ? "UPI" : "Cash";
//       toast.success(`Payment Received via ${methodText}!`);
//   };

//   return (
//     <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6 animate-fade-in relative">

//       {/* 🔹 LEFT: ITEMS GRID */}
//       <div className="flex-1 bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden shadow-sm">
//         <div className="p-4 border-b border-slate-100 bg-white z-10 space-y-4">
//             <div className="relative">
//                 <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
//                 <input type="text" placeholder="Search menu items..." className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
//             </div>
//             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
//                 {categories.map(cat => (
//                     <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
//                 ))}
//             </div>
//         </div>
//         <div className="flex-1 overflow-y-auto p-4 pb-32 md:pb-4">
//             {filteredItems.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60"><Search size={32} className="mb-2"/><p>No items found.</p></div> :
//                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
//                     {filteredItems.map(item => (
//                         <button key={item.id} onClick={() => addToCart(item)} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all text-left group active:scale-95 flex flex-col justify-between h-24">
//                             <div><div className="font-bold text-slate-700 group-hover:text-emerald-700 leading-tight line-clamp-2">{item.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wide">{item.category}</div></div>
//                             <div className="text-sm font-bold text-emerald-600">₹{item.price}</div>
//                         </button>
//                     ))}
//                 </div>
//             }
//         </div>
//       </div>

//       {/* 🔹 MOBILE FLOATING BAR */}
//       {!isMobileCartOpen && (
//         <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-xl z-40 flex items-center justify-between" onClick={() => setIsMobileCartOpen(true)}>
//            <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total ({totalItems} items)</p><p className="text-2xl font-bold text-slate-800">₹{cartTotal}</p></div>
//            <button className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20">View Bill</button>
//         </div>
//       )}

//       {/* 🔹 RIGHT: CART PANEL */}
//       <div className={`fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-out md:static md:w-96 md:bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-xl md:translate-y-0 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
//         <div className="md:hidden p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50"><h2 className="font-bold text-lg text-slate-800">Current Bill</h2><button onClick={() => setIsMobileCartOpen(false)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-500"><X size={20} /></button></div>

//         <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
//             <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Zap size={12} className="text-amber-500"/> Quick Add (Manual)</h3>
//             <form onSubmit={addManualItem} className="flex gap-2"><input className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500 w-full" placeholder="Item Name" value={manualName} onChange={(e) => setManualName(e.target.value)} /><input className="w-16 px-1.5 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500" type="number" placeholder="₹" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />{/*<input className="w-12 px-2 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500 text-center" type="number" placeholder="Qty" onChange={(e) => setManualQty(e.target.value)} />*/}<button type="submit" className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors"><Plus size={16} /></button></form>
//         </div>

//         <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
//           {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60"><ShoppingBag size={32} className="mb-2" /><p className="text-sm">Cart is empty.</p></div> :
//             cart.map(item => (
//               <div key={item.id} className={`p-3 rounded-xl border flex flex-col gap-2 ${item.isManual ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
//                 {/* Top Row: Name & Price */}
//                 <div className="flex justify-between items-start">
//                     <div>
//                         <div className="font-bold text-slate-700 text-sm">{item.name}</div>
//                         {item.isManual && <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-100 px-1 rounded">Manual</span>}
//                     </div>
//                     <div className="font-bold text-slate-800">₹{item.price * item.quantity}</div>
//                 </div>

//                 {/* Bottom Row: Controls */}
//                 <div className="flex justify-between items-center">
//                     <div className="text-xs text-slate-400 font-medium">₹{item.price}/unit</div>

//                     {/* 👇 NEW CONTROLS: Smart Minus/Trash Button */}
//                     <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
//                         <button
//                             onClick={() => item.quantity === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)}
//                             className={`w-8 h-8 flex items-center justify-center rounded-l-lg transition-colors ${
//                                 item.quantity === 1
//                                     ? 'text-red-500 hover:bg-red-50' // Shows RED TRASH when qty is 1
//                                     : 'text-slate-500 hover:bg-slate-50' // Shows GRAY MINUS otherwise
//                             }`}
//                         >
//                             {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
//                         </button>

//                         <span className="w-8 text-center text-xs font-bold text-slate-800">{item.quantity}</span>

//                         <button
//                             onClick={() => updateQuantity(item.id, 1)}
//                             className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 text-emerald-600 rounded-r-lg transition-colors"
//                         >
//                             <Plus size={14} />
//                         </button>
//                     </div>
//                 </div>
//               </div>
//             ))
//           }
//         </div>

//         <div className="border-t border-slate-100 p-4 bg-slate-50 shrink-0">
//           <div className="flex justify-between items-end mb-4"><span className="text-slate-500 font-bold text-sm">Total Amount</span><span className="text-3xl font-bold text-slate-900">₹{cartTotal}</span></div>
//           <button onClick={handleGenerateQR} disabled={cart.length === 0} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2"><QrCode size={18} /> Generate QR</button>
//         </div>
//       </div>

//       {/* 📸 QR MODAL */}
//       {showQr && (
//         <div className="fixed inset-0 bg-black/90 md:bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
//           <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-[popIn_0.2s_ease-out]">
//             <div className="flex justify-end"><button onClick={() => setShowQr(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20} /></button></div>

//             <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan to Save Bill</h2>
//             <p className="text-xs text-slate-500 mb-4">Customer can scan this to get the receipt instantly.</p>

//             <div className="bg-white p-2 rounded-xl inline-block mb-4 border border-slate-200 shadow-xl">
//                  {qrDataUrl ? <img src={qrDataUrl} alt="Receipt QR" className="w-56 h-56 rounded-lg" /> : <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-slate-400">Loading QR...</div>}
//             </div>

//             <div className="text-3xl font-bold text-emerald-600 mb-2">₹{cartTotal}</div>
//             <div className="text-xs text-slate-400 font-mono mb-6 bg-slate-50 p-2 rounded truncate max-w-[250px] mx-auto">ID: {generatedBill?.id}</div>

//             <div className="grid grid-cols-2 gap-3 mt-2">
//                 <button
//                     onClick={() => handlePaymentReceived('upi')}
//                     className="py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex flex-col items-center justify-center gap-1 transition-colors"
//                 >
//                     <Smartphone size={20} />
//                     <span className="text-xs">Paid via UPI</span>
//                 </button>

//                 <button
//                     onClick={() => handlePaymentReceived('cash')}
//                     className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex flex-col items-center justify-center gap-1 transition-colors"
//                 >
//                     <Banknote size={20} />
//                     <span className="text-xs">Paid via Cash</span>
//                 </button>
//             </div>

//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default MerchantBilling;

// import React, { useState, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Search, ShoppingCart, Plus, Minus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';

// const MerchantBilling = ({ inventory }) => {
//   const navigate = useNavigate();

//   // 🛒 State
//   const [cart, setCart] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState("All");

//   // 🔙 Back Button Logic (Safety Check)
//   const handleBack = () => {
//     if (cart.length > 0) {
//       const confirmDiscard = window.confirm("Discard current bill? All items in the cart will be lost.");
//       if (confirmDiscard) {
//         navigate(-1); // Go back
//       }
//     } else {
//       navigate(-1); // Go back immediately if cart is empty
//     }
//   };

//   // 🔍 Search & Filter Logic
//   const filteredItems = useMemo(() => {
//     return inventory.filter(item => {
//       const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
//       const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
//       return matchesSearch && matchesCategory;
//     });
//   }, [inventory, searchQuery, selectedCategory]);

//   // ➕ Add to Cart
//   const addToCart = (item) => {
//     setCart(prev => {
//       const existing = prev.find(i => i.id === item.id);
//       if (existing) {
//         return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
//       }
//       return [...prev, { ...item, qty: 1 }];
//     });
//   };

//   // ➖ Update Qty
//   const updateQty = (id, delta) => {
//     setCart(prev => prev.map(item => {
//       if (item.id === id) {
//         return { ...item, qty: Math.max(0, item.qty + delta) };
//       }
//       return item;
//     }).filter(i => i.qty > 0));
//   };

//   // 💰 Totals
//   const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
//   const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

//   return (
//     // 1. ✨ ANIMATION: 'animate-in fade-in slide-in-from-bottom-4' makes it smooth
//     <div className="h-full flex flex-col bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-300">

//       {/* 2. 🧱 NEW TOP BAR */}
//       <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shrink-0 shadow-sm">
//         {/* Back Button */}
//         <button
//           onClick={handleBack}
//           className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
//         >
//           <ArrowLeft size={24} />
//         </button>

//         {/* Title */}
//         <h1 className="font-bold text-lg text-slate-800 tracking-tight">
//           Billing
//         </h1>

//         {/* Spacer to keep title centered (matches back button width) */}
//         <div className="w-10"></div>
//       </div>

//       {/* Main Content (Split View on Desktop) */}
//       <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

//         {/* LEFT: Item Selection */}
//         <div className="flex-1 flex flex-col overflow-hidden relative">

//           {/* Search Bar (Now sits below Top Bar) */}
//           <div className="p-4 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
//               <input
//                 type="text"
//                 placeholder="Search items..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
//               />
//             </div>
//             {/* Categories */}
//             <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
//                {["All", ...new Set(inventory.map(i => i.category))].map(cat => (
//                  <button
//                    key={cat}
//                    onClick={() => setSelectedCategory(cat)}
//                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
//                      selectedCategory === cat
//                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
//                        : 'bg-white border border-slate-200 text-slate-600'
//                    }`}
//                  >
//                    {cat}
//                  </button>
//                ))}
//             </div>
//           </div>

//           {/* Items Grid */}
//           <div className="flex-1 overflow-y-auto p-4 pb-32 md:pb-4">
//              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
//                {filteredItems.map(item => (
//                  <div
//                    key={item.id}
//                    onClick={() => addToCart(item)}
//                    className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer active:scale-95 flex flex-col justify-between group h-28"
//                  >
//                     <div>
//                       <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</p>
//                       <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wide">{item.category}</p>
//                     </div>
//                     <div className="flex justify-between items-end mt-2">
//                        <span className="font-black text-slate-900">₹{item.price}</span>
//                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
//                          <Plus size={14} />
//                        </div>
//                     </div>
//                  </div>
//                ))}
//              </div>
//           </div>
//         </div>

//         {/* RIGHT: Cart (Bottom Sheet on Mobile, Side Panel on Desktop) */}
//         <div className={`
//            fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[1.5rem] shadow-[0_-5px_30px_rgba(0,0,0,0.1)] border-t border-slate-100 transition-transform duration-300
//            md:static md:w-96 md:rounded-none md:border-t-0 md:border-l md:shadow-none md:translate-y-0
//            flex flex-col h-[50vh] md:h-full
//            ${cart.length > 0 ? 'translate-y-0' : 'translate-y-[calc(100%-80px)] md:translate-y-0'}
//         `}>

//            {/* Handle for Mobile Drag */}
//            <div className="w-full flex justify-center py-2 md:hidden" onClick={() => {}}>
//              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
//            </div>

//            {/* Cart Header */}
//            <div className="px-5 py-2 flex justify-between items-center border-b border-dashed border-slate-200">
//               <div className="flex items-center gap-2">
//                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
//                     <ShoppingCart size={20} />
//                  </div>
//                  <div>
//                    <h2 className="font-bold text-slate-800">Current Bill</h2>
//                    <p className="text-xs text-slate-400">{totalItems} items</p>
//                  </div>
//               </div>
//               <button
//                 onClick={() => setCart([])}
//                 className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
//                 disabled={cart.length === 0}
//               >
//                 <Trash2 size={18} />
//               </button>
//            </div>

//            {/* Cart Items List */}
//            <div className="flex-1 overflow-y-auto p-4 space-y-3">
//              {cart.length === 0 ? (
//                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
//                   <ShoppingCart size={48} className="opacity-20" />
//                   <p className="text-sm font-medium">Cart is empty</p>
//                </div>
//              ) : (
//                cart.map(item => (
//                  <div key={item.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
//                     <div className="flex-1">
//                       <p className="font-bold text-sm text-slate-800">{item.name}</p>
//                       <p className="text-xs text-slate-500">₹{item.price} x {item.qty}</p>
//                     </div>
//                     <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1">
//                       <button
//                         onClick={() => updateQty(item.id, -1)}
//                         className="w-7 h-7 bg-white rounded-md shadow-sm flex items-center justify-center text-slate-600 active:scale-90"
//                       >
//                         <Minus size={14} />
//                       </button>
//                       <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
//                       <button
//                          onClick={() => updateQty(item.id, 1)}
//                          className="w-7 h-7 bg-emerald-500 rounded-md shadow-sm flex items-center justify-center text-white active:scale-90"
//                       >
//                         <Plus size={14} />
//                       </button>
//                     </div>
//                  </div>
//                ))
//              )}
//            </div>

//            {/* Checkout Footer */}
//            <div className="p-4 bg-slate-50 border-t border-slate-200 pb-safe">
//               <div className="flex justify-between items-center mb-4">
//                  <span className="text-slate-500 font-bold">Total Amount</span>
//                  <span className="text-2xl font-black text-slate-900">₹{totalAmount}</span>
//               </div>
//               <button
//                 disabled={cart.length === 0}
//                 className="w-full py-4 bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
//               >
//                 Proceed to Pay <ArrowLeft className="rotate-180" size={18} />
//               </button>
//            </div>

//         </div>

//       </div>
//     </div>
//   );
// };

// export default MerchantBilling;

// import React, { useState, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Search, ShoppingCart, Plus, Minus, Trash2, ArrowLeft, QrCode, X, CheckCircle2 } from 'lucide-react';

// const MerchantBilling = ({ inventory }) => {
//   const navigate = useNavigate();

//   // 🛒 State
//   const [cart, setCart] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState("All");
//   const [showQRModal, setShowQRModal] = useState(false); // 👈 Controls QR Popup

//   // 🔙 Back Button Logic
//   const handleBack = () => {
//     if (cart.length > 0) {
//       if (window.confirm("Discard current bill?")) navigate(-1);
//     } else {
//       navigate(-1);
//     }
//   };

//   // 🔍 Search Logic
//   const filteredItems = useMemo(() => {
//     return inventory.filter(item => {
//       const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
//       const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
//       return matchesSearch && matchesCategory;
//     });
//   }, [inventory, searchQuery, selectedCategory]);

//   // ➕ Cart Operations
//   const addToCart = (item) => {
//     setCart(prev => {
//       const existing = prev.find(i => i.id === item.id);
//       return existing
//         ? prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
//         : [...prev, { ...item, qty: 1 }];
//     });
//   };

//   const updateQty = (id, delta) => {
//     setCart(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter(i => i.qty > 0));
//   };

//   const handleFinishBill = () => {
//     // Here you would normally save to backend
//     setCart([]);
//     setShowQRModal(false);
//   };

//   // 💰 Totals
//   const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
//   const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

//   // 🔗 Generate QR Data (JSON string of bill)
//   const qrData = JSON.stringify({
//     m: "Merchant Name", // Replace with actual merchant name
//     t: totalAmount,
//     d: new Date().toISOString(),
//     i: cart.map(i => ({ n: i.name, q: i.qty, p: i.price }))
//   });

//   return (
//     <div className="h-full flex flex-col bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">

//       {/* 1. 🧱 TOP BAR */}
//       <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shrink-0 shadow-sm">
//         <button onClick={handleBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
//           <ArrowLeft size={24} />
//         </button>
//         <h1 className="font-bold text-lg text-slate-800 tracking-tight">New Bill</h1>
//         <div className="w-10"></div>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

//         {/* LEFT: Item Selection */}
//         <div className="flex-1 flex flex-col overflow-hidden relative">
//           {/* Search */}
//           <div className="p-4 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
//               <input
//                 type="text"
//                 placeholder="Search items..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
//               />
//             </div>
//             {/* Categories */}
//             <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
//                {["All", ...new Set(inventory.map(i => i.category))].map(cat => (
//                  <button
//                    key={cat}
//                    onClick={() => setSelectedCategory(cat)}
//                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600'}`}
//                  >
//                    {cat}
//                  </button>
//                ))}
//             </div>
//           </div>

//           {/* Items Grid */}
//           <div className="flex-1 overflow-y-auto p-4 pb-32 md:pb-4">
//              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
//                {filteredItems.map(item => (
//                  <div key={item.id} onClick={() => addToCart(item)} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-emerald-200 cursor-pointer active:scale-95 flex flex-col justify-between h-28 group">
//                     <div>
//                       <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</p>
//                       <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{item.category}</p>
//                     </div>
//                     <div className="flex justify-between items-end mt-2">
//                        <span className="font-black text-slate-900">₹{item.price}</span>
//                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
//                          <Plus size={14} />
//                        </div>
//                     </div>
//                  </div>
//                ))}
//              </div>
//           </div>
//         </div>

//         {/* RIGHT: Cart & Checkout */}
//         <div className={`fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[1.5rem] shadow-[0_-5px_30px_rgba(0,0,0,0.1)] border-t border-slate-100 transition-transform duration-300 md:static md:w-96 md:rounded-none md:border-l md:shadow-none md:translate-y-0 flex flex-col h-[50vh] md:h-full ${cart.length > 0 ? 'translate-y-0' : 'translate-y-[calc(100%-80px)] md:translate-y-0'}`}>

//            {/* Mobile Drag Handle */}
//            <div className="w-full flex justify-center py-2 md:hidden"><div className="w-12 h-1.5 bg-slate-200 rounded-full"></div></div>

//            {/* Cart Header */}
//            <div className="px-5 py-2 flex justify-between items-center border-b border-dashed border-slate-200">
//               <div className="flex items-center gap-2">
//                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700"><ShoppingCart size={20} /></div>
//                  <div><h2 className="font-bold text-slate-800">Current Bill</h2><p className="text-xs text-slate-400">{totalItems} items</p></div>
//               </div>
//               <button onClick={() => setCart([])} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors" disabled={cart.length === 0}><Trash2 size={18} /></button>
//            </div>

//            {/* Cart Items */}
//            <div className="flex-1 overflow-y-auto p-4 space-y-3">
//              {cart.length === 0 ? (
//                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2"><ShoppingCart size={48} className="opacity-20" /><p className="text-sm font-medium">Cart is empty</p></div>
//              ) : (
//                cart.map(item => (
//                  <div key={item.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
//                     <div className="flex-1"><p className="font-bold text-sm text-slate-800">{item.name}</p><p className="text-xs text-slate-500">₹{item.price} x {item.qty}</p></div>
//                     <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1">
//                       <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-white rounded-md shadow-sm flex items-center justify-center text-slate-600 active:scale-90"><Minus size={14} /></button>
//                       <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
//                       <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-emerald-500 rounded-md shadow-sm flex items-center justify-center text-white active:scale-90"><Plus size={14} /></button>
//                     </div>
//                  </div>
//                ))
//              )}
//            </div>

//            {/* 👇 UPDATED FOOTER: GENERATE QR */}
//            <div className="p-4 bg-slate-50 border-t border-slate-200 pb-safe">
//               <div className="flex justify-between items-center mb-4">
//                  <span className="text-slate-500 font-bold">Total Amount</span>
//                  <span className="text-2xl font-black text-slate-900">₹{totalAmount}</span>
//               </div>
//               <button
//                 onClick={() => setShowQRModal(true)}
//                 disabled={cart.length === 0}
//                 className="w-full py-4 bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
//               >
//                 <QrCode size={20} /> Generate QR Code
//               </button>
//            </div>
//         </div>
//       </div>

//       {/* 📱 2. QR CODE MODAL OVERLAY */}
//       {showQRModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">

//              {/* Modal Header */}
//              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
//                <X size={20} />
//              </button>

//              <div className="text-center mb-6">
//                <h2 className="text-xl font-bold text-slate-800">Scan to Pay</h2>
//                <p className="text-slate-500 text-sm">Customer can scan this to get the bill</p>
//              </div>

//              {/* QR Code Container */}
//              <div className="bg-slate-900 p-4 rounded-2xl mb-6 shadow-inner flex justify-center">
//                 {/* Using API for reliable QR generation without packages */}
//                 <div className="bg-white p-2 rounded-xl">
//                   <img
//                     src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
//                     alt="Bill QR"
//                     className="w-48 h-48 object-contain mix-blend-multiply"
//                   />
//                 </div>
//              </div>

//              {/* Summary */}
//              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-4 mb-4">
//                 <span className="text-slate-500 font-bold">Bill Total</span>
//                 <span className="text-3xl font-black text-slate-900">₹{totalAmount}</span>
//              </div>

//              {/* Finish Button */}
//              <button
//                onClick={handleFinishBill}
//                className="w-full py-3.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
//              >
//                <CheckCircle2 size={20} /> Done / Start New Bill
//              </button>

//           </div>
//         </div>
//       )}

//     </div>
//   );
// };

// export default MerchantBilling;

// import React, { useState, useMemo } from 'react';
// // 👇 Added useNavigate
// import { useNavigate } from 'react-router-dom';
// // 👇 Added ArrowLeft
// import { ShoppingBag, QrCode, X, Plus, Minus, Trash2, Search, Zap, CheckCircle, Banknote, Smartphone, ArrowLeft } from 'lucide-react';
// import toast from 'react-hot-toast';
// import { createReceipt, markReceiptPaid } from '../../services/api';

// const MerchantBilling = ({ inventory }) => {
//   // 👇 Initialize Navigate
//   const navigate = useNavigate();

//   // 🛒 Cart & UI State
//   const [cart, setCart] = useState([]);
//   const [showQr, setShowQr] = useState(false);
//   const [qrDataUrl, setQrDataUrl] = useState("");
//   const [generatedBill, setGeneratedBill] = useState(null);

//   // 🔍 Search & Filter State
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState("All");

//   // ⚡ Manual Item State
//   const [manualName, setManualName] = useState("");
//   const [manualPrice, setManualPrice] = useState("");
//   const [manualQty, setManualQty] = useState(1);
//   const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

//   // Load Merchant Profile
//   const merchantProfile = JSON.parse(localStorage.getItem('merchantProfile')) || {
//     shopName: "GreenReceipt Shop",
//     merchantId: "GR-DEMO"
//   };

//   // Calculations
//   const cartTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
//   const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
//   const categories = ["All", ...new Set(inventory.map(i => i.category || "General"))];

//   // Search Logic
//   const filteredItems = useMemo(() => {
//     return inventory.filter(item => {
//       const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
//       const matchesCategory = selectedCategory === "All" || (item.category || "General") === selectedCategory;
//       return matchesSearch && matchesCategory;
//     });
//   }, [inventory, searchQuery, selectedCategory]);

//   // ——— ACTIONS ———

//   // 👇 NEW: Back Button Logic
//   const handleBack = () => {
//     if (cart.length > 0) {
//       if (window.confirm("Discard current bill? All items will be lost.")) {
//         navigate(-1);
//       }
//     } else {
//       navigate(-1);
//     }
//   };

//   const addToCart = (item) => {
//     setCart(prev => {
//       const exists = prev.find(i => i.id === item.id);
//       if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
//       return [...prev, { ...item, quantity: 1 }];
//     });
//   };

//   const addManualItem = (e) => {
//     e.preventDefault();
//     if (!manualName || !manualPrice) return;
//     const newItem = {
//       id: `manual-${Date.now()}`,
//       name: manualName,
//       price: parseFloat(manualPrice),
//       quantity: parseInt(manualQty) > 0 ? parseInt(manualQty) : 1,
//       isManual: true
//     };
//     setCart(prev => [...prev, newItem]);
//     setManualName("");
//     setManualPrice("");
//     setManualQty(1);
//   };

//   const updateQuantity = (itemId, delta) => {
//     setCart(prev => prev.map(item => {
//       if (item.id === itemId) return { ...item, quantity: Math.max(1, item.quantity + delta) };
//       return item;
//     }));
//   };

//   const removeFromCart = (itemId) => setCart(prev => prev.filter(item => item.id !== itemId));

//   // 🚀 GENERATE QR
//   const handleGenerateQR = async () => {
//     const baseBill = {
//       merchant: merchantProfile.shopName,
//       mid: merchantProfile.merchantId,
//       date: new Date().toISOString().split('T')[0],
//       time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
//       total: cartTotal,
//       items: cart.map(item => ({
//         n: item.name,
//         q: item.quantity,
//         p: item.price
//       })),
//       footer: merchantProfile.receiptFooter || "Thank you!"
//     };

//     let createdReceipt = null;
//     try {
//       const payload = {
//         items: cart.map(item => ({ name: item.name, unitPrice: item.price, quantity: item.quantity })),
//         source: 'qr',
//         paymentMethod: 'upi',
//         transactionDate: new Date().toISOString(),
//         total: cartTotal,
//         footer: merchantProfile.receiptFooter,
//         status: 'pending',
//       };
//       const { data } = await createReceipt(payload);
//       createdReceipt = data;
//       const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//       localStorage.setItem('merchantSales', JSON.stringify([data, ...currentSales]));
//     } catch (err) {
//       createdReceipt = { ...baseBill, id: `GR-${Date.now().toString().slice(-6)}`, status: 'pending' };
//       const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//       localStorage.setItem('merchantSales', JSON.stringify([createdReceipt, ...currentSales]));
//     }

//     const receiptId = createdReceipt?.id || createdReceipt?._id || `GR-${Date.now().toString().slice(-6)}`;
//     const billData = { ...baseBill, id: receiptId, rid: receiptId };
//     setGeneratedBill(billData);
//     const jsonString = JSON.stringify(billData);
//     const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(jsonString)}`;
//     setQrDataUrl(apiUrl);
//     setShowQr(true);
//   };

//   // 💾 SAVE THE SALE
//   const handlePaymentReceived = async (method) => {
//       if (!generatedBill) return;

//       const receiptId = generatedBill.rid || generatedBill.id;

//       try {
//         if (receiptId) {
//           const { data } = await markReceiptPaid(receiptId, method);

//           const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//           const finalData = { ...data, paymentMethod: method };

//           const merged = [finalData, ...currentSales.filter(r => r.id !== receiptId && r._id !== receiptId)];
//           localStorage.setItem('merchantSales', JSON.stringify(merged));

//           window.dispatchEvent(new Event('customer-receipts-updated'));
//           window.dispatchEvent(new Event('merchantStorage'));
//         }
//       } catch (err) {
//         console.error(err);
//         const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];

//         const newSale = {
//           ...generatedBill,
//           total: cartTotal,
//           status: 'completed',
//           paymentMethod: method
//         };

//         const merged = [newSale, ...currentSales.filter(r => r.id !== receiptId)];
//         localStorage.setItem('merchantSales', JSON.stringify(merged));
//         window.dispatchEvent(new Event('merchantStorage'));
//       }

//       setShowQr(false);
//       setCart([]);
//       setIsMobileCartOpen(false);

//       const methodText = method === 'upi' ? "UPI" : "Cash";
//       toast.success(`Payment Received via ${methodText}!`);
//   };

//   return (
//     // 👇 UPDATED: Changed main container to flex-col to accommodate Top Bar
//     <div className="flex flex-col h-full bg-slate-50 animate-fade-in relative">

//       {/* 👇 NEW: Sticky Top Bar */}
//       <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shrink-0 shadow-sm">
//         <button
//           onClick={handleBack}
//           className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
//         >
//           <ArrowLeft size={24} />
//         </button>
//         <h1 className="font-bold text-lg text-slate-800 tracking-tight">New Bill</h1>
//         <div className="w-10"></div> {/* Spacer to center title */}
//       </div>

//       {/* 👇 UPDATED: Existing content wrapped in flex-1 container */}
//       <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden p-4">

//         {/* 🔹 LEFT: ITEMS GRID */}
//         <div className="flex-1 bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden shadow-sm">
//           <div className="p-4 border-b border-slate-100 bg-white z-10 space-y-4">
//               <div className="relative">
//                   <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
//                   <input type="text" placeholder="Search menu items..." className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
//               </div>
//               <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
//                   {categories.map(cat => (
//                       <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
//                   ))}
//               </div>
//           </div>
//           <div className="flex-1 overflow-y-auto p-4 pb-32 md:pb-4">
//               {filteredItems.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60"><Search size={32} className="mb-2"/><p>No items found.</p></div> :
//                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
//                       {filteredItems.map(item => (
//                           <button key={item.id} onClick={() => addToCart(item)} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all text-left group active:scale-95 flex flex-col justify-between h-24">
//                               <div><div className="font-bold text-slate-700 group-hover:text-emerald-700 leading-tight line-clamp-2">{item.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wide">{item.category}</div></div>
//                               <div className="text-sm font-bold text-emerald-600">₹{item.price}</div>
//                           </button>
//                       ))}
//                   </div>
//               }
//           </div>
//         </div>

//         {/* 🔹 MOBILE FLOATING BAR */}
//         {!isMobileCartOpen && (
//           <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-xl z-40 flex items-center justify-between" onClick={() => setIsMobileCartOpen(true)}>
//             <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total ({totalItems} items)</p><p className="text-2xl font-bold text-slate-800">₹{cartTotal}</p></div>
//             <button className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20">View Bill</button>
//           </div>
//         )}

//         {/* 🔹 RIGHT: CART PANEL */}
//         <div className={`fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-out md:static md:w-96 md:bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-xl md:translate-y-0 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
//           <div className="md:hidden p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50"><h2 className="font-bold text-lg text-slate-800">Current Bill</h2><button onClick={() => setIsMobileCartOpen(false)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-500"><X size={20} /></button></div>

//           <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
//               <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Zap size={12} className="text-amber-500"/> Quick Add (Manual)</h3>
//               <form onSubmit={addManualItem} className="flex gap-2"><input className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500 w-full" placeholder="Item Name" value={manualName} onChange={(e) => setManualName(e.target.value)} /><input className="w-16 px-1.5 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500" type="number" placeholder="₹" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />{/*<input className="w-12 px-2 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500 text-center" type="number" placeholder="Qty" onChange={(e) => setManualQty(e.target.value)} />*/}<button type="submit" className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors"><Plus size={16} /></button></form>
//           </div>

//           <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
//             {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60"><ShoppingBag size={32} className="mb-2" /><p className="text-sm">Cart is empty.</p></div> :
//               cart.map(item => (
//                 <div key={item.id} className={`p-3 rounded-xl border flex flex-col gap-2 ${item.isManual ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
//                   {/* Top Row: Name & Price */}
//                   <div className="flex justify-between items-start">
//                       <div>
//                           <div className="font-bold text-slate-700 text-sm">{item.name}</div>
//                           {item.isManual && <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-100 px-1 rounded">Manual</span>}
//                       </div>
//                       <div className="font-bold text-slate-800">₹{item.price * item.quantity}</div>
//                   </div>

//                   {/* Bottom Row: Controls */}
//                   <div className="flex justify-between items-center">
//                       <div className="text-xs text-slate-400 font-medium">₹{item.price}/unit</div>

//                       {/* Controls */}
//                       <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
//                           <button
//                               onClick={() => item.quantity === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)}
//                               className={`w-8 h-8 flex items-center justify-center rounded-l-lg transition-colors ${
//                                   item.quantity === 1
//                                       ? 'text-red-500 hover:bg-red-50'
//                                       : 'text-slate-500 hover:bg-slate-50'
//                               }`}
//                           >
//                               {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
//                           </button>

//                           <span className="w-8 text-center text-xs font-bold text-slate-800">{item.quantity}</span>

//                           <button
//                               onClick={() => updateQuantity(item.id, 1)}
//                               className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 text-emerald-600 rounded-r-lg transition-colors"
//                           >
//                               <Plus size={14} />
//                           </button>
//                       </div>
//                   </div>
//                 </div>
//               ))
//             }
//           </div>

//           <div className="border-t border-slate-100 p-4 bg-slate-50 shrink-0">
//             <div className="flex justify-between items-end mb-4"><span className="text-slate-500 font-bold text-sm">Total Amount</span><span className="text-3xl font-bold text-slate-900">₹{cartTotal}</span></div>
//             <button onClick={handleGenerateQR} disabled={cart.length === 0} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2"><QrCode size={18} /> Generate QR</button>
//           </div>
//         </div>

//       </div>

//       {/* 📸 QR MODAL */}
//       {showQr && (
//         <div className="fixed inset-0 bg-black/90 md:bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
//           <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-[popIn_0.2s_ease-out]">
//             <div className="flex justify-end"><button onClick={() => setShowQr(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20} /></button></div>

//             <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan to Save Bill</h2>
//             <p className="text-xs text-slate-500 mb-4">Customer can scan this to get the receipt instantly.</p>

//             <div className="bg-white p-2 rounded-xl inline-block mb-4 border border-slate-200 shadow-xl">
//                  {qrDataUrl ? <img src={qrDataUrl} alt="Receipt QR" className="w-56 h-56 rounded-lg" /> : <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-slate-400">Loading QR...</div>}
//             </div>

//             <div className="text-3xl font-bold text-emerald-600 mb-2">₹{cartTotal}</div>
//             <div className="text-xs text-slate-400 font-mono mb-6 bg-slate-50 p-2 rounded truncate max-w-[250px] mx-auto">ID: {generatedBill?.id}</div>

//             <div className="grid grid-cols-2 gap-3 mt-2">
//                 <button
//                     onClick={() => handlePaymentReceived('upi')}
//                     className="py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex flex-col items-center justify-center gap-1 transition-colors"
//                 >
//                     <Smartphone size={20} />
//                     <span className="text-xs">Paid via UPI</span>
//                 </button>

//                 <button
//                     onClick={() => handlePaymentReceived('cash')}
//                     className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex flex-col items-center justify-center gap-1 transition-colors"
//                 >
//                     <Banknote size={20} />
//                     <span className="text-xs">Paid via Cash</span>
//                 </button>
//             </div>

//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default MerchantBilling;

// import React, { useState, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { ShoppingBag, QrCode, X, Plus, Minus, Trash2, Search, Zap, CheckCircle, Banknote, Smartphone, ArrowLeft } from 'lucide-react';
// import toast from 'react-hot-toast';
// import { createReceipt, markReceiptPaid } from '../../services/api';

// const MerchantBilling = ({ inventory }) => {
//   const navigate = useNavigate();

//   // 🛒 Cart & UI State
//   const [cart, setCart] = useState([]);
//   const [showQr, setShowQr] = useState(false);
//   const [qrDataUrl, setQrDataUrl] = useState("");
//   const [generatedBill, setGeneratedBill] = useState(null);

//   // 🔍 Search & Filter State
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState("All");

//   // ⚡ Manual Item State
//   const [manualName, setManualName] = useState("");
//   const [manualPrice, setManualPrice] = useState("");
//   const [manualQty, setManualQty] = useState(1);
//   const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

//   // Load Merchant Profile
//   const merchantProfile = JSON.parse(localStorage.getItem('merchantProfile')) || {
//     shopName: "GreenReceipt Shop",
//     merchantId: "GR-DEMO"
//   };

//   // Calculations
//   const cartTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
//   const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
//   const categories = ["All", ...new Set(inventory.map(i => i.category || "General"))];

//   // Search Logic
//   const filteredItems = useMemo(() => {
//     return inventory.filter(item => {
//       const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
//       const matchesCategory = selectedCategory === "All" || (item.category || "General") === selectedCategory;
//       return matchesSearch && matchesCategory;
//     });
//   }, [inventory, searchQuery, selectedCategory]);

//   // ——— ACTIONS ———

//   const handleBack = () => {
//     if (cart.length > 0) {
//       if (window.confirm("Discard current bill? All items will be lost.")) {
//         navigate(-1);
//       }
//     } else {
//       navigate(-1);
//     }
//   };

//   const addToCart = (item) => {
//     setCart(prev => {
//       const exists = prev.find(i => i.id === item.id);
//       if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
//       return [...prev, { ...item, quantity: 1 }];
//     });
//   };

//   const addManualItem = (e) => {
//     e.preventDefault();
//     if (!manualName || !manualPrice) return;
//     const newItem = {
//       id: `manual-${Date.now()}`,
//       name: manualName,
//       price: parseFloat(manualPrice),
//       quantity: parseInt(manualQty) > 0 ? parseInt(manualQty) : 1,
//       isManual: true
//     };
//     setCart(prev => [...prev, newItem]);
//     setManualName("");
//     setManualPrice("");
//     setManualQty(1);
//   };

//   const updateQuantity = (itemId, delta) => {
//     setCart(prev => prev.map(item => {
//       if (item.id === itemId) return { ...item, quantity: Math.max(1, item.quantity + delta) };
//       return item;
//     }));
//   };

//   const removeFromCart = (itemId) => setCart(prev => prev.filter(item => item.id !== itemId));

//   // 🚀 GENERATE QR
//   const handleGenerateQR = async () => {
//     const baseBill = {
//       merchant: merchantProfile.shopName,
//       mid: merchantProfile.merchantId,
//       date: new Date().toISOString().split('T')[0],
//       time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
//       total: cartTotal,
//       items: cart.map(item => ({
//         n: item.name,
//         q: item.quantity,
//         p: item.price
//       })),
//       footer: merchantProfile.receiptFooter || "Thank you!"
//     };

//     let createdReceipt = null;
//     try {
//       const payload = {
//         items: cart.map(item => ({ name: item.name, unitPrice: item.price, quantity: item.quantity })),
//         source: 'qr',
//         paymentMethod: 'upi',
//         transactionDate: new Date().toISOString(),
//         total: cartTotal,
//         footer: merchantProfile.receiptFooter,
//         status: 'pending',
//       };
//       const { data } = await createReceipt(payload);
//       createdReceipt = data;
//       const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//       localStorage.setItem('merchantSales', JSON.stringify([data, ...currentSales]));
//     } catch (err) {
//       createdReceipt = { ...baseBill, id: `GR-${Date.now().toString().slice(-6)}`, status: 'pending' };
//       const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//       localStorage.setItem('merchantSales', JSON.stringify([createdReceipt, ...currentSales]));
//     }

//     const receiptId = createdReceipt?.id || createdReceipt?._id || `GR-${Date.now().toString().slice(-6)}`;
//     const billData = { ...baseBill, id: receiptId, rid: receiptId };
//     setGeneratedBill(billData);
//     const jsonString = JSON.stringify(billData);
//     const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(jsonString)}`;
//     setQrDataUrl(apiUrl);
//     setShowQr(true);
//   };

//   // 💾 SAVE THE SALE
//   const handlePaymentReceived = async (method) => {
//       if (!generatedBill) return;

//       const receiptId = generatedBill.rid || generatedBill.id;

//       try {
//         if (receiptId) {
//           const { data } = await markReceiptPaid(receiptId, method);

//           const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
//           const finalData = { ...data, paymentMethod: method };

//           const merged = [finalData, ...currentSales.filter(r => r.id !== receiptId && r._id !== receiptId)];
//           localStorage.setItem('merchantSales', JSON.stringify(merged));

//           window.dispatchEvent(new Event('customer-receipts-updated'));
//           window.dispatchEvent(new Event('merchantStorage'));
//         }
//       } catch (err) {
//         console.error(err);
//         const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];

//         const newSale = {
//           ...generatedBill,
//           total: cartTotal,
//           status: 'completed',
//           paymentMethod: method
//         };

//         const merged = [newSale, ...currentSales.filter(r => r.id !== receiptId)];
//         localStorage.setItem('merchantSales', JSON.stringify(merged));
//         window.dispatchEvent(new Event('merchantStorage'));
//       }

//       setShowQr(false);
//       setCart([]);
//       setIsMobileCartOpen(false);

//       const methodText = method === 'upi' ? "UPI" : "Cash";
//       toast.success(`Payment Received via ${methodText}!`);
//   };

//   return (
//     <div className="flex flex-col h-full bg-slate-50 animate-fade-in relative">

//       {/* 🔹 STICKY TOP BAR */}
//       <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
//         <button
//           onClick={handleBack}
//           className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
//         >
//           <ArrowLeft size={22} />
//         </button>
//         <h1 className="font-bold text-base text-slate-800 tracking-tight">New Bill</h1>
//         <div className="w-10"></div>
//       </div>

//       {/* 👇 UPDATED:
//           1. Removed 'p-4' from this main container on mobile.
//           2. It is now 'p-0' on mobile and 'md:p-4' on desktop.
//       */}
//       <div className="flex-1 flex flex-col md:flex-row md:gap-6 overflow-hidden p-0 md:p-4">

//         {/* 🔹 LEFT: ITEMS GRID */}
//         {/* 👇 UPDATED:
//            1. Removed 'rounded-2xl' and 'border' on mobile for edge-to-edge look.
//            2. Added them back only on 'md:' (desktop).
//         */}
//         <div className="flex-1 bg-white md:rounded-2xl md:border md:border-slate-100 flex flex-col overflow-hidden md:shadow-sm">
//           <div className="p-3 border-b border-slate-100 bg-white z-10 space-y-3 shadow-sm md:shadow-none">
//               <div className="relative">
//                   <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
//                   <input type="text" placeholder="Search..." className="w-full bg-slate-100 border-none rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
//               </div>
//               <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
//                   {categories.map(cat => (
//                       <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
//                   ))}
//               </div>
//           </div>

//           <div className="flex-1 overflow-y-auto p-3 pb-32 md:pb-4 bg-slate-50 md:bg-white">
//               {filteredItems.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60"><Search size={32} className="mb-2"/><p>No items found.</p></div> :
//                   /* 👇 UPDATED ITEM CARD STYLING:
//                      1. gap-2 (smaller gap)
//                      2. p-2 (smaller padding)
//                      3. h-20 (smaller height)
//                      4. text-xs (smaller font)
//                   */
//                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
//                       {filteredItems.map(item => (
//                           <button
//                             key={item.id}
//                             onClick={() => addToCart(item)}
//                             className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform text-left flex flex-col justify-between h-20 md:h-24 relative overflow-hidden group"
//                           >
//                               {/* Simple Plus Icon Overlay on Hover */}
//                               <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white rounded-full p-0.5">
//                                 <Plus size={12} />
//                               </div>

//                               <div>
//                                 <div className="font-bold text-slate-700 text-xs leading-tight line-clamp-2">{item.name}</div>
//                                 <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wide">{item.category}</div>
//                               </div>
//                               <div className="text-xs font-black text-emerald-600">₹{item.price}</div>
//                           </button>
//                       ))}
//                   </div>
//               }
//           </div>
//         </div>

//         {/* 🔹 MOBILE FLOATING BAR */}
//         {!isMobileCartOpen && (
//           <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40 flex items-center justify-between" onClick={() => setIsMobileCartOpen(true)}>
//             <div>
//               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total ({totalItems} items)</p>
//               <p className="text-xl font-black text-slate-800">₹{cartTotal}</p>
//             </div>
//             <button className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">
//               View Bill
//             </button>
//           </div>
//         )}

//         {/* 🔹 RIGHT: CART PANEL */}
//         <div className={`fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-out md:static md:w-96 md:bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-xl md:translate-y-0 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
//           <div className="md:hidden p-3 border-b border-slate-100 flex items-center justify-between bg-white shadow-sm z-10">
//             <h2 className="font-bold text-base text-slate-800">Current Bill</h2>
//             <button onClick={() => setIsMobileCartOpen(false)} className="p-1.5 bg-slate-100 rounded-full text-slate-500"><X size={18} /></button>
//           </div>

//           <div className="p-3 bg-slate-50 border-b border-slate-100 shrink-0">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Zap size={10} className="text-amber-500"/> Quick Add (Manual)</h3>
//               <form onSubmit={addManualItem} className="flex gap-2">
//                 <input className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 w-full" placeholder="Item Name" value={manualName} onChange={(e) => setManualName(e.target.value)} />
//                 <input className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500" type="number" placeholder="₹" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />
//                 <button type="submit" className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors"><Plus size={14} /></button>
//               </form>
//           </div>

//           <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
//             {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60"><ShoppingBag size={28} className="mb-2" /><p className="text-xs">Cart is empty.</p></div> :
//               cart.map(item => (
//                 <div key={item.id} className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${item.isManual ? 'bg-amber-50/50 border-amber-100' : 'bg-white border-slate-100 shadow-sm'}`}>
//                   {/* Top Row: Name & Price */}
//                   <div className="flex justify-between items-start">
//                       <div>
//                           <div className="font-bold text-slate-700 text-xs">{item.name}</div>
//                           {item.isManual && <span className="text-[8px] font-bold text-amber-600 uppercase bg-amber-100 px-1 rounded ml-1">Manual</span>}
//                       </div>
//                       <div className="font-bold text-slate-900 text-sm">₹{item.price * item.quantity}</div>
//                   </div>

//                   {/* Bottom Row: Controls */}
//                   <div className="flex justify-between items-center">
//                       <div className="text-[10px] text-slate-400 font-medium">₹{item.price}/unit</div>

//                       {/* Controls */}
//                       <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg h-7">
//                           <button
//                               onClick={() => item.quantity === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)}
//                               className={`w-7 h-full flex items-center justify-center rounded-l-lg transition-colors ${
//                                   item.quantity === 1
//                                       ? 'text-red-500 hover:bg-red-50'
//                                       : 'text-slate-500 hover:bg-slate-200'
//                               }`}
//                           >
//                               {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
//                           </button>

//                           <span className="w-6 text-center text-xs font-bold text-slate-800">{item.quantity}</span>

//                           <button
//                               onClick={() => updateQuantity(item.id, 1)}
//                               className="w-7 h-full flex items-center justify-center hover:bg-emerald-100 text-emerald-600 rounded-r-lg transition-colors"
//                           >
//                               <Plus size={12} />
//                           </button>
//                       </div>
//                   </div>
//                 </div>
//               ))
//             }
//           </div>

//           <div className="border-t border-slate-100 p-3 bg-slate-50 shrink-0">
//             <div className="flex justify-between items-end mb-3"><span className="text-slate-500 font-bold text-xs">Total Amount</span><span className="text-2xl font-black text-slate-900">₹{cartTotal}</span></div>
//             <button onClick={handleGenerateQR} disabled={cart.length === 0} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2 text-sm"><QrCode size={16} /> Generate QR</button>
//           </div>
//         </div>

//       </div>

//       {/* 📸 QR MODAL */}
//       {showQr && (
//         <div className="fixed inset-0 bg-black/90 md:bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
//           <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center animate-[popIn_0.2s_ease-out]">
//             <div className="flex justify-end"><button onClick={() => setShowQr(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={18} /></button></div>

//             <h2 className="text-xl font-bold text-slate-800 mb-1">Scan to Save Bill</h2>
//             <p className="text-[10px] text-slate-500 mb-4">Customer can scan this to get the receipt instantly.</p>

//             <div className="bg-white p-2 rounded-xl inline-block mb-4 border border-slate-200 shadow-xl">
//                  {qrDataUrl ? <img src={qrDataUrl} alt="Receipt QR" className="w-48 h-48 rounded-lg" /> : <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400">Loading...</div>}
//             </div>

//             <div className="text-3xl font-black text-emerald-600 mb-2">₹{cartTotal}</div>
//             <div className="text-[10px] text-slate-400 font-mono mb-6 bg-slate-50 p-2 rounded truncate max-w-[200px] mx-auto">ID: {generatedBill?.id}</div>

//             <div className="grid grid-cols-2 gap-3 mt-2">
//                 <button
//                     onClick={() => handlePaymentReceived('upi')}
//                     className="py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex flex-col items-center justify-center gap-1 transition-colors"
//                 >
//                     <Smartphone size={18} />
//                     <span className="text-[10px]">Paid via UPI</span>
//                 </button>

//                 <button
//                     onClick={() => handlePaymentReceived('cash')}
//                     className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex flex-col items-center justify-center gap-1 transition-colors"
//                 >
//                     <Banknote size={18} />
//                     <span className="text-[10px]">Paid via Cash</span>
//                 </button>
//             </div>

//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default MerchantBilling;

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  QrCode,
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  Zap,
  CheckCircle,
  Banknote,
  Smartphone,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Wallet,
  Clock,
  Loader2,
  AlertCircle,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  createReceipt, 
  deleteReceipt, 
  markReceiptPaid, 
  getReceiptById,
  // New POS APIs
  createPOSBill,
  confirmPOSPayment,
  cancelPOSBill,
  fetchUPISettings,
} from "../../services/api";
import { getTodayIST, formatISTDisplay, getNowIST } from "../../utils/timezone";
import { useTheme } from "../../contexts/ThemeContext";

const MerchantBilling = ({ inventory, profile }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const pendingReceiptIdRef = useRef(null);
  const paymentFinalizedRef = useRef(false);
  const paymentInProgressRef = useRef(false);

  const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ""));

  // 🆕 UPI POS State
  const [upiSettings, setUpiSettings] = useState(null);
  const [upiLoading, setUpiLoading] = useState(true);
  const [posBill, setPosBill] = useState(null);
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [billExpiry, setBillExpiry] = useState(null);
  const [expiryCountdown, setExpiryCountdown] = useState(0);

  // Load UPI settings on mount
  useEffect(() => {
    const loadUPISettings = async () => {
      try {
        const { data } = await fetchUPISettings();
        setUpiSettings(data);
      } catch (err) {
        console.warn("Could not load UPI settings:", err);
        setUpiSettings({ isConfigured: false });
      } finally {
        setUpiLoading(false);
      }
    };
    loadUPISettings();
  }, []);

  // Countdown timer for bill expiry
  useEffect(() => {
    if (!showUpiQr || !billExpiry) return;
    
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(billExpiry) - Date.now()) / 1000));
      setExpiryCountdown(remaining);
      
      if (remaining <= 0) {
        toast.error("Bill expired. Please generate a new QR.");
        handleCloseUpiQr();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [showUpiQr, billExpiry]);

  const voidPendingReceipt = async () => {
    const pendingId = pendingReceiptIdRef.current;
    if (!pendingId || !isObjectId(pendingId)) return;
    if (paymentFinalizedRef.current) return;
    if (paymentInProgressRef.current) return;

    try {
      await deleteReceipt(pendingId);
    } catch (err) {
      // Best-effort cleanup; ignore failures (network/offline, already deleted, etc.)
      console.warn(
        "Failed to void pending receipt",
        err?.response?.data || err?.message || err
      );
    } finally {
      pendingReceiptIdRef.current = null;
    }
  };

  // 🛒 Cart & UI State
  const [cart, setCart] = useState([]);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [generatedBill, setGeneratedBill] = useState(null);

  // 📒 Pending/Khata State
  const [pendingLoading, setPendingLoading] = useState(false);
  const [customerScanned, setCustomerScanned] = useState(false);
  const [scannedCustomerName, setScannedCustomerName] = useState("");
  const [scannedCustomerIntent, setScannedCustomerIntent] = useState(null);

  // 🔍 Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // ⚡ Manual Item State
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [discount, setDiscount] = useState(0);
  const [manualQty, setManualQty] = useState(1);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Load Merchant Profile
  const merchantProfile = useMemo(() => {
    if (profile) {
      return {
        shopName: profile.shopName || "GreenReceipt Shop",
        merchantId: profile.id, // Use real ID
        receiptFooter: profile.receiptFooter,
      };
    }
    return (
      JSON.parse(localStorage.getItem("merchantProfile")) || {
        shopName: "GreenReceipt Shop",
        merchantId: "GR-DEMO",
      }
    );
  }, [profile]);

  // Calculations
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const categories = [
    "All",
    ...new Set(inventory.map((i) => i.category || "General")),
  ];

  // Search Logic
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" ||
        (item.category || "General") === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  // ——— ACTIONS ———

  const handleBack = () => {
    // If merchant leaves while QR is open, don't keep a pending receipt in DB
    if (showQr) {
      voidPendingReceipt();
      setShowQr(false);
      setGeneratedBill(null);
      setQrDataUrl("");
    }
    if (cart.length > 0) {
      if (window.confirm("Discard current bill? All items will be lost.")) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  // If the user uses browser back / route change, ensure we don't leave orphan pending receipts.
  useEffect(() => {
    return () => {
      voidPendingReceipt();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists)
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const addManualItem = (e) => {
    e.preventDefault();
    if (!manualName || !manualPrice) return;
    const newItem = {
      id: `manual-${Date.now()}`,
      name: manualName,
      price: parseFloat(manualPrice),
      quantity: parseInt(manualQty) > 0 ? parseInt(manualQty) : 1,
      isManual: true,
    };
    setCart((prev) => [...prev, newItem]);
    setManualName("");
    setManualPrice("");
    setManualQty(1);
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId)
          return { ...item, quantity: Math.max(1, item.quantity + delta) };
        return item;
      })
    );
  };

  const removeFromCart = (itemId) =>
    setCart((prev) => prev.filter((item) => item.id !== itemId));

  // 🚀 GENERATE QR (persist first so QR carries a valid ObjectId)
  // const handleGenerateQR = async () => {
  //   const finalAmount = Math.max(0, cartTotal - discount);
  //   if (cart.length === 0) return;

  //   try {
  //     const baseBill = {
  //       merchant: merchantProfile.shopName,
  //       mid: merchantProfile.merchantId,
  //       date: getTodayIST(),
  //       time: formatISTDisplay(getNowIST(), {
  //         hour: "2-digit",
  //         minute: "2-digit",
  //         hour12: true,
  //       }),
  //       total: finalAmount,
  //       items: cart.map((item) => ({
  //         n: item.name,
  //         q: item.quantity,
  //         p: item.price,
  //       })),
  //       footer: merchantProfile.receiptFooter || "Thank you!",
  //     };

  //     // 🚀 Create the pending receipt *before* showing the QR so the QR carries a real ObjectId
  //     const payload = {
  //       items: cart.map((item) => ({
  //         name: item.name,
  //         unitPrice: item.price,
  //         quantity: item.quantity,
  //       })),
  //       source: "qr",
  //       paymentMethod: "other", // Actual method is confirmed later
  //       transactionDate: new Date().toISOString(),
  //       total: cartTotal,
  //       footer: merchantProfile.receiptFooter,
  //       status: "pending",
  //     };

  //     const { data: created } = await createReceipt(payload);
  //     const persistedId = created.id || created._id;

  //     const billData = { ...baseBill, id: persistedId, rid: persistedId };
  //     setGeneratedBill(billData);

  //     const jsonString = JSON.stringify(billData);
  //     const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
  //       jsonString
  //     )}`;
  //     setQrDataUrl(apiUrl);
  //     setShowQr(true);
  //   } catch (err) {
  //     console.error("QR generation failed", err);
  //     toast.error("Could not generate QR. Please try again.");
  //   }
  // };

  const handleGenerateQR = async () => {
    // 1. Calculate Final Amount
    const finalAmount = Math.max(0, cartTotal - discount);
    
    if (cart.length === 0) return;

    try {
      // 2. Data encoded inside the QR Code (for the customer/scanner)
      const baseBill = {
        merchant: merchantProfile.shopName,
        mid: merchantProfile.merchantId,
        date: getTodayIST(),
        time: formatISTDisplay(getNowIST(), {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        total: finalAmount, // ✅ Correct (Post-Discount)
        items: cart.map((item) => ({
          n: item.name,
          q: item.quantity,
          p: item.price,
        })),
        footer: merchantProfile.receiptFooter || "Thank you!",
      };

      // 3. Data sent to your Database (to create the Receipt record)
      // 🚀 Create the pending receipt *before* showing the QR
      const payload = {
        items: cart.map((item) => ({
          name: item.name,
          unitPrice: item.price,
          quantity: item.quantity,
        })),
        source: "qr",
        paymentMethod: "other",
        transactionDate: new Date().toISOString(),
        
        // 🔴 FIX: Send the Final Amount, not the Subtotal
        total: finalAmount, 
        
        // 🟢 ADD: Store these for accounting/history
        subtotal: cartTotal,
        discount: discount,
        
        footer: merchantProfile.receiptFooter,
        status: "pending",
      };

      const { data: created } = await createReceipt(payload);
      const persistedId = created.id || created._id;

      // Track for cleanup if merchant backs out before confirming payment
      pendingReceiptIdRef.current = persistedId;
      paymentFinalizedRef.current = false;

      // Add the real DB ID to the QR data so we can look it up later
      const billData = { ...baseBill, id: persistedId, rid: persistedId };
      setGeneratedBill(billData);

      const jsonString = JSON.stringify(billData);
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
        jsonString
      )}`;
      setQrDataUrl(apiUrl);
      setShowQr(true);
    } catch (err) {
      console.error("QR generation failed", err);
      toast.error("Could not generate QR. Please try again.");
    }
  };

  // 🆕 GENERATE UPI QR (Merchant-Confirmed UPI Payment Flow)
  // This creates a proper UPI deep link QR that opens GPay/PhonePe directly
  const handleGenerateUpiQR = async () => {
    const finalAmount = Math.max(0, cartTotal - discount);
    
    if (cart.length === 0) return;
    
    // Check if UPI is configured
    if (!upiSettings?.isConfigured) {
      toast.error("Please configure your UPI ID in settings first", {
        icon: "⚠️",
        duration: 4000,
      });
      return;
    }

    try {
      // Create POS bill using new API
      const payload = {
        items: cart.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        expiryMinutes: 10, // Bill expires in 10 minutes
      };

      const { data } = await createPOSBill(payload);
      
      // Store bill data
      setPosBill(data);
      setBillExpiry(data.bill.expiresAt);
      setExpiryCountdown(Math.floor((new Date(data.bill.expiresAt) - Date.now()) / 1000));
      
      // Generate QR from UPI link
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(data.upi.link)}`;
      setUpiQrUrl(qrUrl);
      setShowUpiQr(true);
      
    } catch (err) {
      console.error("UPI QR generation failed", err);
      if (err.response?.data?.code === "UPI_NOT_CONFIGURED") {
        toast.error("Please configure your UPI ID in settings first");
      } else {
        toast.error(err.response?.data?.message || "Could not generate UPI QR. Please try again.");
      }
    }
  };

  // 🆕 Close UPI QR Modal
  const handleCloseUpiQr = async () => {
    // Cancel the pending bill if not confirmed
    if (posBill?.bill?.id) {
      try {
        await cancelPOSBill(posBill.bill.id);
      } catch (err) {
        console.warn("Could not cancel bill:", err);
      }
    }
    
    setShowUpiQr(false);
    setPosBill(null);
    setUpiQrUrl("");
    setBillExpiry(null);
    setExpiryCountdown(0);
  };

  // 🆕 CONFIRM UPI PAYMENT RECEIVED (Merchant is the source of truth)
  const handleConfirmUpiPayment = async () => {
    if (!posBill?.bill?.id) {
      toast.error("Missing bill. Please generate again.");
      return;
    }

    try {
      const { data } = await confirmPOSPayment(posBill.bill.id);
      
      // Success! Payment confirmed
      toast.success("Payment Confirmed! Receipt generated.", {
        icon: "✅",
        duration: 3000,
      });

      // Trigger events to update other components
      window.dispatchEvent(new Event("customer-receipts-updated"));
      window.dispatchEvent(new Event("merchantStorage"));
      window.dispatchEvent(new Event("merchant-receipts-updated"));

      // Reset state
      setShowUpiQr(false);
      setPosBill(null);
      setUpiQrUrl("");
      setBillExpiry(null);
      setCart([]);
      setDiscount(0);
      setIsMobileCartOpen(false);
      
    } catch (err) {
      console.error("Payment confirmation failed", err);
      const message = err.response?.data?.message || "Could not confirm payment";
      toast.error(message);
    }
  };

  const handleCloseQr = () => {
    // Merchant closed QR without payment -> delete pending receipt
    voidPendingReceipt();
    setShowQr(false);
    setGeneratedBill(null);
    setQrDataUrl("");
  };

  // 💾 SAVE THE SALE (mark existing pending receipt as paid)
  const handlePaymentReceived = async (method) => {
    if (!generatedBill) return;

    const persistedId = generatedBill.rid || generatedBill.id;
    if (!persistedId) {
      toast.error("Missing bill id. Please generate again.");
      return;
    }

    try {
      paymentInProgressRef.current = true;

      // Mark as paid to capture paidAt timestamp and final status
      const { data: updated } = await markReceiptPaid(persistedId, method);

      paymentFinalizedRef.current = true;
      pendingReceiptIdRef.current = null;

      const currentSales =
        JSON.parse(localStorage.getItem("merchantSales")) || [];
      const merged = [
        updated,
        ...currentSales.filter(
          (r) => r.id !== persistedId && r._id !== persistedId
        ),
      ];
      localStorage.setItem("merchantSales", JSON.stringify(merged));

      window.dispatchEvent(new Event("customer-receipts-updated"));
      window.dispatchEvent(new Event("merchantStorage"));
      window.dispatchEvent(new Event("merchant-receipts-updated"));

      setShowQr(false);
      setGeneratedBill(null);
      setQrDataUrl("");
      setCart([]);
      setIsMobileCartOpen(false);

      const methodText = method === "upi" ? "UPI" : "Cash";
      toast.success(`Payment Received via ${methodText}!`);
    } catch (err) {
      console.error(err);
      toast.error("Could not mark paid. Please try again.");
    } finally {
      paymentInProgressRef.current = false;
    }
  };

  // � Poll for customer scan status
  const checkCustomerScanned = async () => {
    if (!generatedBill) return;
    const persistedId = generatedBill.rid || generatedBill.id;
    if (!persistedId || !isObjectId(persistedId)) return;
    
    try {
      const { data } = await getReceiptById(persistedId);
      if (data.customerName || data.claimedByCustomer) {
        setCustomerScanned(true);
        setScannedCustomerName(data.customerName || "Customer");
        setScannedCustomerIntent(data.customerPaymentIntent || null);
      }
    } catch (err) {
      // Ignore errors during polling
    }
  };

  // Poll every 2 seconds while QR is shown
  useEffect(() => {
    if (!showQr || !generatedBill) return;
    
    const interval = setInterval(checkCustomerScanned, 2000);
    return () => clearInterval(interval);
  }, [showQr, generatedBill]);

  // Reset customer scan state when QR closes
  useEffect(() => {
    if (!showQr) {
      setCustomerScanned(false);
      setScannedCustomerName("");
      setScannedCustomerIntent(null);
    }
  }, [showQr]);

  // 📒 MARK AS PENDING (Khata) - Direct, no modal needed
  const handleMarkAsPending = async () => {
    if (!generatedBill) return;

    const persistedId = generatedBill.rid || generatedBill.id;
    if (!persistedId) {
      toast.error("Missing bill id. Please generate again.");
      return;
    }

    if (!customerScanned) {
      toast.error("Wait for customer to scan QR first!");
      return;
    }

    try {
      setPendingLoading(true);
      paymentInProgressRef.current = true;

      // Mark as pending - customer info already linked via scan
      await markReceiptPaid(persistedId, "pending");

      paymentFinalizedRef.current = true;
      pendingReceiptIdRef.current = null;

      // Close modals and reset
      setShowQr(false);
      setGeneratedBill(null);
      setQrDataUrl("");
      setCart([]);
      setIsMobileCartOpen(false);
      setCustomerScanned(false);
      setScannedCustomerName("");

      toast.success(`Added to Khata for ${scannedCustomerName}!`, {
        icon: "📒",
      });

      // Navigate back to overview
      navigate("/merchant/overview");
    } catch (err) {
      console.error(err);
      toast.error("Could not mark as pending. Please try again.");
    } finally {
      setPendingLoading(false);
      paymentInProgressRef.current = false;
    }
  };

  return (
    <div
      className={`flex flex-col h-full ${
        isDark ? "bg-dark-bg" : "bg-slate-50"
      } animate-fade-in relative pt-14`}
    >
      {/* 🔹 STICKY TOP BAR (Mobile Only) */}
      {/* <div className={`sticky top-0 z-30 ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-slate-200'} border-b px-4 h-14 flex items-center justify-between shrink-0 shadow-sm md:hidden`}>
        <button 
          onClick={handleBack}
          className={`p-2 -ml-2 ${isDark ? 'text-slate-400 hover:bg-dark-surface' : 'text-slate-600 hover:bg-slate-100'} rounded-full transition-colors active:scale-95`}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'} tracking-tight`}>New Bill</h1>
        <div className="w-10"></div> 
      </div> */}

      {/* Change 'sticky' to 'fixed left-0 w-full' */}
      <div
        className={`fixed top-0 left-0 w-full z-30 ${
          isDark
            ? "bg-dark-card border-dark-border"
            : "bg-white border-slate-200"
        } border-b px-4 h-14 flex items-center justify-between shrink-0 shadow-sm md:hidden`}
      >
        <button
          onClick={handleBack}
          className={`p-2 -ml-2 ${
            isDark
              ? "text-slate-400 hover:bg-dark-surface"
              : "text-slate-600 hover:bg-slate-100"
          } rounded-full transition-colors active:scale-95`}
        >
          <ArrowLeft size={22} />
        </button>
        <h1
          className={`font-bold text-base ${
            isDark ? "text-white" : "text-slate-800"
          } tracking-tight`}
        >
          New Bill
        </h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row md:gap-6 overflow-hidden p-0 md:p-4">
        {/* 🔹 LEFT: ITEMS GRID */}
        <div
          className={`flex-1 ${
            isDark
              ? "bg-dark-card md:border-dark-border"
              : "bg-white md:border-slate-100"
          } md:rounded-2xl md:border flex flex-col overflow-hidden md:shadow-sm`}
        >
          {/* Header Section */}
          <div
            className={`p-3 border-b sticky top-0 z-20 backdrop-blur-md ${
              isDark
                ? "border-dark-border bg-dark-card/90"
                : "border-slate-100 bg-white/90"
            } space-y-3`}
          >
            <div className="relative">
              <Search
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
                size={16}
              />
              <input
                type="text"
                placeholder="Search for dishes..."
                className={`w-full ${
                  isDark
                    ? "bg-dark-surface border-dark-border text-white placeholder-slate-600 ring-1 ring-emerald-500/40"
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:bg-white"
                } border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-gradient-right">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border ${
                    selectedCategory === cat
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20"
                      : isDark
                      ? "bg-dark-surface text-slate-400 border-dark-border hover:bg-dark-hover hover:text-slate-200"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* HYBRID LAYOUT: List on Mobile, Grid on Desktop */}
  <div className={`flex-1 overflow-y-auto p-3 pb-32 md:pb-4 ${isDark ? 'bg-dark-bg' : 'bg-slate-50/50'}`}>
      {filteredItems.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-600' : 'text-slate-400'} opacity-60`}>
            <div className={`p-4 rounded-full mb-3 ${isDark ? 'bg-dark-surface' : 'bg-white'}`}>
               <Search size={24} className="opacity-50"/>
            </div>
            <p className="text-sm font-medium">No items found</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-4">
              {filteredItems.map(item => {
                  // Check cart quantity for badge
                  const cartItem = cart.find(c => c.id === item.id || c._id === item._id);
                  const qty = cartItem ? cartItem.qty : 0;

                  return (
                      <button 
                        key={item.id} 
                        onClick={() => addToCart(item)} 
                        className={`
                           group relative text-left transition-all duration-200
                           rounded-2xl border shadow-sm hover:shadow-md active:scale-[0.98] overflow-hidden
                           ${isDark ? 'bg-dark-surface border-dark-border hover:border-emerald-500/30' : 'bg-white border-slate-200 hover:border-emerald-500/50'} 
                           ${qty > 0 ? (isDark ? 'border-emerald-500/30 ring-1 ring-emerald-500/20' : 'border-emerald-500 ring-1 ring-emerald-500/20') : ''}
                           
                           /* 🟢 LAYOUT SWITCHER MAGIC */
                           flex flex-row md:flex-col items-start md:items-stretch
                           p-3 md:p-0
                           gap-3 md:gap-0
                        `}
                      >
                          {/* 1. IMAGE SECTION */}
                          {/* Mobile: Right Side (Order Last), Fixed Size. Desktop: Top (Order First), Full Width */}
                          <div className={`
                             relative shrink-0 
                             order-2 md:order-1
                             w-28 h-28 md:w-full md:aspect-[4/3] md:h-auto
                             rounded-xl md:rounded-none md:rounded-t-xl overflow-hidden
                             ${isDark ? 'bg-slate-800' : 'bg-slate-100'}
                          `}>
                              {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                  />
                              ) : (
                                  <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                                      <ShoppingBag size={20} className="mb-1 opacity-50" />
                                      <span className="text-[8px] font-bold uppercase opacity-50">No Img</span>
                                  </div>
                              )}
                              
                              {/* Desktop Hover Overlay */}
                              <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
                              
                              {/* Desktop Plus Icon */}
                              <div className="hidden md:block absolute bottom-2 right-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
                                <div className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg">
                                    <Plus size={14} strokeWidth={3} />
                                </div>
                              </div>
                          </div>

                          {/* 2. TEXT CONTENT */}
                          {/* Mobile: Left Side (Order First). Desktop: Bottom (Order Last) */}
                          <div className={`
                             flex flex-col flex-1 h-full justify-between 
                             order-1 md:order-2
                             md:p-4
                          `}>
                              <div>
                                  {/* Top Row: Category (Veg/Non-Veg style) */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isDark ? 'border-emerald-500/50' : 'border-emerald-600'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-600'}`}></div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide truncate max-w-[100px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                        {item.category}
                                    </span>
                                  </div>

                                  <h3 className={`font-bold text-sm md:text-sm leading-tight mb-1 line-clamp-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                      {item.name}
                                  </h3>
                                  
                                  {/* Price Row */}
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className={`text-sm font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        ₹{item.price}
                                    </p>
                                    {qty > 0 && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {qty}x
                                        </span>
                                    )}
                                  </div>
                              </div>
                              
                              {/* Description (Mobile Only) */}
                              <p className={`md:hidden text-[10px] line-clamp-2 mt-2 leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                 High quality fresh ingredients prepared to perfection.
                              </p>
                          </div>
                      </button>
                  );
              })}
          </div>
      )}
  </div>
        </div>

        {/* 🔹 MOBILE FLOATING BAR */}
        {/* {!isMobileCartOpen && (
          <div
            className={`md:hidden fixed bottom-0 left-0 right-0 ${
              isDark
                ? "bg-dark-card border-dark-border"
                : "bg-white border-slate-200"
            } border-t px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40 flex items-center justify-between`}
            onClick={() => setIsMobileCartOpen(true)}
          >
            <div>
              <p
                className={`text-[9px] ${
                  isDark ? "text-slate-500" : "text-slate-400"
                } font-bold uppercase tracking-wider`}
              >
                Total ({totalItems} items)
              </p>
              <p
                className={`text-xl font-black ${
                  isDark ? "text-white" : "text-slate-800"
                }`}
              >
                ₹{cartTotal}
              </p>
            </div>
            <button className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">
              View Bill
            </button>
          </div>
        )} */}

        {!isMobileCartOpen && cart.length > 0 && (
          <div 
            className={`md:hidden fixed bottom-4 left-4 right-4 ${isDark ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-900 border-slate-800'} border p-3 rounded-2xl shadow-2xl z-40 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all`} 
            onClick={() => setIsMobileCartOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isDark ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                {totalItems}
              </div>
              <div>
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Total Bill</p>
                <p className="text-lg font-black text-white">₹{cartTotal}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
              View Bill <ChevronUp size={14} />
            </div>
          </div>
        )}

        {/* 🔹 RIGHT: CART PANEL */}
        {/* <div
          className={`fixed inset-0 z-50 ${
            isDark ? "bg-dark-card" : "bg-white"
          } flex flex-col transition-transform duration-300 ease-out md:static md:w-96 md:rounded-2xl md:border ${
            isDark ? "md:border-dark-border" : "md:border-slate-200"
          } md:shadow-xl md:translate-y-0 ${
            isMobileCartOpen
              ? "translate-y-0"
              : "translate-y-full md:translate-y-0"
          }`}
        >
          <div
            className={`md:hidden p-3 border-b ${
              isDark
                ? "border-dark-border bg-dark-card"
                : "border-slate-100 bg-white"
            } flex items-center justify-between shadow-sm z-10`}
          >
            <h2
              className={`font-bold text-base ${
                isDark ? "text-white" : "text-slate-800"
              }`}
            >
              Current Bill
            </h2>
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className={`p-1.5 ${
                isDark
                  ? "bg-dark-surface text-slate-400"
                  : "bg-slate-100 text-slate-500"
              } rounded-full`}
            >
              <X size={18} />
            </button>
          </div>

          <div
            className={`p-3 ${
              isDark
                ? "bg-dark-surface border-dark-border"
                : "bg-slate-50 border-slate-100"
            } border-b shrink-0`}
          >
            <h3
              className={`text-[10px] font-bold ${
                isDark ? "text-slate-500" : "text-slate-400"
              } uppercase mb-2 flex items-center gap-1`}
            >
              <Zap size={10} className="text-amber-500" /> Quick Add (Manual)
            </h3>
            <form onSubmit={addManualItem} className="flex gap-2">
              <input
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  isDark
                    ? "bg-dark-card border-dark-border text-white placeholder-slate-500"
                    : "border-slate-200"
                } text-xs outline-none focus:border-emerald-500 w-full`}
                placeholder="Item Name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
              <input
                className={`w-16 px-2 py-2 rounded-lg border ${
                  isDark
                    ? "bg-dark-card border-dark-border text-white placeholder-slate-500"
                    : "border-slate-200"
                } text-xs outline-none focus:border-emerald-500`}
                type="number"
                placeholder="₹"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
              />
              <button
                type="submit"
                className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors"
              >
                <Plus size={14} />
              </button>
            </form>
          </div>

          <div
            className={`flex-1 overflow-y-auto p-3 space-y-2 ${
              isDark ? "bg-dark-card" : "bg-white"
            }`}
          >
            {cart.length === 0 ? (
              <div
                className={`h-full flex flex-col items-center justify-center ${
                  isDark ? "text-slate-500" : "text-slate-400"
                } opacity-60`}
              >
                <ShoppingBag size={28} className="mb-2" />
                <p className="text-xs">Cart is empty.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                    item.isManual
                      ? isDark
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-amber-50/50 border-amber-100"
                      : isDark
                      ? "bg-dark-surface border-dark-border"
                      : "bg-white border-slate-100 shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div
                        className={`font-bold ${
                          isDark ? "text-slate-200" : "text-slate-700"
                        } text-xs`}
                      >
                        {item.name}
                      </div>
                      {item.isManual && (
                        <span
                          className={`text-[8px] font-bold uppercase px-1 rounded ml-1 ${
                            isDark
                              ? "text-amber-400 bg-amber-500/20"
                              : "text-amber-600 bg-amber-100"
                          }`}
                        >
                          Manual
                        </span>
                      )}
                    </div>
                    <div
                      className={`font-bold ${
                        isDark ? "text-white" : "text-slate-900"
                      } text-sm`}
                    >
                      ₹{item.price * item.quantity}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div
                      className={`text-[10px] ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      } font-medium`}
                    >
                      ₹{item.price}/unit
                    </div>

                    <div
                      className={`flex items-center ${
                        isDark
                          ? "bg-dark-card border-dark-border"
                          : "bg-slate-50 border-slate-200"
                      } border rounded-lg h-7`}
                    >
                      <button
                        onClick={() =>
                          item.quantity === 1
                            ? removeFromCart(item.id)
                            : updateQuantity(item.id, -1)
                        }
                        className={`w-7 h-full flex items-center justify-center rounded-l-lg transition-colors ${
                          item.quantity === 1
                            ? "text-red-500 hover:bg-red-500/10"
                            : isDark
                            ? "text-slate-400 hover:bg-dark-surface"
                            : "text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {item.quantity === 1 ? (
                          <Trash2 size={12} />
                        ) : (
                          <Minus size={12} />
                        )}
                      </button>

                      <span
                        className={`w-6 text-center text-xs font-bold ${
                          isDark ? "text-white" : "text-slate-800"
                        }`}
                      >
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className={`w-7 h-full flex items-center justify-center ${
                          isDark
                            ? "hover:bg-emerald-500/20"
                            : "hover:bg-emerald-100"
                        } text-emerald-500 rounded-r-lg transition-colors`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            className={`border-t ${
              isDark
                ? "border-dark-border bg-dark-surface"
                : "border-slate-100 bg-slate-50"
            } p-3 shrink-0`}
          >
            <div className="flex justify-between items-end mb-3">
              <span
                className={`${
                  isDark ? "text-slate-400" : "text-slate-500"
                } font-bold text-xs`}
              >
                Total Amount
              </span>
              <span
                className={`text-2xl font-black ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                ₹{cartTotal}
              </span>
            </div>
            <button
              onClick={handleGenerateQR}
              disabled={cart.length === 0}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2 text-sm"
            >
              <QrCode size={16} /> Generate QR
            </button>
          </div>
        </div>*/}

        <div className={`fixed inset-0 z-50 ${isDark ? 'bg-dark-card' : 'bg-white'} flex flex-col transition-transform duration-300 ease-out md:static md:w-96 md:rounded-2xl md:border ${isDark ? 'md:border-dark-border' : 'md:border-slate-200'} md:shadow-xl md:translate-y-0 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
          
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between shadow-sm z-10 ${isDark ? 'border-dark-border bg-dark-card' : 'border-slate-100 bg-white'}`}>
            <div>
              <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>Current Bill</h2>
              
            </div>
            <button 
              onClick={() => setIsMobileCartOpen(false)} 
              className={`md:hidden p-2 rounded-full transition-colors ${isDark ? 'bg-dark-surface text-slate-400' : 'bg-slate-100 text-slate-500'}`}
            >
              <ChevronDown size={20} />
            </button>
          </div>
          
          {/* Quick Add (Manual) - Sleek Input Group */}
          <div className={`p-4 ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-slate-50/80 border-slate-100'} border-b shrink-0 space-y-2`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider flex items-center gap-1.5`}>
                  <Zap size={10} className="text-amber-500 fill-amber-500"/> Quick Add
                </h3>
              </div>
              <form onSubmit={addManualItem} className="flex gap-2">
                <input 
                  className={`flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${isDark ? 'bg-dark-card border-dark-border text-white placeholder-slate-600 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-500 shadow-sm'}`} 
                  placeholder="Item Name (e.g. Extra Roti)" 
                  value={manualName} 
                  onChange={(e) => setManualName(e.target.value)} 
                />
                <div className="relative w-20">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>₹</span>
                  <input 
                    className={`w-full pl-6 pr-2 py-2.5 rounded-xl border text-sm outline-none transition-all font-bold ${isDark ? 'bg-dark-card border-dark-border text-white focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-500 shadow-sm'}`} 
                    type="number" 
                    placeholder="0" 
                    value={manualPrice} 
                    onChange={(e) => setManualPrice(e.target.value)} 
                  />
                </div>
                <button 
                  type="submit" 
                  className="bg-slate-800 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg active:scale-95"
                >
                  <Plus size={18} />
                </button>
              </form>
          </div>

          {/* Cart Items List - Professional POS Ticket Style */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isDark ? 'bg-dark-card' : 'bg-white'}`}>
            {cart.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-600' : 'text-slate-400'} opacity-60`}>
                <div className={`p-4 rounded-full mb-3 ${isDark ? 'bg-dark-surface' : 'bg-slate-50'}`}>
                  <ShoppingBag size={28} />
                </div>
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs opacity-70 mt-1">Add items from the menu</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div 
                  key={`${item.id}-${index}`} 
                  className={`group relative rounded-2xl border shadow-sm transition-all ${
                    item.isManual 
                    ? isDark ? 'border-amber-500/30 bg-amber-900/5' : 'border-amber-200 bg-amber-50/40' 
                    : isDark ? 'border-dark-border bg-dark-surface' : 'border-slate-200 bg-white hover:border-emerald-400/50'
                  }`}
                >
                  {/* --- TOP ROW: Info & Total --- */}
                  <div className="px-4 pt-3 flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold text-sm leading-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {item.name}
                          </h4>
                          {item.isManual && (
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isDark ? 'text-amber-400 bg-amber-500/10' : 'text-amber-700 bg-amber-100'}`}>
                              Manual
                            </span>
                          )}
                        </div>
                        {/* Unit Price Label (Subtle) */}
                        {/* <div className={`text-[10px] mt-0.5 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                           Unit Price: ₹{item.price}
                        </div> */}
                      </div>

                      {/* Line Total Display */}
                      <div className={`text-right`}>
                        <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          ₹{item.price * item.quantity}
                        </div>
                      </div>
                  </div>

                  {/* --- BOTTOM ROW: Controls --- */}
                  <div className="p-3 mt-1 flex items-center justify-between gap-3">
                      
                      {/* LEFT: Professional Rate Input Group */}
                      <div className="flex-1 max-w-[140px]">
                        {/* <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ml-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Unit Rate
                        </label> */}
                        <div className={`relative flex items-center h-10 w-full rounded-xl border overflow-hidden transition-all ${
                            isDark 
                            ? 'bg-black/20 border-white/10 focus-within:border-emerald-500/50 focus-within:bg-black/40' 
                            : 'bg-slate-50 border-slate-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-sm'
                        }`}>
                            {/* Fixed Currency Symbol Box */}
                            <div className={`flex items-center justify-center w-10 h-full border-r ${isDark ? 'border-white/5 bg-white/5' : 'border-slate-200 bg-slate-100'}`}>
                                <span className={`text-sm font-bold ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>₹</span>
                            </div>
                            
                            {/* The Input Field */}
                            <input 
                                type="number"
                                // FIX 1: If price is 0, show empty string. This prevents the "05" issue.
                                value={item.price === 0 ? '' : item.price}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // FIX 2: If empty, set state to 0 (for math), otherwise parse the number
                                    const newPrice = val === '' ? 0 : parseFloat(val);
                                    setCart(prev => prev.map(p => p.id === item.id ? { ...p, price: newPrice } : p));
                                }}
                                className={`w-full h-full px-3 outline-none text-sm font-bold bg-transparent ${isDark ? 'text-white' : 'text-slate-800'}`}
                                placeholder="0"
                            />
                        </div>
                      </div>

                      {/* RIGHT: Quantity Stepper (Pill Style) */}
                      <div className={`flex items-center h-10 p-1 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                          {/* Minus */}
                          <button 
                              onClick={() => item.quantity === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)} 
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                                  item.quantity === 1 
                                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' 
                                      : isDark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-white text-slate-600 shadow-sm hover:scale-105' 
                              }`}
                          >
                              {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} strokeWidth={2.5} />}
                          </button>
                          
                          {/* Count */}
                          <div className={`w-8 text-center text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {item.quantity}
                          </div>
                          
                          {/* Plus */}
                          <button 
                              onClick={() => updateQuantity(item.id, 1)} 
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all shadow-sm active:scale-95 ${
                                isDark ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-white text-emerald-600 hover:text-emerald-700'
                              }`}
                          >
                              <Plus size={14} strokeWidth={2.5} />
                          </button>
                      </div>

                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Totals with Discount */}
          <div className={`border-t ${isDark ? 'border-dark-border bg-dark-surface' : 'border-slate-100 bg-slate-50'} p-4 shrink-0 space-y-4`}>
            
            <div className="space-y-2">
              {/* Subtotal */}
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Subtotal</span>
                <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>₹{cartTotal}</span>
              </div>

              {/* Discount Input */}
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Discount</span>
                <div className="flex items-center gap-1">
                    <span className="text-red-500 font-bold text-xs">- ₹</span>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className={`w-16 py-1 px-2 rounded-md text-right text-xs font-bold outline-none border transition-all ${
                        isDark 
                          ? 'bg-dark-card border-dark-border text-red-400 focus:border-red-500' 
                          : 'bg-white border-slate-200 text-red-600 focus:border-red-500'
                      }`}
                    />
                </div>
              </div>

              {/* Final Total */}
              <div className="flex justify-between items-end pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Total Payable</span>
                <span className={`text-2xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ₹{Math.max(0, cartTotal - discount)}
                </span>
              </div>
            </div>

            {/* 🆕 UPI PAYMENT BUTTON (Primary - Bank-grade UPI flow) */}
            <button 
              onClick={handleGenerateUpiQR} 
              disabled={cart.length === 0 || upiLoading} 
              className={`w-full py-4 rounded-xl font-bold shadow-xl flex justify-center items-center gap-2 text-sm transition-transform active:scale-[0.98] mb-2 ${
                upiSettings?.isConfigured
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20'
                  : isDark 
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={!upiSettings?.isConfigured ? "Configure UPI ID in settings" : ""}
            >
              {upiLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Smartphone size={18} /> 
                  Pay via UPI (₹{Math.max(0, cartTotal - discount)})
                </>
              )}
            </button>
            
            {/* UPI Status Badge */}
            {!upiLoading && (
              <div className={`text-[10px] text-center mb-3 flex items-center justify-center gap-1 ${
                upiSettings?.isConfigured 
                  ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                  : isDark ? 'text-amber-400' : 'text-amber-600'
              }`}>
                {upiSettings?.isConfigured ? (
                  <>
                    <CheckCircle size={10} />
                    UPI: {upiSettings.upiId}
                  </>
                ) : (
                  <>
                    <AlertCircle size={10} />
                    <button 
                      onClick={() => navigate('/merchant/profile')}
                      className="underline hover:no-underline"
                    >
                      Configure UPI ID →
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Legacy QR Button (for receipt sharing) */}
            <button 
              onClick={handleGenerateQR} 
              disabled={cart.length === 0} 
              className={`w-full py-3 rounded-xl font-medium flex justify-center items-center gap-2 text-xs transition-transform active:scale-[0.98] ${
                isDark 
                  ? 'bg-dark-surface border border-dark-border text-slate-300 hover:bg-dark-hover' 
                  : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <QrCode size={14} /> 
              Receipt QR (Old Flow)
            </button>
          </div>
        </div>
      </div> 

      {/* 📸 QR MODAL */}
      {showQr && (
        <div className="fixed inset-0 bg-black/90 md:bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div
            className={`${
              isDark ? "bg-dark-card" : "bg-white"
            } rounded-3xl p-6 max-w-sm w-full text-center animate-[popIn_0.2s_ease-out]`}
          >
            <div className="flex justify-end">
              <button
                onClick={handleCloseQr}
                className={`p-2 ${
                  isDark
                    ? "bg-dark-surface hover:bg-dark-hover"
                    : "bg-slate-100 hover:bg-slate-200"
                } rounded-full`}
              >
                <X size={18} className={isDark ? "text-slate-400" : ""} />
              </button>
            </div>

            <h2
              className={`text-xl font-bold ${
                isDark ? "text-white" : "text-slate-800"
              } mb-1`}
            >
              Scan to Save Bill
            </h2>
            <p
              className={`text-[10px] ${
                isDark ? "text-slate-500" : "text-slate-500"
              } mb-4`}
            >
              Customer can scan this to get the receipt instantly.
            </p>

            <div
              className={`bg-white p-2 rounded-xl inline-block mb-4 border ${
                isDark ? "border-dark-border" : "border-slate-200"
              } shadow-xl`}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Receipt QR"
                  className="w-48 h-48 rounded-lg"
                />
              ) : (
                <div
                  className={`w-48 h-48 ${
                    isDark ? "bg-dark-surface" : "bg-slate-100"
                  } flex items-center justify-center text-slate-400`}
                >
                  Loading...
                </div>
              )}
            </div>

            <div className="flex flex-col items-center mb-2">
              {/* Final Amount */}
              <div className="text-3xl font-black text-emerald-500">
                ₹{Math.max(0, cartTotal - discount)}
              </div>
            </div>
            <div
              className={`text-[10px] ${
                isDark ? "text-slate-500" : "text-slate-400"
              } font-mono mb-6 ${
                isDark ? "bg-dark-surface" : "bg-slate-50"
              } p-2 rounded truncate max-w-[200px] mx-auto`}
            >
              ID: {generatedBill?.id}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => handlePaymentReceived("upi")}
                className="py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Smartphone size={18} />
                <span className="text-[10px]">Paid via UPI</span>
              </button>

              <button
                onClick={() => handlePaymentReceived("cash")}
                className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Banknote size={18} />
                <span className="text-[10px]">Paid via Cash</span>
              </button>
            </div>

            {/* Mark as Pending (Khata) Button */}
            <button
              onClick={handleMarkAsPending}
              disabled={!customerScanned || pendingLoading}
              className={`w-full mt-3 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                !customerScanned
                  ? isDark
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : isDark 
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30" 
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              {pendingLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : customerScanned ? (
                <>
                  <Wallet size={18} />
                  <span className="text-xs">Mark as Pending ({scannedCustomerName})</span>
                </>
              ) : (
                <>
                  <Clock size={18} />
                  <span className="text-xs">Waiting for customer scan...</span>
                </>
              )}
            </button>

            {customerScanned && (
              <p className={`text-[10px] text-center mt-2 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                ✓ {scannedCustomerName} scanned the QR
              </p>
            )}

            {customerScanned && scannedCustomerIntent && (
              <p className={`text-[10px] text-center mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Customer selected: {scannedCustomerIntent === "khata" ? "Khata (Pending)" : scannedCustomerIntent.toUpperCase()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 🆕 UPI PAYMENT QR MODAL - Bank-grade Merchant-Confirmed Flow */}
      {showUpiQr && posBill && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
          <div
            className={`${
              isDark ? "bg-dark-card" : "bg-white"
            } rounded-3xl p-6 max-w-sm w-full text-center animate-[popIn_0.2s_ease-out] shadow-2xl`}
          >
            {/* Header with close button */}
            <div className="flex justify-between items-start mb-4">
              <div className="text-left">
                <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  UPI Payment
                </h2>
                <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  Customer scans → pays → you confirm
                </p>
              </div>
              <button
                onClick={handleCloseUpiQr}
                className={`p-2 ${
                  isDark ? "bg-dark-surface hover:bg-dark-hover" : "bg-slate-100 hover:bg-slate-200"
                } rounded-full transition-colors`}
              >
                <X size={18} className={isDark ? "text-slate-400" : ""} />
              </button>
            </div>

            {/* Expiry Timer */}
            <div className={`flex items-center justify-center gap-2 mb-4 px-4 py-2 rounded-full ${
              expiryCountdown < 60 
                ? 'bg-red-500/10 text-red-500' 
                : expiryCountdown < 180 
                  ? 'bg-amber-500/10 text-amber-500'
                  : isDark ? 'bg-dark-surface text-slate-400' : 'bg-slate-100 text-slate-600'
            }`}>
              <Clock size={14} />
              <span className="text-xs font-bold">
                Expires in {Math.floor(expiryCountdown / 60)}:{String(expiryCountdown % 60).padStart(2, '0')}
              </span>
            </div>

            {/* QR Code - Opens UPI App directly */}
            <div className={`relative bg-white p-3 rounded-2xl inline-block mb-4 border-2 ${
              isDark ? "border-purple-500/30" : "border-purple-200"
            } shadow-lg`}>
              {upiQrUrl ? (
                <img
                  src={upiQrUrl}
                  alt="UPI Payment QR"
                  className="w-56 h-56 rounded-xl"
                />
              ) : (
                <div className={`w-56 h-56 ${isDark ? "bg-dark-surface" : "bg-slate-100"} flex items-center justify-center rounded-xl`}>
                  <Loader2 size={24} className="animate-spin text-purple-500" />
                </div>
              )}
              
              {/* UPI Badge */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                SCAN WITH ANY UPI APP
              </div>
            </div>

            {/* Amount Display */}
            <div className="mb-4">
              <div className={`text-4xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                ₹{posBill.bill.total}
              </div>
              <div className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"} mt-1`}>
                Pay to: <span className="font-medium">{posBill.upi.payeeName}</span>
              </div>
            </div>

            {/* Bill Reference */}
            <div className={`${isDark ? "bg-dark-surface" : "bg-slate-50"} rounded-xl p-3 mb-5`}>
              <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"} uppercase tracking-wider mb-1`}>
                Transaction Note (Check in UPI App)
              </div>
              <div className={`font-mono font-bold ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                {posBill.bill.upiNote}
              </div>
            </div>

            {/* Instructions */}
            <div className={`text-left ${isDark ? "bg-dark-surface/50" : "bg-amber-50"} rounded-xl p-3 mb-5 text-[11px]`}>
              <div className={`font-bold mb-2 ${isDark ? "text-amber-400" : "text-amber-700"}`}>
                ⚠️ Important Steps:
              </div>
              <ol className={`list-decimal list-inside space-y-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                <li>Customer scans QR with GPay/PhonePe</li>
                <li>Customer completes payment</li>
                <li>Check your UPI app for <span className="font-bold">₹{posBill.bill.total}</span></li>
                <li>Match note: <span className="font-mono font-bold text-purple-500">{posBill.bill.upiNote}</span></li>
                <li>Click confirm below only after receiving</li>
              </ol>
            </div>

            {/* Confirm Payment Button - THE ONLY SOURCE OF TRUTH */}
            <button
              onClick={handleConfirmUpiPayment}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-green-700 shadow-xl shadow-emerald-500/30 flex justify-center items-center gap-2 transition-all active:scale-[0.98]"
            >
              <CheckCircle size={20} />
              I RECEIVED ₹{posBill.bill.total}
            </button>

            <p className={`text-[9px] mt-3 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
              Only confirm after verifying payment in your UPI app
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantBilling;
