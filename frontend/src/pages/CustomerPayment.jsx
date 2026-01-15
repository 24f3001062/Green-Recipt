import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Banknote, 
  Smartphone, 
  Store, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  Leaf,
  LogIn,
  UserPlus,
  Receipt,
  Copy,
  Check
} from 'lucide-react';
import { fetchPublicBill, selectPaymentMethod, claimPOSReceipt, getStoredRole, hasSession } from '../services/api';
import toast from 'react-hot-toast';

const CustomerPayment = () => {
  const { billId } = useParams();
  const navigate = useNavigate();
  
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [upiLink, setUpiLink] = useState(null);
  const [expiryCountdown, setExpiryCountdown] = useState(0);
  
  // Payment completion states
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [claimingReceipt, setClaimingReceipt] = useState(false);
  const [receiptClaimed, setReceiptClaimed] = useState(false);
  
  // iOS-specific states
  const [showIOSOptions, setShowIOSOptions] = useState(false);
  const [copied, setCopied] = useState({ upiId: false, amount: false });
  
  // Platform detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Check if customer is logged in
  const isLoggedIn = hasSession() && getStoredRole() === 'customer';

  // Fetch bill data
  const loadBill = useCallback(async () => {
    try {
      const { data } = await fetchPublicBill(billId);
      setBill(data);
      
      // Check if payment is complete
      if (data.status === 'PAID') {
        setPaymentComplete(true);
      }
      
      // Calculate initial countdown
      if (data.expiresAt) {
        const remaining = Math.max(0, Math.floor((new Date(data.expiresAt) - Date.now()) / 1000));
        setExpiryCountdown(remaining);
      }
      
      return data;
    } catch (err) {
      console.error('Failed to load bill:', err);
      const message = err.response?.data?.message || 'Bill not found or expired';
      setError(message);
      return null;
    }
  }, [billId]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadBill();
      setLoading(false);
    };
    
    if (billId) {
      init();
    }
  }, [billId, loadBill]);

  // Poll for payment status updates (when waiting for merchant confirmation)
  useEffect(() => {
    if (!bill || paymentComplete) return;
    if (bill.status !== 'AWAITING_PAYMENT') return;
    if (!selectedMethod && !bill.customerSelected) return;
    
    // Poll every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await fetchPublicBill(billId);
        
        // Payment was confirmed by merchant
        if (data.status === 'PAID') {
          setPaymentComplete(true);
          setBill(data);
          clearInterval(pollInterval);
          
          // Show success toast
          toast.success('Payment confirmed! 🎉', { duration: 3000 });
        }
        
        // Bill expired
        if (data.status === 'EXPIRED') {
          setError('Bill has expired. Please ask merchant to generate a new QR.');
          setBill(data);
          clearInterval(pollInterval);
        }
        
        // Bill cancelled
        if (data.status === 'CANCELLED') {
          setError('Bill was cancelled by merchant.');
          setBill(data);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [billId, bill, selectedMethod, paymentComplete]);

  // Countdown timer
  useEffect(() => {
    if (!bill?.expiresAt || bill.status !== 'AWAITING_PAYMENT') return;
    
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(bill.expiresAt) - Date.now()) / 1000));
      setExpiryCountdown(remaining);
      
      if (remaining <= 0) {
        setError('Bill has expired. Please ask merchant to generate a new QR.');
        setBill(prev => prev ? { ...prev, status: 'EXPIRED' } : null);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [bill?.expiresAt, bill?.status]);

  // Handle payment method selection
  const handleSelectMethod = async (method) => {
    if (processing) return;
    
    setSelectedMethod(method);
    setProcessing(true);

    try {
      const { data } = await selectPaymentMethod(billId, method);
      
      if (method === 'upi') {
        // Always use UPI deep links to open payment apps directly
        // For PERSONAL UPI type, we'll omit amount to avoid merchant verification errors
        if (data.upiLink) {
          setUpiLink(data.upiLink);
          
          // iOS: Show app selection screen instead of auto-redirect
          if (isIOS) {
            setShowIOSOptions(true);
            setProcessing(false);
            return;
          }
          
          // Android: Auto-redirect to UPI app
          setTimeout(() => {
            window.location.href = data.upiLink;
          }, 500);
        }
      } else if (method === 'cash') {
        // Cash selected - show waiting for merchant confirmation
        setBill(prev => ({ ...prev, paymentMethod: 'cash', customerSelected: true }));
      }
    } catch (err) {
      console.error('Failed to select payment method:', err);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setSelectedMethod(null);
    } finally {
      setProcessing(false);
    }
  };
  
  // Handle iOS app-specific payment
  const handleIOSAppPayment = (appType) => {
    if (!bill?.merchant?.upiId) return;
    
    const upiId = bill.merchant.upiId;
    const pn = encodeURIComponent(bill.merchant.upiName || bill.merchant.shopName || 'Merchant');
    const cu = 'INR';
    const tn = encodeURIComponent(bill.upiNote || `Payment to ${bill.merchant.shopName}`);
    
    // For PERSONAL UPI type, omit amount to avoid "merchant not verified" errors
    // Customer will enter amount manually in the UPI app
    const isPersonal = bill.merchant.upiType === 'PERSONAL';
    const am = isPersonal ? '' : bill.total.toFixed(2);
    
    let deepLink = '';
    
    // Build deep link - only include amount for MERCHANT type
    const amountParam = am ? `&am=${am}` : '';
    
    switch (appType) {
      case 'gpay':
        deepLink = `gpay://upi/pay?pa=${upiId}&pn=${pn}${amountParam}&cu=${cu}&tn=${tn}`;
        break;
      case 'phonepe':
        deepLink = `phonepe://pay?pa=${upiId}&pn=${pn}${amountParam}&cu=${cu}&tn=${tn}`;
        break;
      case 'paytm':
        deepLink = `paytmmp://pay?pa=${upiId}&pn=${pn}${amountParam}&cu=${cu}&tn=${tn}`;
        break;
      default:
        return;
    }
    
    // Try to open the app
    window.location.href = deepLink;
    
    // Show reminder to enter amount for personal UPI
    if (isPersonal) {
      setTimeout(() => {
        toast(`Remember to enter ₹${bill.total} as the amount`, {
          duration: 5000,
          icon: '💰',
        });
      }, 1500);
    }
  };
  
  // Copy to clipboard helper
  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(prev => ({ ...prev, [type]: true }));
      toast.success(`${type === 'upiId' ? 'UPI ID' : 'Amount'} copied!`);
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy. Please try manually.');
    }
  };

  // Handle claiming receipt to customer account
  const handleClaimReceipt = async () => {
    if (!bill || !isLoggedIn) return;
    
    setClaimingReceipt(true);
    
    try {
      await claimPOSReceipt(billId);
      
      setReceiptClaimed(true);
      toast.success('Receipt saved to your account! 📱');
      
      // Dispatch event to update customer dashboard
      window.dispatchEvent(new Event('customer-receipts-updated'));
      
      // Navigate to customer dashboard after short delay
      setTimeout(() => {
        navigate('/customer-dashboard');
      }, 1500);
    } catch (err) {
      console.error('Failed to claim receipt:', err);
      toast.error(err.response?.data?.message || 'Failed to save receipt');
    } finally {
      setClaimingReceipt(false);
    }
  };

  // Handle login redirect
  const handleLoginRedirect = () => {
    // Store bill ID to claim after login
    sessionStorage.setItem('pendingBillClaim', billId);
    navigate('/customer-login', { state: { returnTo: `/pay/${billId}` } });
  };

  // Handle signup redirect
  const handleSignupRedirect = () => {
    sessionStorage.setItem('pendingBillClaim', billId);
    navigate('/customer-signup', { state: { returnTo: `/pay/${billId}` } });
  };

  // Format time remaining
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading bill details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !bill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full text-center border border-slate-700/50">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Oops!</h1>
          <p className="text-slate-400 text-sm mb-6">{error || 'Bill not found'}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Bill expired state
  if (bill.status === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full text-center border border-slate-700/50">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Bill Expired</h1>
          <p className="text-slate-400 text-sm">Please ask the merchant to generate a new QR code.</p>
        </div>
      </div>
    );
  }

  // Bill already paid - show success with claim option
  if (bill.status === 'PAID' || paymentComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full text-center border border-emerald-500/30">
          {/* Success Animation */}
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-[popIn_0.3s_ease-out]">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Payment Complete!</h1>
          <p className="text-emerald-400 text-sm mb-6">
            Your payment has been confirmed by the merchant.
          </p>
          
          {/* Receipt Summary */}
          <div className="bg-slate-900/50 rounded-2xl p-4 mb-6">
            <div className="text-3xl font-black text-emerald-400 mb-2">₹{bill.total}</div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Store size={12} />
              {bill.merchant?.shopName || 'Merchant'}
            </div>
            {bill.upiNote && (
              <div className="text-[10px] text-slate-600 mt-2 font-mono">
                Ref: {bill.upiNote}
              </div>
            )}
          </div>
          
          {/* Save Receipt Options */}
          {!receiptClaimed && (
            <div className="space-y-3">
              <p className="text-slate-400 text-xs mb-3">
                Save this receipt to your GreenReceipt account
              </p>
              
              {isLoggedIn ? (
                // Logged in - Show save button
                <button
                  onClick={handleClaimReceipt}
                  disabled={claimingReceipt}
                  className="w-full p-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  {claimingReceipt ? (
                    <Loader2 size={20} className="animate-spin text-white" />
                  ) : (
                    <>
                      <Receipt size={20} className="text-white" />
                      <span className="font-bold text-white">Save to My Receipts</span>
                    </>
                  )}
                </button>
              ) : (
                // Not logged in - Show login/signup options
                <>
                  <button
                    onClick={handleLoginRedirect}
                    className="w-full p-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                  >
                    <LogIn size={20} className="text-white" />
                    <span className="font-bold text-white">Login to Save Receipt</span>
                  </button>
                  
                  <button
                    onClick={handleSignupRedirect}
                    className="w-full p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <UserPlus size={18} className="text-slate-300" />
                    <span className="text-slate-300 text-sm">Create Account</span>
                  </button>
                </>
              )}
              
              <button
                onClick={() => navigate('/')}
                className="w-full p-3 text-slate-500 text-sm hover:text-slate-400 transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}
          
          {/* Receipt Saved Confirmation */}
          {receiptClaimed && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-400 mb-4">
                <CheckCircle size={20} />
                <span className="font-medium">Receipt saved!</span>
              </div>
              <p className="text-slate-400 text-sm">Redirecting to your dashboard...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // UPI selected - redirect screen with polling
  if (selectedMethod === 'upi' && upiLink) {
    // Check if this is a personal UPI (needs manual amount entry)
    const isPersonalUPI = bill.merchant?.upiType === 'PERSONAL';
    
    // iOS: Show app selection screen
    if (isIOS && showIOSOptions) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full border border-purple-500/30">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Pay ₹{bill.total}</h1>
              <p className="text-slate-400 text-sm">{bill.merchant?.shopName || 'Merchant'}</p>
            </div>

            {/* Amount Reminder for Personal UPI */}
            {isPersonalUPI && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <AlertCircle size={18} />
                  <span className="font-bold text-sm">Enter amount manually</span>
                </div>
                <p className="text-amber-300/80 text-xs">
                  After the app opens, enter <span className="font-bold">₹{bill.total}</span> as the payment amount.
                </p>
              </div>
            )}

            {/* UPI App Options - Opens payment app directly */}
            <div className="space-y-3 mb-6">
              <p className="text-slate-400 text-xs text-center mb-3">Choose your UPI app</p>
              
              {/* Google Pay */}
              <button
                onClick={() => handleIOSAppPayment('gpay')}
                className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl flex items-center justify-between transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl">
                    G
                  </div>
                  <span className="font-bold text-white">Google Pay</span>
                </div>
                <ArrowRight size={18} className="text-white/60" />
              </button>

              {/* PhonePe */}
              <button
                onClick={() => handleIOSAppPayment('phonepe')}
                className="w-full p-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-xl flex items-center justify-between transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl">
                    📱
                  </div>
                  <span className="font-bold text-white">PhonePe</span>
                </div>
                <ArrowRight size={18} className="text-white/60" />
              </button>

              {/* Paytm */}
              <button
                onClick={() => handleIOSAppPayment('paytm')}
                className="w-full p-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl flex items-center justify-between transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl">
                    💳
                  </div>
                  <span className="font-bold text-white">Paytm</span>
                </div>
                <ArrowRight size={18} className="text-white/60" />
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-800 px-2 text-slate-500">OR</span>
              </div>
            </div>

            {/* Alternative Options - Copy UPI ID */}
            <div className="space-y-3">
              {/* Copy UPI ID */}
              <button
                onClick={() => copyToClipboard(bill.merchant.upiId, 'upiId')}
                className="w-full p-3 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center gap-2 text-white transition-all"
              >
                {copied.upiId ? <Check size={18} /> : <Copy size={18} />}
                <span className="font-medium">Copy UPI ID</span>
              </button>

              {/* Copy Amount */}
              <button
                onClick={() => copyToClipboard(bill.total.toString(), 'amount')}
                className="w-full p-3 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center gap-2 text-white transition-all"
              >
                {copied.amount ? <Check size={18} /> : <Copy size={18} />}
                <span className="font-medium">Copy Amount (₹{bill.total})</span>
              </button>
            </div>

            {/* Waiting status */}
            <div className="mt-6 flex items-center justify-center gap-2 text-purple-400 text-sm">
              <Loader2 size={14} className="animate-spin" />
              <span>Waiting for merchant confirmation...</span>
            </div>

            {/* Back button */}
            <button
              onClick={() => {
                setShowIOSOptions(false);
                setSelectedMethod(null);
                setUpiLink(null);
              }}
              className="w-full mt-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Back to payment options
            </button>
          </div>
        </div>
      );
    }
    
    // Android: Show redirect screen - UPI app opens automatically
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full text-center border border-purple-500/30">
          <Loader2 size={40} className="animate-spin text-purple-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Opening UPI App...</h1>
          <p className="text-slate-400 text-sm mb-6">
            If the app doesn't open automatically, 
            <a href={upiLink} className="text-purple-400 underline ml-1">tap here</a>
          </p>
          
          <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
            <div className="text-3xl font-black text-white mb-1">₹{bill.total}</div>
            <div className="text-xs text-slate-500">Pay to: {bill.merchant?.shopName}</div>
          </div>

          {/* Amount Reminder for Personal UPI */}
          {isPersonalUPI && (
            <div className="text-[11px] text-slate-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
              <span className="text-amber-400 font-bold">💰 Remember:</span> Enter <span className="text-amber-300">₹{bill.total}</span> as the payment amount
            </div>
          )}

          <div className="text-[11px] text-slate-500 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4">
            <span className="text-emerald-400 font-bold">After payment:</span> Return here - we'll automatically detect when merchant confirms
          </div>
          
          <div className="flex items-center justify-center gap-2 text-purple-400 text-sm">
            <Loader2 size={14} className="animate-spin" />
            Waiting for merchant confirmation...
          </div>
        </div>
      </div>
    );
  }

  // Cash selected - waiting screen with polling
  if (selectedMethod === 'cash' || bill.customerSelected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full text-center border border-blue-500/30">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Banknote size={32} className="text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Cash Payment</h1>
          <p className="text-slate-400 text-sm mb-6">
            Please pay <span className="text-white font-bold">₹{bill.total}</span> in cash to the merchant.
          </p>
          
          <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
            <div className="text-4xl font-black text-blue-400 mb-2">₹{bill.total}</div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Store size={12} />
              {bill.merchant?.shopName || 'Merchant'}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
            <Loader2 size={14} className="animate-spin" />
            Waiting for merchant confirmation...
          </div>
          
          <p className="text-[10px] text-slate-600 mt-4">
            This page will update automatically when the merchant confirms your payment
          </p>
        </div>
      </div>
    );
  }

  // Main payment choice screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="p-4 pt-6">
        <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1">
          <Leaf size={20} className="fill-emerald-400" />
          <span className="font-bold text-sm">GreenReceipt</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 max-w-sm w-full border border-slate-700/50 shadow-2xl">
          
          {/* Timer */}
          {expiryCountdown > 0 && (
            <div className={`flex items-center justify-center gap-2 mb-4 px-3 py-2 rounded-full text-xs font-medium ${
              expiryCountdown < 60 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : expiryCountdown < 180 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-slate-700/50 text-slate-400'
            }`}>
              <Clock size={12} />
              <span>Expires in {formatTime(expiryCountdown)}</span>
            </div>
          )}

          {/* Merchant Info */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Store size={24} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">{bill.merchant?.shopName || 'Merchant'}</h2>
            <p className="text-slate-500 text-xs">{bill.merchant?.address || ''}</p>
          </div>

          {/* Amount */}
          <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 text-center">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Amount to Pay</p>
            <div className="text-4xl font-black text-white">₹{bill.total}</div>
          </div>

          {/* Items Summary (Collapsible) */}
          {bill.items && bill.items.length > 0 && (
            <div className="bg-slate-900/30 rounded-xl p-3 mb-6">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                <ShoppingBag size={12} />
                <span>{bill.items.length} item(s)</span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {bill.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-slate-300">{item.name} × {item.quantity}</span>
                    <span className="text-slate-400">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bill Reference */}
          <div className="text-center mb-6">
            <p className="text-slate-600 text-[10px] uppercase tracking-wider">Bill Reference</p>
            <p className="text-slate-400 font-mono text-xs">{bill.upiNote || bill.id}</p>
          </div>

          {/* Payment Options */}
          <div className="space-y-3">
            <p className="text-center text-slate-400 text-xs mb-4">Choose Payment Method</p>
            
            {/* Pay by Cash */}
            <button
              onClick={() => handleSelectMethod('cash')}
              disabled={processing}
              className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-500/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Banknote size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-white">Pay by Cash</div>
                  <div className="text-blue-200 text-xs">Hand cash to merchant</div>
                </div>
              </div>
              <ArrowRight size={18} className="text-white/60" />
            </button>

            {/* Pay by UPI */}
            <button
              onClick={() => handleSelectMethod('upi')}
              disabled={processing || !bill.merchant?.upiId}
              className="w-full p-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-purple-500/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Smartphone size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-white">Pay by UPI</div>
                  <div className="text-purple-200 text-xs">GPay, PhonePe, Paytm</div>
                </div>
              </div>
              <ArrowRight size={18} className="text-white/60" />
            </button>
            
            {!bill.merchant?.upiId && (
              <p className="text-center text-amber-400/70 text-[10px]">
                <AlertCircle size={10} className="inline mr-1" />
                UPI not available for this merchant
              </p>
            )}
          </div>

          {/* Processing indicator */}
          {processing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 size={14} className="animate-spin" />
              Processing...
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center">
        <p className="text-slate-600 text-[10px]">Powered by GreenReceipt • Digital receipts, zero paper</p>
      </div>
    </div>
  );
};

export default CustomerPayment;
