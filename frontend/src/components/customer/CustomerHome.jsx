import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MOCK_RECEIPTS } from './customerData';
import ReceiptCard from './ReceiptCard';
import { 
  TrendingUp, TrendingDown, Wallet, QrCode, UploadCloud, X, Save,
  Image as ImageIcon, Calendar, PieChart, Store, CheckCircle, Loader2,
  Receipt, Sparkles, ArrowUpRight, ArrowDownRight, Smartphone, Banknote,
  ChevronRight, Clock, Zap, Target
} from 'lucide-react';
import { fetchCustomerReceipts, createReceipt, fetchCustomerAnalytics } from '../../services/api';
import toast from 'react-hot-toast';

// ============== SKELETON LOADER ==============
const HomeSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 bg-slate-200 rounded-lg w-48" />
    <div className="h-44 bg-gradient-to-r from-slate-200 to-slate-300 rounded-3xl" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-24 bg-slate-200 rounded-2xl" />
      <div className="h-24 bg-slate-200 rounded-2xl" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
    </div>
    <div className="h-6 bg-slate-200 rounded w-32" />
    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-2xl" />)}
  </div>
);

// ============== STAT CARD ==============
const StatCard = ({ icon: Icon, label, value, subValue, trend, trendValue, color = 'emerald' }) => {
  const colorConfig = {
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-600', border: 'border-slate-100' },
  };
  const config = colorConfig[color] || colorConfig.emerald;

  return (
    <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className={`p-2 md:p-2.5 rounded-lg md:rounded-xl ${config.bg} ${config.border} border group-hover:scale-105 transition-transform`}>
          <Icon size={16} className={`${config.icon} md:w-[18px] md:h-[18px]`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            {trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            <span>{trendValue}%</span>
          </div>
        )}
      </div>
      <div className="mt-2 md:mt-3">
        <p className="text-[9px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg md:text-2xl font-bold text-slate-800 mt-0.5 md:mt-1">{value}</p>
        {subValue && <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
};

// ============== MAIN COMPONENT ==============
const CustomerHome = ({ onNavigate, onScanTrigger }) => {
  
  // 🟢 STATE
  const [receipts, setReceipts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [receiptsRes, analyticsRes] = await Promise.allSettled([
          fetchCustomerReceipts(),
          fetchCustomerAnalytics()
        ]);
        
        if (receiptsRes.status === 'fulfilled') {
          const receiptsData = receiptsRes.value.data.receipts || receiptsRes.value.data || [];
          if (mounted) {
            setReceipts(receiptsData);
            localStorage.setItem('customerReceipts', JSON.stringify(receiptsData));
          }
        } else {
          const cached = localStorage.getItem('customerReceipts');
          const fallback = cached ? JSON.parse(cached) : MOCK_RECEIPTS;
          if (mounted) setReceipts(fallback);
        }
        
        if (analyticsRes.status === 'fulfilled' && mounted) {
          setAnalytics(analyticsRes.value.data);
        }
      } catch (error) {
        const cached = localStorage.getItem('customerReceipts');
        const fallback = cached ? JSON.parse(cached) : MOCK_RECEIPTS;
        if (mounted) setReceipts(fallback);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (receipts?.length) {
      localStorage.setItem('customerReceipts', JSON.stringify(receipts));
    }
  }, [receipts]);
  
  // Computed values
  const totalSpent = useMemo(() => 
    receipts.filter(r => !r.excludeFromStats).reduce((sum, r) => sum + (r.amount || 0), 0),
    [receipts]
  );

  const { upiTotal, cashTotal } = useMemo(() => {
    const payments = analytics?.paymentMethods || [];
    const upi = payments.find(p => p.method?.toLowerCase() === 'upi');
    const cash = payments.find(p => p.method?.toLowerCase() === 'cash');
    return { upiTotal: upi?.total || 0, cashTotal: cash?.total || 0 };
  }, [analytics]);
  
  // 📂 UPLOAD STATES
  const [pendingFile, setPendingFile] = useState(null); 
  const [manualAmount, setManualAmount] = useState(""); 
  const [manualMerchant, setManualMerchant] = useState(""); 
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [includeInStats, setIncludeInStats] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  
  // Loading state
  if (loading) return <HomeSkeleton />;

  // Computed values for display
  const summary = analytics?.summary;
  const monthChange = summary?.changes?.monthOverMonth || 0;

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
    <div className="space-y-5 md:space-y-6 max-w-3xl mx-auto pb-24 md:pb-10">
      
      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5 md:mt-1">Your spending at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] md:text-xs text-slate-400 bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 rounded-full">
            <Sparkles size={10} className="text-emerald-500 md:w-3 md:h-3" />
            <span>{receipts.length} receipts</span>
          </div>
        </div>
      </div>

      {/* ========== HERO SPENDING CARD ========== */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-2xl shadow-slate-900/20 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-emerald-500/10 rounded-full -mr-24 md:-mr-32 -mt-24 md:-mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 md:w-48 h-32 md:h-48 bg-emerald-500/10 rounded-full -ml-16 md:-ml-24 -mb-16 md:-mb-24 blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <span className="px-2 md:px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider">
                  This Month
                </span>
                {monthChange !== 0 && (
                  <span className={`flex items-center gap-0.5 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${
                    monthChange >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-400/20 text-emerald-300'
                  }`}>
                    {monthChange >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(monthChange)}%
                  </span>
                )}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                ₹{(summary?.thisMonth?.total || totalSpent).toLocaleString('en-IN')}
              </h2>
              <p className="text-slate-400 text-xs md:text-sm mt-1.5 md:mt-2">
                {summary?.thisMonth?.count || receipts.length} receipts this month
              </p>
            </div>
            
            {/* Quick Stats - UPI & Cash */}
            <div className="flex flex-row md:flex-col gap-2 md:gap-3">
              <div className="flex-1 md:flex-none bg-white/10 backdrop-blur-sm px-3 md:px-4 py-2 md:py-3 rounded-xl">
                <div className="flex items-center gap-1.5 md:gap-2 text-emerald-400 mb-0.5 md:mb-1">
                  <Smartphone size={12} className="md:w-[14px] md:h-[14px]" />
                  <span className="text-[10px] md:text-xs font-medium">UPI</span>
                </div>
                <p className="text-base md:text-xl font-bold">₹{upiTotal.toLocaleString('en-IN')}</p>
              </div>
              <div className="flex-1 md:flex-none bg-white/10 backdrop-blur-sm px-3 md:px-4 py-2 md:py-3 rounded-xl">
                <div className="flex items-center gap-1.5 md:gap-2 text-amber-400 mb-0.5 md:mb-1">
                  <Banknote size={12} className="md:w-[14px] md:h-[14px]" />
                  <span className="text-[10px] md:text-xs font-medium">Cash</span>
                </div>
                <p className="text-base md:text-xl font-bold">₹{cashTotal.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Period Summary */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/10">
            <div>
              <p className="text-slate-400 text-[10px] md:text-xs font-medium">This Week</p>
              <p className="text-sm md:text-xl font-bold mt-0.5 md:mt-1">₹{(summary?.thisWeek?.total || 0).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] md:text-xs font-medium">Last Month</p>
              <p className="text-sm md:text-xl font-bold mt-0.5 md:mt-1">₹{(summary?.lastMonth?.total || 0).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] md:text-xs font-medium">This Year</p>
              <p className="text-sm md:text-xl font-bold mt-0.5 md:mt-1">₹{(summary?.thisYear?.total || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
        
        <Wallet className="absolute -right-4 md:-right-6 -bottom-4 md:-bottom-6 text-white/5" size={80} />
      </div>

      {/* ========== QUICK ACTIONS ========== */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={onScanTrigger} 
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 md:p-5 rounded-xl md:rounded-2xl flex flex-col items-center justify-center gap-2 md:gap-3 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25 group"
        >
          <div className="p-2 md:p-3 bg-white/20 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform">
            <QrCode size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="text-center">
            <span className="font-bold text-xs md:text-sm block">Scan QR</span>
            <span className="text-[10px] md:text-xs text-emerald-100">Add digital receipt</span>
          </div>
        </button>
        
        <button 
          onClick={() => fileInputRef.current.click()} 
          className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 md:p-5 rounded-xl md:rounded-2xl flex flex-col items-center justify-center gap-2 md:gap-3 text-white hover:from-blue-600 hover:to-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25 group"
        >
          <div className="p-2 md:p-3 bg-white/20 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform">
            <UploadCloud size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="text-center">
            <span className="font-bold text-xs md:text-sm block">Upload</span>
            <span className="text-[10px] md:text-xs text-blue-100">Photo or PDF</span>
          </div>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFilePick} className="hidden" accept="image/*,.pdf"/>
      </div>

      {/* ========== STATS GRID ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <StatCard 
          icon={Receipt} 
          label="Receipts" 
          value={summary?.thisMonth?.count || receipts.length}
          subValue="This month"
          color="emerald" 
        />
        <StatCard 
          icon={Target} 
          label="Avg/Day" 
          value={`₹${summary?.thisMonth?.avgPerDay || Math.round(totalSpent / 30)}`}
          subValue="Daily average"
          color="blue" 
        />
        <StatCard 
          icon={Clock} 
          label="Last Week" 
          value={`₹${(summary?.lastWeek?.total || 0).toLocaleString('en-IN')}`}
          subValue={`${summary?.lastWeek?.count || 0} receipts`}
          color="purple" 
        />
        <StatCard 
          icon={Zap} 
          label="Projected" 
          value={`₹${(summary?.thisMonth?.projectedTotal || 0).toLocaleString('en-IN')}`}
          subValue="End of month"
          color="orange" 
        />
      </div>

      {/* ========== QUICK LINKS ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { id: 'receipts', icon: Receipt, label: 'All Receipts', color: 'emerald', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
          { id: 'calendar', icon: Calendar, label: 'History', color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
          { id: 'insights', icon: PieChart, label: 'Insights', color: 'purple', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
          { id: 'profile', icon: Store, label: 'Profile', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
        ].map(link => (
          <button
            key={link.id}
            onClick={() => onNavigate(link.id)}
            className="p-3 md:p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group flex items-center gap-2 md:gap-3 active:scale-[0.98]"
          >
            <div className={`p-1.5 md:p-2 rounded-lg ${link.bgColor} ${link.textColor} group-hover:scale-105 transition-transform`}>
              <link.icon size={14} className="md:w-[18px] md:h-[18px]" />
            </div>
            <span className="font-semibold text-slate-700 text-xs md:text-sm flex-1 text-left">{link.label}</span>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors hidden md:block" />
          </button>
        ))}
      </div>

      {/* ========== RECENT ACTIVITY ========== */}
      <div>
        <div className="flex justify-between items-center mb-3 md:mb-4">
          <h3 className="font-bold text-slate-800 text-base md:text-lg">Recent Activity</h3>
          <button 
            onClick={() => onNavigate('receipts')} 
            className="text-[10px] md:text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 md:gap-1 transition-colors"
          >
            View All <ChevronRight size={12} className="md:w-[14px] md:h-[14px]" />
          </button>
        </div>

        {receipts.length === 0 ? (
          <div className="bg-white p-6 md:p-8 rounded-xl md:rounded-2xl border border-slate-100 text-center">
            <div className="w-12 md:w-16 h-12 md:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Receipt size={20} className="text-slate-400 md:w-6 md:h-6" />
            </div>
            <p className="font-semibold text-slate-600 mb-1 text-sm md:text-base">No receipts yet</p>
            <p className="text-xs md:text-sm text-slate-400">Scan a QR code or upload to get started</p>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {receipts.slice(0, 5).map((receipt) => (
              <ReceiptCard 
                key={receipt.id}
                data={receipt} 
                onDelete={() => handleDelete(receipt.id)} 
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========== UPLOAD DETAILS MODAL ========== */}
      {pendingFile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl md:rounded-3xl w-full max-w-sm shadow-2xl animate-[popIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 text-base md:text-lg flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-500 md:w-5 md:h-5"/> 
                Add Receipt
              </h3>
              <button 
                onClick={() => setPendingFile(null)} 
                className="p-1.5 md:p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X size={16} className="md:w-[18px] md:h-[18px]"/>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-4 md:p-5">
              {/* Image Preview */}
              <div className="aspect-[4/3] bg-slate-100 rounded-xl mb-4 md:mb-5 overflow-hidden border border-slate-200">
                <img src={pendingFile.url} alt="Preview" className="w-full h-full object-cover" />
              </div>

              <form onSubmit={saveUploadedReceipt} className="space-y-3 md:space-y-4">
                
                {/* Merchant Name */}
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1.5 md:mb-2">Merchant / Shop</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="e.g. Starbucks, Uber" 
                      value={manualMerchant}
                      onChange={(e) => setManualMerchant(e.target.value)}
                      className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1.5 md:mb-2">Total Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base md:text-lg">₹</span>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      placeholder="0.00" 
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="w-full pl-8 md:pl-9 pr-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-lg font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1.5 md:mb-2">Transaction Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <input 
                      type="date" 
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full"
                      required
                    />
                  </div>
                </div>

                {/* Include in Stats Toggle */}
                <div 
                  onClick={() => setIncludeInStats(!includeInStats)}
                  className={`p-3 md:p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    includeInStats 
                      ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`w-5 md:w-6 h-5 md:h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                    includeInStats 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'bg-white border-slate-300'
                  }`}>
                    {includeInStats && <CheckCircle size={12} className="text-white md:w-[14px] md:h-[14px]" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs md:text-sm font-bold ${includeInStats ? 'text-emerald-800' : 'text-slate-600'}`}>
                      Include in Analytics
                    </p>
                    <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">Track in spending charts</p>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="w-full py-3 md:py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 mt-4 md:mt-6 disabled:opacity-70 disabled:cursor-not-allowed transition-all text-sm md:text-base"
                >
                  {isUploading ? (
                    <><Loader2 size={16} className="animate-spin md:w-[18px] md:h-[18px]" /> Uploading...</>
                  ) : (
                    <><Save size={16} className="md:w-[18px] md:h-[18px]" /> Save Receipt</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default CustomerHome;