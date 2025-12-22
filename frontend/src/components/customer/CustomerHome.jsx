import React, { useState, useRef, useEffect } from 'react';
import { MOCK_RECEIPTS } from './customerData';
import ReceiptCard from './ReceiptCard';
import { 
  TrendingUp, Wallet, QrCode, UploadCloud, X, Save,
  Image as ImageIcon, Calendar, PieChart, Store, CheckCircle, Loader2
} from 'lucide-react';
import { fetchCustomerReceipts, createReceipt } from '../../services/api';
import toast from 'react-hot-toast';

const CustomerHome = ({ onNavigate, onScanTrigger }) => {
  
  // 🟢 STATE
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await fetchCustomerReceipts();
        // Handle paginated response structure
        const receiptsData = data.receipts || data || [];
        if (mounted) {
          setReceipts(receiptsData);
          localStorage.setItem('customerReceipts', JSON.stringify(receiptsData));
        }
      } catch (error) {
        const cached = localStorage.getItem('customerReceipts');
        const fallback = cached ? JSON.parse(cached) : MOCK_RECEIPTS;
        if (mounted) setReceipts(fallback);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (receipts?.length) {
      localStorage.setItem('customerReceipts', JSON.stringify(receipts));
    }
  }, [receipts]);
  
  const totalSpent = receipts
    .filter(r => !r.excludeFromStats)
    .reduce((sum, r) => sum + r.amount, 0);
  
  // 📂 UPLOAD STATES
  const [pendingFile, setPendingFile] = useState(null); 
  const [manualAmount, setManualAmount] = useState(""); 
  const [manualMerchant, setManualMerchant] = useState(""); 
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [includeInStats, setIncludeInStats] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);

  // ——— CRUD ACTIONS ———
  const handleDelete = (id) => {
    if (window.confirm("Delete this receipt?")) {
      setReceipts(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleUpdate = (updatedReceipt) => {
    setReceipts(prev => prev.map(r => r.id === updatedReceipt.id ? updatedReceipt : r));
  };

  // 📂 FILE PICKER
  const handleFilePick = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setPendingFile({ url: reader.result, name: file.name });
            setManualAmount(""); 
            setManualMerchant(""); 
            setManualDate(new Date().toISOString().split('T')[0]);
            setIncludeInStats(true);
        };
        reader.readAsDataURL(file);
    }
  };

  // 💾 SAVE UPLOAD
  const saveUploadedReceipt = async (e) => {
    e.preventDefault();
    if (!pendingFile || isUploading) return;

    setIsUploading(true);
    try {
      const payload = {
        source: "upload",
        merchantName: manualMerchant || "Unknown Merchant",
        transactionDate: manualDate,
        total: parseFloat(manualAmount) || 0,
        imageUrl: pendingFile.url,
        note: pendingFile.name,
        excludeFromStats: !includeInStats,
        paymentMethod: "other",
      };

      const { data: newReceipt } = await createReceipt(payload);
      setReceipts([newReceipt, ...receipts]);
      setPendingFile(null);
      setManualAmount("");
      setManualMerchant("");
      setManualDate(new Date().toISOString().split('T')[0]);
      setIncludeInStats(true);
      toast.success("Receipt uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      
      {/* 1. Header & Stats */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Your Spending Journal</h2>
        
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden transition-all">
            <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold uppercase">Total Spent (Active)</p>
                <h3 className="text-3xl font-bold mt-1">₹{totalSpent}</h3>
                <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1"><TrendingUp size={12}/> {receipts.length} Receipts archived</p>
            </div>
            <Wallet className="absolute -right-4 -bottom-4 text-white/10" size={80} />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={onScanTrigger} 
                className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-emerald-700 hover:bg-emerald-100 transition-all active:scale-95"
            >
                <div className="p-2 bg-white rounded-full shadow-sm"><QrCode size={20} /></div>
                <span className="font-bold text-sm">Scan QR</span>
            </button>
            
            <button onClick={() => fileInputRef.current.click()} className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-blue-700 hover:bg-blue-100 transition-all active:scale-95">
                <div className="p-2 bg-white rounded-full shadow-sm"><UploadCloud size={20} /></div>
                <span className="font-bold text-sm">Upload File</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFilePick} className="hidden" accept="image/*,.pdf"/>
        </div>
      </div>

      {/* 2. Recent Timeline */}
      <div>
        <div className="flex justify-between items-end mb-4">
           <h3 className="font-bold text-slate-700">Recent Activity</h3>
           <button onClick={() => onNavigate('receipts')} className="text-xs font-bold text-emerald-600 hover:underline">View All</button>
        </div>

        <div className="space-y-3 relative">
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100 -z-10 md:hidden"></div>
          {receipts.map((receipt) => (
             <div key={receipt.id} className="relative">
                 {receipt.excludeFromStats && (
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 -ml-6 hidden md:flex items-center justify-center w-6 h-6 z-0" title="Excluded from Analytics">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    </div>
                 )}
                 <ReceiptCard 
                    data={receipt} 
                    onDelete={() => handleDelete(receipt.id)} 
                    onUpdate={handleUpdate}
                 />
             </div>
          ))}
        </div>
      </div>

      {/* 📝 UPLOAD DETAILS MODAL */}
      {pendingFile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl animate-[popIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><ImageIcon size={18} className="text-blue-500"/> File Details</h3>
                    <button onClick={() => setPendingFile(null)} className="p-1 bg-slate-100 rounded-full hover:bg-slate-200"><X size={18}/></button>
                </div>

                <div className="overflow-y-auto flex-1 pr-1">
                    <div className="aspect-[3/4] bg-slate-100 rounded-xl mb-4 overflow-hidden border border-slate-200 shrink-0">
                        <img src={pendingFile.url} alt="Preview" className="w-full h-full object-cover" />
                    </div>

                    <form onSubmit={saveUploadedReceipt} className="space-y-4">
                        
                        {/* 1. Merchant Name */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Merchant / Shop</label>
                            <div className="relative">
                                {/* 👇 FIXED: Centered Icon */}
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="e.g. Starbucks, Uber" 
                                    value={manualMerchant}
                                    onChange={(e) => setManualMerchant(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* 2. Amount (KEYPAD FIX) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Total Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                <input 
                                    type="number" 
                                    // 👇 FIXED: This forces mobile to stay in Numeric Mode
                                    inputMode="decimal"
                                    placeholder="0.00" 
                                    value={manualAmount}
                                    onChange={(e) => setManualAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-800 outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* 3. Date (ICON FIX) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Transaction Date</label>
                            <div className="relative">
                                {/* 👇 FIXED: Icon perfectly centered vertically */}
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                <input 
                                    type="date" 
                                    value={manualDate}
                                    onChange={(e) => setManualDate(e.target.value)}
                                    // 👇 FIXED: pl-10 gives space, and we hide the ugly native icon
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full"
                                    required
                                />
                            </div>
                        </div>

                        {/* 4. Include in Stats Toggle */}
                        <div 
                            onClick={() => setIncludeInStats(!includeInStats)}
                            className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${includeInStats ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
                        >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${includeInStats ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                                {includeInStats && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm font-bold ${includeInStats ? 'text-emerald-800' : 'text-slate-500'}`}>Include in Analytics</p>
                                <p className="text-[10px] text-slate-400 leading-tight">If unchecked, this bill is hidden from charts.</p>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isUploading}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                              <><Loader2 size={18} className="animate-spin" /> Uploading...</>
                            ) : (
                              <><Save size={18} /> Save Receipt</>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default CustomerHome;