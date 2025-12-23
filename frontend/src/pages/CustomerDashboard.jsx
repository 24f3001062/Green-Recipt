import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner'; // 👈 NEW LIBRARY
import CustomerSidebar from '../components/customer/CustomerSidebar';
import CustomerHome from '../components/customer/CustomerHome';
import CustomerReceipts from '../components/customer/CustomerReceipts';
import CustomerCalendar from '../components/customer/CustomerCalendar';
import CustomerInsights from '../components/customer/CustomerInsights';
import CustomerProfile from '../components/customer/CustomerProfile';
import CustomerNotifications from '../components/customer/CustomerNotifications';
import { ScanLine, Bell, X, CheckCircle, AlertCircle } from 'lucide-react';
import { createReceipt, claimReceipt, fetchCustomerReceipts } from '../services/api';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [receipts, setReceipts] = useState([]);
  
  // 📸 SCANNER STATE
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // null | 'success' | 'error'

  // Load receipts for eco impact calculation
  useEffect(() => {
    const loadReceipts = async () => {
      try {
        const { data } = await fetchCustomerReceipts();
        setReceipts(data);
        localStorage.setItem('customerReceipts', JSON.stringify(data));
      } catch (e) {
        // Fallback to localStorage
        const cached = JSON.parse(localStorage.getItem('customerReceipts') || '[]');
        setReceipts(cached);
      }
    };
    loadReceipts();

    // Listen for receipt updates
    const handleUpdate = () => {
      const cached = JSON.parse(localStorage.getItem('customerReceipts') || '[]');
      setReceipts(cached);
    };
    window.addEventListener('customer-receipts-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    
    return () => {
      window.removeEventListener('customer-receipts-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Trigger Scanner Modal
  const handleGlobalScan = () => {
    setScanResult(null);
    setIsScanning(true);
  };

  // 🧠 HANDLE REAL SCAN RESULT
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
        // The QR uses 'n', 'q', 'p' to save space. We must convert them back.
        const fixedItems = (receiptData.items || []).map(item => {
            const quantity = item.q || item.qty || item.quantity;
            const unitPrice = item.p || item.price || item.unitPrice;
            return {
              name: item.n || item.name,
              // Keep both shapes so UI and backend agree
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
            type: 'qr',
            excludeFromStats: false,
        };

        // 4. Persist to backend (fallback to local on failure)
        try {
          const payload = {
            merchantId: receiptData.merchantId,
            merchantCode: receiptData.mid || receiptData.merchantCode,
            items: fixedItems,
            source: 'qr',
            paymentMethod: 'upi',
            transactionDate: receiptData.date || new Date().toISOString(),
            total: receiptData.total,
            note: receiptData.note,
            footer: receiptData.footer,
          };

          const apiCall = receiptData.rid
            ? claimReceipt({ receiptId: receiptData.rid })
            : createReceipt(payload);

          const { data } = await apiCall;
          const existing = JSON.parse(localStorage.getItem('customerReceipts')) || [];
          const merged = [data, ...existing.filter(r => r.id !== data.id && r._id !== data.id)];
          localStorage.setItem('customerReceipts', JSON.stringify(merged));
          window.dispatchEvent(new Event('customer-receipts-updated'));
        } catch (apiError) {
          const existing = JSON.parse(localStorage.getItem('customerReceipts')) || [];
          if (!existing.find(r => r.id === newReceipt.id)) {
            localStorage.setItem('customerReceipts', JSON.stringify([newReceipt, ...existing]));
          }
          window.dispatchEvent(new Event('customer-receipts-updated'));
        }

        // 5. Success UI
        setScanResult('success');
        
        // 6. Redirect
        setTimeout(() => {
            setIsScanning(false);
            setActiveTab('receipts'); 
            window.dispatchEvent(new Event('storage')); 
        }, 1500);

      } catch (err) {
        console.log("Ignored invalid QR code or Scan Error");
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      <CustomerSidebar activeTab={activeTab} onNavigate={setActiveTab} receipts={receipts} />

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* MOBILE HEADER */}
        <div className="md:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 shrink-0 sticky top-0 z-30 shadow-sm">
             <button onClick={handleGlobalScan} className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 active:scale-95 transition-all">
                <ScanLine size={22} />
             </button>
             <div className="flex items-center gap-2 text-emerald-700">
                <span className="font-bold text-lg tracking-tight">GreenReceipt</span>
             </div>
             <button onClick={() => setActiveTab('notifications')} className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 active:scale-95 transition-all relative">
                <Bell size={22} />
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
        </div>
        
        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
           <div className="max-w-4xl mx-auto animate-fade-in">
              {activeTab === 'home' && <CustomerHome onNavigate={setActiveTab} onScanTrigger={handleGlobalScan} />}
              {activeTab === 'receipts' && <CustomerReceipts />}
              {activeTab === 'calendar' && <CustomerCalendar />}
              {activeTab === 'insights' && <CustomerInsights />}
              {activeTab === 'profile' && <CustomerProfile />}
              {activeTab === 'notifications' && <CustomerNotifications />}
           </div>
        </main>
      </div>

      {/* 📸 ROBUST CAMERA OVERLAY */}
      {isScanning && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-fade-in">
            
            <button onClick={() => setIsScanning(false)} className="absolute top-6 right-6 text-white p-2 z-50 bg-white/20 rounded-full backdrop-blur-sm">
                <X size={24} />
            </button>

            <div className="w-full max-w-sm px-6 text-center relative">
                
                {scanResult === 'success' ? (
                    <div className="animate-[popIn_0.3s_ease-out]">
                        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                            <CheckCircle className="text-white" size={48} />
                        </div>
                        <h3 className="text-white text-2xl font-bold mb-2">Receipt Scanned!</h3>
                        <p className="text-emerald-400">Saving to your journal...</p>
                    </div>
                ) : scanResult === 'error' ? (
                    <div className="animate-[popIn_0.3s_ease-out]">
                        <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="text-white" size={48} />
                        </div>
                        <h3 className="text-white text-2xl font-bold mb-2">Camera Error</h3>
                        <p className="text-slate-300">Please check your browser permissions.</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-white text-xl font-bold mb-6">Scan GreenReceipt QR</h3>
                        
                        {/* 🎥 NEW SCANNER CONTAINER */}
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
                                    container: { width: '100%', height: '100%' },
                                    video: { width: '100%', height: '100%', objectFit: 'cover' }
                                }}
                            />
                            
                            {/* Scanning Animation */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-[scan_2s_ease-in-out_infinite] z-10 pointer-events-none"></div>
                        </div>
                        
                        <p className="text-slate-400 text-sm mt-6">Point at the merchant's screen</p>
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