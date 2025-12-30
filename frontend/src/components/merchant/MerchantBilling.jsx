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

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, QrCode, X, Plus, Minus, Trash2, Search, Zap, CheckCircle, Banknote, Smartphone, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { createReceipt, markReceiptPaid } from '../../services/api';
import { getTodayIST, formatISTDisplay, getNowIST } from '../../utils/timezone';
import { useTheme } from '../../contexts/ThemeContext';

const MerchantBilling = ({ inventory }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // 🛒 Cart & UI State
  const [cart, setCart] = useState([]);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(""); 
  const [generatedBill, setGeneratedBill] = useState(null); 

  // 🔍 Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // ⚡ Manual Item State
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState(1);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Load Merchant Profile
  const merchantProfile = JSON.parse(localStorage.getItem('merchantProfile')) || { 
    shopName: "GreenReceipt Shop", 
    merchantId: "GR-DEMO" 
  };

  // Calculations
  const cartTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const categories = ["All", ...new Set(inventory.map(i => i.category || "General"))];

  // Search Logic
  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || (item.category || "General") === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  // ——— ACTIONS ———

  const handleBack = () => {
    if (cart.length > 0) {
      if (window.confirm("Discard current bill? All items will be lost.")) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
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
      isManual: true
    };
    setCart(prev => [...prev, newItem]);
    setManualName("");
    setManualPrice("");
    setManualQty(1);
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) return { ...item, quantity: Math.max(1, item.quantity + delta) };
      return item;
    }));
  };

  const removeFromCart = (itemId) => setCart(prev => prev.filter(item => item.id !== itemId));

  // 🚀 GENERATE QR (no server write until payment is confirmed)
  const handleGenerateQR = () => {
    if (cart.length === 0) return;

    const baseBill = {
      merchant: merchantProfile.shopName,
      mid: merchantProfile.merchantId,
      date: getTodayIST(), 
      time: formatISTDisplay(getNowIST(), { hour: '2-digit', minute: '2-digit', hour12: true }),
      total: cartTotal,
      items: cart.map(item => ({
        n: item.name, 
        q: item.quantity,
        p: item.price
      })),
      footer: merchantProfile.receiptFooter || "Thank you!"
    };

    // Use a local temp id for the QR; we persist only after payment
    const tempId = `GR-${Date.now().toString().slice(-6)}`;
    const billData = { ...baseBill, id: tempId, rid: tempId };
    setGeneratedBill(billData);

    const jsonString = JSON.stringify(billData);
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(jsonString)}`;
    setQrDataUrl(apiUrl);
    setShowQr(true);
  };

  const handleCloseQr = () => {
    setShowQr(false);
    setGeneratedBill(null);
    setQrDataUrl("");
  };

  // 💾 SAVE THE SALE (persist + mark paid only after payment confirmation)
  const handlePaymentReceived = async (method) => {
    if (!generatedBill) return;

    try {
      const payload = {
        items: cart.map(item => ({ name: item.name, unitPrice: item.price, quantity: item.quantity })),
        source: 'qr',
        paymentMethod: method,
        transactionDate: getNowIST().toISOString(),
        total: cartTotal,
        footer: merchantProfile.receiptFooter,
        status: 'pending',
      };

      // Create receipt only now (prevents orphan receipts when modal is closed)
      const { data: created } = await createReceipt(payload);
      const persistedId = created.id || created._id;

      // Mark as paid to capture paidAt timestamp and final status
      const { data: updated } = await markReceiptPaid(persistedId, method);

      const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];
      const merged = [updated, ...currentSales.filter(r => r.id !== persistedId && r._id !== persistedId)];
      localStorage.setItem('merchantSales', JSON.stringify(merged));

      window.dispatchEvent(new Event('customer-receipts-updated'));
      window.dispatchEvent(new Event('merchantStorage'));
    } catch (err) {
      console.error(err);
      const currentSales = JSON.parse(localStorage.getItem('merchantSales')) || [];

      const fallbackId = generatedBill.rid || generatedBill.id || `GR-${Date.now().toString().slice(-6)}`;
      const newSale = {
        ...generatedBill,
        id: fallbackId,
        rid: fallbackId,
        total: cartTotal,
        status: 'completed',
        paymentMethod: method,
      };

      const merged = [newSale, ...currentSales.filter(r => r.id !== fallbackId && r._id !== fallbackId)];
      localStorage.setItem('merchantSales', JSON.stringify(merged));
      window.dispatchEvent(new Event('merchantStorage'));
    }

    setShowQr(false);
    setGeneratedBill(null);
    setQrDataUrl("");
    setCart([]);
    setIsMobileCartOpen(false);

    const methodText = method === 'upi' ? "UPI" : "Cash";
    toast.success(`Payment Received via ${methodText}!`);
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-dark-bg' : 'bg-slate-50'} animate-fade-in relative`}>
      
      {/* 🔹 STICKY TOP BAR (Mobile Only) */}
      <div className={`sticky top-0 z-30 ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-slate-200'} border-b px-4 h-14 flex items-center justify-between shrink-0 shadow-sm md:hidden`}>
        <button 
          onClick={handleBack}
          className={`p-2 -ml-2 ${isDark ? 'text-slate-400 hover:bg-dark-surface' : 'text-slate-600 hover:bg-slate-100'} rounded-full transition-colors active:scale-95`}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'} tracking-tight`}>New Bill</h1>
        <div className="w-10"></div> 
      </div>

      <div className="flex-1 flex flex-col md:flex-row md:gap-6 overflow-hidden p-0 md:p-4">
        
        {/* 🔹 LEFT: ITEMS GRID */}
        <div className={`flex-1 ${isDark ? 'bg-dark-card md:border-dark-border' : 'bg-white md:border-slate-100'} md:rounded-2xl md:border flex flex-col overflow-hidden md:shadow-sm`}>
          {/* Header Section */}
          <div className={`p-3 md:p-4 border-b ${isDark ? 'border-dark-border bg-dark-card' : 'border-slate-100 bg-white'} z-10 space-y-3 shadow-sm md:shadow-none`}>
              <div className="relative">
                  <Search className={`absolute left-3 top-2.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                  <input type="text" placeholder="Search..." className={`w-full ${isDark ? 'bg-dark-surface border-dark-border text-white placeholder-slate-500' : 'bg-slate-100 border-none'} rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : isDark 
                          ? 'bg-dark-surface text-slate-400 border-dark-border hover:bg-dark-hover' 
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
                  ))}
              </div>
          </div>
          
          <div className={`flex-1 overflow-y-auto p-3 md:p-4 pb-32 md:pb-4 ${isDark ? 'bg-dark-bg md:bg-dark-card' : 'bg-slate-50 md:bg-white'}`}>
              {filteredItems.length === 0 ? <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'} opacity-60`}><Search size={32} className="mb-2"/><p>No items found.</p></div> : 
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                      {filteredItems.map(item => (
                          <button 
                            key={item.id} 
                            onClick={() => addToCart(item)} 
                            className={`
                               ${isDark ? 'bg-dark-surface border-dark-border hover:border-emerald-500/50' : 'bg-white border-slate-200'} border shadow-sm active:scale-95 transition-all text-left flex flex-col justify-between relative overflow-hidden group
                               rounded-xl
                               h-20 md:h-28       
                               p-2 md:p-3
                            `}
                          >
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white rounded-full p-0.5 md:p-1">
                                <Plus size={12} className="md:w-4 md:h-4" />
                              </div>
                              
                              <div>
                                <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'} text-xs md:text-sm leading-tight line-clamp-2`}>{item.name}</div>
                                <div className={`text-[9px] md:text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} font-bold uppercase mt-0.5 tracking-wide`}>{item.category}</div>
                              </div>
                              <div className="text-xs md:text-base font-black text-emerald-500">₹{item.price}</div>
                          </button>
                      ))}
                  </div>
              }
          </div>
        </div>

        {/* 🔹 MOBILE FLOATING BAR */}
        {!isMobileCartOpen && (
          <div className={`md:hidden fixed bottom-0 left-0 right-0 ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-slate-200'} border-t px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40 flex items-center justify-between`} onClick={() => setIsMobileCartOpen(true)}>
            <div>
              <p className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'} font-bold uppercase tracking-wider`}>Total ({totalItems} items)</p>
              <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>₹{cartTotal}</p>
            </div>
            <button className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">
              View Bill
            </button>
          </div>
        )}

        {/* 🔹 RIGHT: CART PANEL */}
        <div className={`fixed inset-0 z-50 ${isDark ? 'bg-dark-card' : 'bg-white'} flex flex-col transition-transform duration-300 ease-out md:static md:w-96 md:rounded-2xl md:border ${isDark ? 'md:border-dark-border' : 'md:border-slate-200'} md:shadow-xl md:translate-y-0 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
          <div className={`md:hidden p-3 border-b ${isDark ? 'border-dark-border bg-dark-card' : 'border-slate-100 bg-white'} flex items-center justify-between shadow-sm z-10`}>
            <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>Current Bill</h2>
            <button onClick={() => setIsMobileCartOpen(false)} className={`p-1.5 ${isDark ? 'bg-dark-surface text-slate-400' : 'bg-slate-100 text-slate-500'} rounded-full`}><X size={18} /></button>
          </div>
          
          <div className={`p-3 ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-slate-50 border-slate-100'} border-b shrink-0`}>
              <h3 className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase mb-2 flex items-center gap-1`}><Zap size={10} className="text-amber-500"/> Quick Add (Manual)</h3>
              <form onSubmit={addManualItem} className="flex gap-2">
                <input className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'bg-dark-card border-dark-border text-white placeholder-slate-500' : 'border-slate-200'} text-xs outline-none focus:border-emerald-500 w-full`} placeholder="Item Name" value={manualName} onChange={(e) => setManualName(e.target.value)} />
                <input className={`w-16 px-2 py-2 rounded-lg border ${isDark ? 'bg-dark-card border-dark-border text-white placeholder-slate-500' : 'border-slate-200'} text-xs outline-none focus:border-emerald-500`} type="number" placeholder="₹" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />
                <button type="submit" className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors"><Plus size={14} /></button>
              </form>
          </div>

          <div className={`flex-1 overflow-y-auto p-3 space-y-2 ${isDark ? 'bg-dark-card' : 'bg-white'}`}>
            {cart.length === 0 ? <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'} opacity-60`}><ShoppingBag size={28} className="mb-2" /><p className="text-xs">Cart is empty.</p></div> : 
              cart.map(item => (
                <div key={item.id} className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${item.isManual 
                  ? isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50/50 border-amber-100' 
                  : isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start">
                      <div>
                          <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'} text-xs`}>{item.name}</div>
                          {item.isManual && <span className={`text-[8px] font-bold uppercase px-1 rounded ml-1 ${isDark ? 'text-amber-400 bg-amber-500/20' : 'text-amber-600 bg-amber-100'}`}>Manual</span>}
                      </div>
                      <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-sm`}>₹{item.price * item.quantity}</div>
                  </div>

                  <div className="flex justify-between items-center">
                      <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} font-medium`}>₹{item.price}/unit</div>
                      
                      <div className={`flex items-center ${isDark ? 'bg-dark-card border-dark-border' : 'bg-slate-50 border-slate-200'} border rounded-lg h-7`}>
                          <button 
                              onClick={() => item.quantity === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)} 
                              className={`w-7 h-full flex items-center justify-center rounded-l-lg transition-colors ${
                                  item.quantity === 1 
                                      ? 'text-red-500 hover:bg-red-500/10' 
                                      : isDark ? 'text-slate-400 hover:bg-dark-surface' : 'text-slate-500 hover:bg-slate-200' 
                              }`}
                          >
                              {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                          </button>
                          
                          <span className={`w-6 text-center text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.quantity}</span>
                          
                          <button 
                              onClick={() => updateQuantity(item.id, 1)} 
                              className={`w-7 h-full flex items-center justify-center ${isDark ? 'hover:bg-emerald-500/20' : 'hover:bg-emerald-100'} text-emerald-500 rounded-r-lg transition-colors`}
                          >
                              <Plus size={12} />
                          </button>
                      </div>
                  </div>
                </div>
              ))
            }
          </div>

          <div className={`border-t ${isDark ? 'border-dark-border bg-dark-surface' : 'border-slate-100 bg-slate-50'} p-3 shrink-0`}>
            <div className="flex justify-between items-end mb-3"><span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-bold text-xs`}>Total Amount</span><span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{cartTotal}</span></div>
            <button onClick={handleGenerateQR} disabled={cart.length === 0} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2 text-sm"><QrCode size={16} /> Generate QR</button>
          </div>
        </div>

      </div>

      {/* 📸 QR MODAL */}
      {showQr && (
        <div className="fixed inset-0 bg-black/90 md:bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`${isDark ? 'bg-dark-card' : 'bg-white'} rounded-3xl p-6 max-w-sm w-full text-center animate-[popIn_0.2s_ease-out]`}>
            <div className="flex justify-end"><button onClick={handleCloseQr} className={`p-2 ${isDark ? 'bg-dark-surface hover:bg-dark-hover' : 'bg-slate-100 hover:bg-slate-200'} rounded-full`}><X size={18} className={isDark ? 'text-slate-400' : ''} /></button></div>
            
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'} mb-1`}>Scan to Save Bill</h2>
            <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'} mb-4`}>Customer can scan this to get the receipt instantly.</p>
            
            <div className={`bg-white p-2 rounded-xl inline-block mb-4 border ${isDark ? 'border-dark-border' : 'border-slate-200'} shadow-xl`}>
                 {qrDataUrl ? <img src={qrDataUrl} alt="Receipt QR" className="w-48 h-48 rounded-lg" /> : <div className={`w-48 h-48 ${isDark ? 'bg-dark-surface' : 'bg-slate-100'} flex items-center justify-center text-slate-400`}>Loading...</div>}
            </div>

            <div className="text-3xl font-black text-emerald-500 mb-2">₹{cartTotal}</div>
            <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} font-mono mb-6 ${isDark ? 'bg-dark-surface' : 'bg-slate-50'} p-2 rounded truncate max-w-[200px] mx-auto`}>ID: {generatedBill?.id}</div>

            <div className="grid grid-cols-2 gap-3 mt-2">
                <button 
                    onClick={() => handlePaymentReceived('upi')} 
                    className="py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                    <Smartphone size={18} />
                    <span className="text-[10px]">Paid via UPI</span>
                </button>

                <button 
                    onClick={() => handlePaymentReceived('cash')} 
                    className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                    <Banknote size={18} />
                    <span className="text-[10px]">Paid via Cash</span>
                </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantBilling;