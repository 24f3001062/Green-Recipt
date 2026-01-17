import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Zap,
  QrCode,
  X,
  Loader2,
  Smartphone,
  Banknote,
  Clock,
  CheckCircle,
  Link as LinkIcon,
  ArrowLeft,
  ChevronDown,
  ShoppingBag
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createReceipt,
  createPOSBill,
  confirmPOSPayment,
  cancelPOSBill,
  fetchPublicBill,
} from "../../services/api"; // Ensure these paths match your project structure
import { useTheme } from "../../contexts/ThemeContext";

const MerchantBilling = ({ inventory, profile }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // --- STATE MANAGEMENT ---
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Manual Item State
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  
  // Billing State
  const [discount, setDiscount] = useState(0);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  // Payment Flow State
  const [posBill, setPosBill] = useState(null);
  const [showPaymentQr, setShowPaymentQr] = useState(false);
  const [paymentQrUrl, setPaymentQrUrl] = useState("");
  const [expiryCountdown, setExpiryCountdown] = useState(0);
  const [customerPaymentMethod, setCustomerPaymentMethod] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for cleanup
  const shouldClosePaymentQrRef = useRef(false);

  // --- DERIVED STATE ---
  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);
  const finalTotal = Math.max(0, cartTotal - discount);
  
  const categories = useMemo(() => ["All", ...new Set(inventory.map((i) => i.category || "General"))], [inventory]);
  
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || (item.category || "General") === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  // --- POLLING & TIMERS ---

  // Poll for Customer Action
  useEffect(() => {
    if (!showPaymentQr || !posBill?.bill?.id) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await fetchPublicBill(posBill.bill.id);
        
        // 1. Check if customer selected a method
        if (data.customerSelected && data.paymentMethod) {
          setCustomerPaymentMethod(data.paymentMethod);
          if (data.customerName || data.customerPhone) {
            setCustomerInfo({
              name: data.customerName || '',
              phone: data.customerPhone || ''
            });
          }
        }

        // 2. Handle Khata (Pending) Auto-Close
        if (data.status === 'PENDING' || data.paymentMethod === 'pending') {
          toast.success("Added to Khata! 📒", { duration: 4000 });
          shouldClosePaymentQrRef.current = true;
          handleSuccessCleanup();
        }

        // 3. Handle Expiry
        if (data.status === 'EXPIRED') {
          toast.error("Bill expired");
          handleClosePaymentQr();
        }
      } catch (err) {
        // Silent catch for polling errors
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [showPaymentQr, posBill]);

  // Expiry Timer
  useEffect(() => {
    if (!showPaymentQr || !posBill?.bill?.expiresAt) return;
    const expiryTime = new Date(posBill.bill.expiresAt).getTime();

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setExpiryCountdown(remaining);
      if (remaining <= 0) {
        toast.error("QR Code Expired");
        handleClosePaymentQr();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [showPaymentQr, posBill]);

  // --- HANDLERS ---

  const handleBack = () => {
    if (cart.length > 0) {
      if (window.confirm("Discard current bill?")) navigate(-1);
    } else {
      navigate(-1);
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      // Handle both MongoDB _id and string id
      const itemId = item._id || item.id;
      const exists = prev.find((i) => i.id === itemId);
      
      // Ensure we preserve the image URL when adding to cart
      const itemImage = item.imageUrl || item.image || item.img || item.photo;

      if (exists) {
        return prev.map((i) => i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, id: itemId, quantity: 1, imageUrl: itemImage }];
    });
  };

  const addManualItem = (e) => {
    e.preventDefault();
    if (!manualName || !manualPrice) return;
    const newItem = {
      id: `manual-${Date.now()}`,
      name: manualName,
      price: parseFloat(manualPrice),
      quantity: 1,
      isManual: true,
    };
    setCart((prev) => [...prev, newItem]);
    setManualName("");
    setManualPrice("");
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) => prev.map((item) => {
      if (item.id === itemId) return { ...item, quantity: Math.max(1, item.quantity + delta) };
      return item;
    }));
  };

  const removeFromCart = (itemId) => setCart((prev) => prev.filter((item) => item.id !== itemId));

  // --- API INTERACTIONS ---

  const handleGeneratePaymentQR = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      // 1. Create Receipt in DB (Pending) used for history
      const receiptPayload = {
        items: cart.map(i => ({ name: i.name, unitPrice: i.price, quantity: i.quantity })),
        source: "qr",
        paymentMethod: "other",
        transactionDate: new Date().toISOString(),
        total: finalTotal,
        subtotal: cartTotal,
        discount: discount,
        footer: profile?.receiptFooter,
        status: "pending",
      };
      
      await createReceipt(receiptPayload);

      // 2. Create POS Bill (The active session)
      const posPayload = {
        items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
        expiryMinutes: 10,
      };

      const { data } = await createPOSBill(posPayload);
      
      setPosBill(data);
      const paymentLink = `${window.location.origin}/pay/${data.bill.id}`;
      // Using qrserver API for reliable QR generation
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentLink)}`;
      
      setPaymentQrUrl(qrUrl);
      setShowPaymentQr(true);
      toast.success("QR Generated");

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to generate bill");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!posBill?.bill?.id) return;
    setIsProcessing(true);

    try {
      await confirmPOSPayment(posBill.bill.id);
      toast.success("Payment Confirmed & Receipt Sent!", { icon: "✅" });
      handleSuccessCleanup();
    } catch (err) {
      toast.error("Confirmation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessCleanup = () => {
    setShowPaymentQr(false);
    setPosBill(null);
    setCart([]);
    setDiscount(0);
    setCustomerPaymentMethod(null);
    setIsMobileCartOpen(false);
    window.dispatchEvent(new Event("merchant-receipts-updated"));
  };

  const handleClosePaymentQr = async () => {
    if (posBill?.bill?.id) {
      try { await cancelPOSBill(posBill.bill.id); } catch (e) { /* silent fail */ }
    }
    setShowPaymentQr(false);
    setPosBill(null);
    setCustomerPaymentMethod(null);
  };

  const copyPaymentLink = () => {
    if (!posBill?.bill?.id) return;
    const url = `${window.location.origin}/pay/${posBill.bill.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Payment link copied to clipboard!");
  };

  // --- RENDERERS ---

  return (
    <div className={`flex flex-col h-full ${isDark ? "bg-dark-bg" : "bg-slate-50"} relative pt-14 animate-fade-in`}>
      
      {/* Mobile Top Bar */}
      <div className={`fixed top-0 left-0 w-full z-30 ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-slate-200"} border-b px-4 h-14 flex items-center justify-between shrink-0 shadow-sm md:hidden`}>
        <button onClick={handleBack} className={`p-2 -ml-2 rounded-full ${isDark ? "text-slate-400 hover:bg-dark-surface" : "text-slate-600 hover:bg-slate-100"}`}>
          <ArrowLeft size={22} />
        </button>
        <h1 className={`font-bold text-base ${isDark ? "text-white" : "text-slate-800"}`}>New Bill</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row md:gap-6 overflow-hidden p-0 md:p-4">
        
        {/* LEFT: INVENTORY */}
        <div className={`flex-1 ${isDark ? "bg-dark-card md:border-dark-border" : "bg-white md:border-slate-200"} md:rounded-2xl md:border flex flex-col overflow-hidden md:shadow-sm`}>
          
          {/* Search & Categories */}
          <div className={`p-3 border-b sticky top-0 z-20 backdrop-blur-md ${isDark ? "border-dark-border bg-dark-card/90" : "border-slate-100 bg-white/90"} space-y-3`}>
            <div className="relative">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-500" : "text-slate-400"}`} size={16} />
              <input
                type="text"
                placeholder="Search inventory..."
                className={`w-full ${isDark ? "bg-dark-surface border-dark-border text-white" : "bg-slate-100 border-transparent text-slate-800"} border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border ${
                    selectedCategory === cat
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : isDark ? "bg-dark-surface text-slate-400 border-dark-border" : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className={`flex-1 overflow-y-auto p-3 pb-32 md:pb-4 ${isDark ? 'bg-dark-bg' : 'bg-slate-50/50'}`}>
            {filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-60">
                <Search size={32} className={isDark ? "text-slate-600" : "text-slate-400"} />
                <p className={`mt-2 text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item) => {
                  const itemId = item._id || item.id;
                  const qty = cart.find((c) => c.id === itemId)?.quantity || 0;
                  
                  // Check multiple possible keys for image
                  const itemImage = item.imageUrl || item.image || item.img || item.photo;

                  return (
                    <button
                      key={itemId || `item-${Math.random()}`}
                      onClick={() => addToCart(item)}
                      className={`
                        relative flex flex-row md:flex-col items-start md:items-stretch text-left 
                        p-3 md:p-0 gap-3 md:gap-0
                        rounded-xl border transition-all active:scale-[0.98] overflow-hidden group
                        ${qty > 0 
                          ? "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/10" 
                          : isDark ? "bg-dark-surface border-dark-border hover:border-emerald-500/30" : "bg-white border-slate-200 hover:border-emerald-500/50"
                        }
                      `}
                    >
                      {/* IMAGE SECTION */}
                      <div className={`
                        relative shrink-0 
                        w-24 h-24 md:w-full md:aspect-[4/3] md:h-auto
                        rounded-xl md:rounded-none md:rounded-t-xl overflow-hidden
                        ${isDark ? 'bg-slate-800' : 'bg-slate-100'}
                      `}>
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              // If image fails, hide it and show fallback
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}

                        {/* Fallback Icon (Hidden if image loads) */}
                        <div className={`w-full h-full flex-col items-center justify-center ${isDark ? 'text-slate-600' : 'text-slate-300'} ${itemImage ? 'hidden' : 'flex'}`}>
                          <ShoppingBag size={24} className="mb-1 opacity-50" />
                          <span className="text-[9px] font-bold uppercase opacity-50">No Img</span>
                        </div>

                        {/* Plus Overlay (Desktop) */}
                        <div className="hidden md:flex absolute bottom-2 right-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg">
                          <Plus size={14} strokeWidth={3} />
                        </div>
                      </div>

                      {/* TEXT CONTENT */}
                      <div className="flex flex-col flex-1 h-full justify-between md:p-4 min-w-0">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                             {/* Category Dot */}
                             <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isDark ? 'border-emerald-500/50' : 'border-emerald-600'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-600'}`}></div>
                             </div>
                             <span className={`text-[10px] font-bold uppercase tracking-wide truncate max-w-[100px] ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                                {item.category || 'General'}
                             </span>
                          </div>
                          <h4 className={`font-bold text-sm leading-tight line-clamp-2 ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                            {item.name}
                          </h4>
                        </div>
                        
                        <div className="flex justify-between items-end mt-2">
                          <span className={`text-sm font-black ${isDark ? "text-white" : "text-slate-900"}`}>₹{item.price}</span>
                          {qty > 0 && (
                            <div className="flex items-center gap-1 bg-emerald-500 text-white px-2 py-0.5 rounded-md text-xs font-bold shadow-sm">
                              {qty}x
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MOBILE FLOATING BAR */}
        {!isMobileCartOpen && cart.length > 0 && (
          <div 
            className={`md:hidden fixed bottom-4 left-4 right-4 p-3 rounded-2xl shadow-xl z-40 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform ${isDark ? "bg-emerald-600" : "bg-slate-900"}`}
            onClick={() => setIsMobileCartOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold">{totalItems}</div>
              <div className="text-white">
                <p className="text-[10px] font-bold uppercase opacity-80">Total Bill</p>
                <p className="text-lg font-black">₹{cartTotal}</p>
              </div>
            </div>
            <div className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
              View <ChevronDown size={14} className="rotate-180"/>
            </div>
          </div>
        )}

        {/* RIGHT: CART PANEL */}
        <div className={`fixed inset-0 z-50 ${isDark ? "bg-dark-card" : "bg-white"} flex flex-col transition-transform duration-300 md:static md:w-96 md:rounded-2xl md:border ${isDark ? "md:border-dark-border" : "md:border-slate-200"} md:shadow-sm md:translate-y-0 ${isMobileCartOpen ? "translate-y-0" : "translate-y-full md:translate-y-0"}`}>
          
          {/* Cart Header */}
          <div className={`p-4 border-b flex items-center justify-between ${isDark ? "border-dark-border" : "border-slate-100"}`}>
            <h2 className={`font-bold text-lg ${isDark ? "text-white" : "text-slate-800"}`}>Current Bill</h2>
            <button onClick={() => setIsMobileCartOpen(false)} className={`md:hidden p-2 rounded-full ${isDark ? "bg-dark-surface" : "bg-slate-100"}`}>
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Manual Entry */}
          <div className={`p-4 border-b ${isDark ? "bg-dark-surface border-dark-border" : "bg-slate-50 border-slate-100"}`}>
            <h3 className={`text-[10px] font-bold uppercase mb-2 flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <Zap size={10} className="text-amber-500" /> Quick Add
            </h3>
            <form onSubmit={addManualItem} className="flex gap-2">
              <input
                className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-dark-card border-dark-border text-white" : "bg-white border-slate-200"}`}
                placeholder="Item Name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
              <div className="relative w-20">
                <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>₹</span>
                <input
                  className={`w-full pl-5 pr-2 py-2 rounded-lg border text-sm outline-none font-bold ${isDark ? "bg-dark-card border-dark-border text-white" : "bg-white border-slate-200"}`}
                  type="number"
                  placeholder="0"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-slate-800 text-white w-10 rounded-lg flex items-center justify-center hover:bg-slate-900 transition-colors">
                <Plus size={16} />
              </button>
            </form>
          </div>

          {/* Cart Items */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isDark ? "bg-dark-card" : "bg-white"}`}>
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-50">
                <ShoppingCart size={32} className="mb-2" />
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className={`p-3 rounded-xl border flex flex-col gap-2 ${item.isManual ? (isDark ? "border-amber-500/20 bg-amber-900/10" : "border-amber-200 bg-amber-50") : (isDark ? "border-dark-border bg-dark-surface" : "border-slate-100 bg-white shadow-sm")}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className={`font-bold text-sm ${isDark ? "text-slate-100" : "text-slate-800"}`}>{item.name}</div>
                      {item.isManual && <span className="text-[9px] uppercase font-bold text-amber-500">Manual</span>}
                    </div>
                    <div className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>₹{item.price * item.quantity}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>₹{item.price}/unit</div>
                    <div className={`flex items-center h-8 rounded-lg border ${isDark ? "bg-black/20 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                      <button 
                        onClick={() => item.quantity === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)}
                        className={`w-8 h-full flex items-center justify-center rounded-l-lg hover:bg-red-500 hover:text-white transition-colors ${isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                      </button>
                      <span className={`w-8 text-center text-xs font-bold ${isDark ? "text-white" : "text-slate-800"}`}>{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-full flex items-center justify-center rounded-r-lg hover:bg-emerald-500 hover:text-white text-emerald-500 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t ${isDark ? "border-dark-border bg-dark-surface" : "border-slate-100 bg-slate-50"} space-y-4`}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Subtotal</span>
                <span className={isDark ? "text-slate-200" : "text-slate-800"}>₹{cartTotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-red-500 font-bold">- ₹</span>
                  <input
                    type="number"
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className={`w-16 py-1 px-2 rounded-md text-right font-bold outline-none border ${isDark ? "bg-dark-card border-dark-border text-red-400" : "bg-white border-slate-200 text-red-600"}`}
                  />
                </div>
              </div>
              <div className={`flex justify-between items-end pt-3 border-t border-dashed ${isDark ? "border-gray-700" : "border-gray-300"}`}>
                <span className="font-bold">Total Payable</span>
                <span className="text-2xl font-black text-emerald-500">₹{finalTotal}</span>
              </div>
            </div>

            <button
              onClick={handleGeneratePaymentQR}
              disabled={cart.length === 0 || isProcessing}
              className="w-full py-4 rounded-xl font-bold bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 active:scale-[0.98] transition-transform"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <><QrCode size={18} /> Generate Payment QR</>}
            </button>
          </div>
        </div>
      </div>

      {/* --- PAYMENT QR MODAL --- */}
      {showPaymentQr && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`${isDark ? "bg-[#1E1E1E] border border-gray-800" : "bg-white"} rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95`}>
            
            {/* Header */}
            <div className="px-6 pt-6 pb-2 flex justify-between items-start">
              <div>
                <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Collect Payment</h2>
                <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Scan to pay ₹{posBill?.bill?.total}</p>
              </div>
              <button onClick={handleClosePaymentQr} className={`p-2 rounded-full ${isDark ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200"}`}>
                <X size={20} className={isDark ? "text-white" : "text-gray-700"} />
              </button>
            </div>

            <div className="p-6 pt-4">
              
              {/* STATUS INDICATOR */}
              {customerPaymentMethod ? (
                <div className={`mb-6 p-4 rounded-2xl border ${
                  customerPaymentMethod === 'upi' ? 'bg-emerald-500/10 border-emerald-500/30' :
                  customerPaymentMethod === 'cash' ? 'bg-blue-500/10 border-blue-500/30' :
                  'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className={`p-3 rounded-full ${
                      customerPaymentMethod === 'upi' ? 'bg-emerald-500/20 text-emerald-500' :
                      customerPaymentMethod === 'cash' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-amber-500/20 text-amber-500'
                    }`}>
                      {customerPaymentMethod === 'upi' ? <Smartphone size={24} /> : 
                       customerPaymentMethod === 'cash' ? <Banknote size={24} /> : 
                       <Clock size={24} />}
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                        {customerPaymentMethod === 'pending' || customerPaymentMethod === 'khata' ? 'Khata Request' : `${customerPaymentMethod.toUpperCase()} Selected`}
                      </h3>
                      <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {customerInfo.name ? <span className="font-bold text-emerald-500">{customerInfo.name}</span> : "Customer"} is waiting for confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* QR CODE */
                <div className="relative mb-6">
                  <div className={`p-4 rounded-2xl border-2 ${isDark ? "bg-black/30 border-emerald-500/30" : "bg-white border-emerald-100"}`}>
                    {paymentQrUrl ? (
                      <img src={paymentQrUrl} alt="QR" className="w-full aspect-square rounded-xl object-contain mix-blend-multiply dark:mix-blend-normal" />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
                    )}
                  </div>
                  <div className={`text-center mt-3 text-xs ${expiryCountdown < 60 ? "text-red-500 font-bold" : "text-gray-500"}`}>
                    Expires in {Math.floor(expiryCountdown / 60)}:{String(expiryCountdown % 60).padStart(2, '0')}
                  </div>
                </div>
              )}

              {/* ACTION BUTTON */}
              <button
                onClick={handleConfirmPayment}
                disabled={!customerPaymentMethod || isProcessing}
                className={`w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  customerPaymentMethod 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/30' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                }`}
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : 
                 customerPaymentMethod ? <><CheckCircle size={20} /> Confirm Payment</> : 
                 "Waiting for customer selection..."}
              </button>

              {/* COPY LINK FEATURE */}
              <div className={`mt-6 pt-4 border-t ${isDark ? "border-gray-800" : "border-gray-100"} flex justify-center`}>
                <button
                  onClick={copyPaymentLink}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <LinkIcon size={12} />
                  Copy Payment Link
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MerchantBilling;