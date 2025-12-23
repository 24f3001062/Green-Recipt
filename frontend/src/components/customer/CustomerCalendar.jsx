import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  X, 
  Filter, 
  ChevronDown, 
  Check, 
  ShoppingBag, 
  Receipt, 
  QrCode, 
  Image,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
  MapPin,
  Phone as PhoneIcon
} from 'lucide-react';
import { MOCK_RECEIPTS } from './customerData';

// Helper for Dropdowns
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS = [2024, 2025, 2026];
const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

const CustomerCalendar = () => {
  // Load from LocalStorage
  const [receipts, setReceipts] = useState(() => {
    const saved = localStorage.getItem('customerReceipts');
    return saved ? JSON.parse(saved) : MOCK_RECEIPTS;
  });

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null); 
  
  const [openDropdown, setOpenDropdown] = useState(null); 
  const dropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calendar Engine
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();

  // Navigate months
  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setSelectedDateKey(null);
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setSelectedDateKey(null);
  };

  // Data Lookup
  const getDailyStats = (dateKey) => {
    const dailyReceipts = receipts.filter(r => r.date === dateKey);
    const total = dailyReceipts.filter(r => !r.excludeFromStats).reduce((sum, r) => sum + (r.amount || 0), 0);
    return { receipts: dailyReceipts, total, count: dailyReceipts.length };
  };

  const selectedDayStats = selectedDateKey ? getDailyStats(selectedDateKey) : { receipts: [], total: 0, count: 0 };

  // Monthly total
  const monthlyTotal = receipts
    .filter(r => {
      const [year, month] = (r.date || '').split('-');
      return parseInt(year) === selectedYear && parseInt(month) === selectedMonth + 1 && !r.excludeFromStats;
    })
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const monthlyCount = receipts.filter(r => {
    const [year, month] = (r.date || '').split('-');
    return parseInt(year) === selectedYear && parseInt(month) === selectedMonth + 1;
  }).length;

  // Render Calendar Grid
  const renderCalendarGrid = () => {
    const days = [];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Empty cells
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square bg-slate-50/50 rounded-lg md:rounded-xl"></div>);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const { total, count, receipts: dayReceipts } = getDailyStats(dateKey);
      const allExcluded = count > 0 && dayReceipts.every(r => r.excludeFromStats);
      const isToday = dateKey === todayKey;
      const isSelected = selectedDateKey === dateKey;
      const isWeekend = (firstDayOfMonth + day - 1) % 7 === 0 || (firstDayOfMonth + day - 1) % 7 === 6;

      // Color logic
      let bgClass = "bg-white hover:bg-slate-50";
      if (allExcluded) {
        bgClass = "bg-slate-100";
      } else if (total > 1000) {
        bgClass = "bg-gradient-to-br from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200";
      } else if (total > 100) {
        bgClass = "bg-emerald-50 hover:bg-emerald-100";
      } else if (count === 0) {
        bgClass = "bg-white/60";
      }

      days.push(
        <div 
          key={day}
          onClick={() => setSelectedDateKey(dateKey)}
          className={`
            aspect-square border rounded-lg md:rounded-xl p-1 md:p-2 cursor-pointer relative flex flex-col transition-all active:scale-95
            ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-lg z-10' : 'border-slate-100'}
            ${bgClass}
          `}
        >
          {/* Day number */}
          <span className={`text-xs md:text-sm font-bold leading-none ${
            isToday ? 'w-6 h-6 md:w-7 md:h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center' :
            count > 0 ? 'text-slate-700' : 
            isWeekend ? 'text-slate-300' : 'text-slate-400'
          }`}>
            {day}
          </span>
          
          {/* Desktop: Show stats */}
          {count > 0 && (
            <div className="hidden md:flex flex-col mt-auto">
              {!allExcluded && (
                <span className="text-xs font-bold text-emerald-700">₹{total.toLocaleString('en-IN')}</span>
              )}
              <span className="text-[10px] text-slate-400">{count} {count === 1 ? 'receipt' : 'receipts'}</span>
            </div>
          )}
          
          {/* Mobile: Show dot indicator */}
          {count > 0 && (
            <div className="md:hidden absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${allExcluded ? 'bg-slate-400' : 'bg-emerald-500'}`}></div>
              {count > 1 && <div className={`w-1.5 h-1.5 rounded-full ${allExcluded ? 'bg-slate-300' : 'bg-emerald-400'}`}></div>}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 min-h-[calc(100vh-8rem)] pb-24 md:pb-10" onClick={() => setOpenDropdown(null)}>
      
      {/* ========== CALENDAR GRID ========== */}
      <div className="flex-1 bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 flex flex-col">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CalendarIcon size={18} className="md:w-5 md:h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800">Spending History</h2>
              <p className="text-[10px] md:text-xs text-slate-400">{monthlyCount} receipts this month</p>
            </div>
          </div>
          
          {/* Month/Year Navigation */}
          <div className="flex items-center gap-2 w-full sm:w-auto" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={goToPrevMonth}
              className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="relative flex-1 sm:flex-none">
              <button 
                onClick={() => setOpenDropdown(openDropdown === 'month' ? null : 'month')} 
                className="w-full sm:w-32 flex items-center justify-between bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {MONTH_SHORT[selectedMonth]} {selectedYear}
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${openDropdown === 'month' ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === 'month' && (
                <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                  {MONTH_NAMES.map((m, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setSelectedMonth(i); setOpenDropdown(null); }} 
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 flex items-center justify-between ${selectedMonth === i ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600'}`}
                    >
                      {m} {selectedMonth === i && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={goToNextMonth}
              className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Monthly Summary (Mobile) */}
        <div className="md:hidden bg-gradient-to-r from-emerald-500 to-teal-500 p-4 rounded-xl mb-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium">{MONTH_NAMES[selectedMonth]} Total</p>
              <p className="text-2xl font-bold mt-0.5">₹{monthlyTotal.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-xs font-medium">Receipts</p>
              <p className="text-2xl font-bold mt-0.5">{monthlyCount}</p>
            </div>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center">
          {DAYS_SHORT.map((day, i) => (
            <div key={i} className={`text-[10px] md:text-xs font-bold uppercase tracking-wider py-2 ${i === 0 || i === 6 ? 'text-red-400' : 'text-slate-400'}`}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 flex-1">
          {renderCalendarGrid()}
        </div>
      </div>
      
      {/* ========== DETAILS PANEL ========== */}
      {selectedDateKey && (
        <div className="fixed inset-0 z-40 lg:static lg:inset-auto lg:z-0 flex items-end lg:items-stretch justify-center lg:justify-start bg-black/50 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none">
          <div className="w-full lg:w-80 bg-white rounded-t-3xl lg:rounded-2xl border lg:border-slate-100 shadow-2xl lg:shadow-sm flex flex-col h-[75vh] lg:h-auto overflow-hidden animate-slide-up lg:animate-none">
            
            {/* Panel Header */}
            <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">Selected Date</p>
                <h3 className="text-lg md:text-xl font-bold text-slate-800">
                  {new Date(selectedDateKey).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedDateKey(null)} 
                className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Total Spent */}
            <div className="p-4 md:p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100 shrink-0">
              <div className="flex items-center gap-2 text-emerald-800 mb-1">
                <Wallet size={16} />
                <span className="text-xs font-bold uppercase">Total Spent</span>
              </div>
              <p className="text-3xl font-bold text-emerald-700">₹{selectedDayStats.total.toLocaleString('en-IN')}</p>
              <p className="text-xs text-emerald-600 mt-1">{selectedDayStats.count} {selectedDayStats.count === 1 ? 'Receipt' : 'Receipts'}</p>
            </div>
            
            {/* Receipts List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
              {selectedDayStats.count === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <Filter size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-medium">No spending recorded</p>
                  <p className="text-xs text-slate-400 mt-1">This day is receipt-free!</p>
                </div>
              ) : (
                selectedDayStats.receipts.map((receipt) => (
                  <div 
                    key={receipt.id} 
                    onClick={() => setViewingReceipt(receipt)}
                    className={`flex items-center gap-3 p-3 border rounded-xl transition-all cursor-pointer active:scale-[0.98]
                      ${receipt.excludeFromStats 
                        ? 'border-slate-200 bg-slate-50 opacity-70' 
                        : 'border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30'
                      }
                    `}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      receipt.type === 'qr' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {receipt.type === 'qr' ? <QrCode size={16} /> : <Image size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">{receipt.merchant}</p>
                      <p className="text-[10px] text-slate-400">{receipt.time}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-800">₹{receipt.amount}</span>
                      {receipt.excludeFromStats && <EyeOff size={10} className="text-slate-400 ml-auto mt-0.5" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== RECEIPT DETAIL MODAL ========== */}
      {viewingReceipt && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setViewingReceipt(null)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Brand Color */}
            <div 
              className="p-4 md:p-5 flex justify-between items-center text-white relative overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${viewingReceipt.merchantSnapshot?.brandColor || (viewingReceipt.type === 'qr' ? '#10b981' : '#3b82f6')} 0%, ${viewingReceipt.merchantSnapshot?.brandColor || (viewingReceipt.type === 'qr' ? '#10b981' : '#3b82f6')}dd 100%)`
              }}
            >
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <div className="flex items-center gap-3 relative z-10">
                {viewingReceipt.merchantSnapshot?.logoUrl ? (
                  <div className="w-12 h-12 bg-white rounded-xl p-1.5 shadow-lg">
                    <img 
                      src={viewingReceipt.merchantSnapshot.logoUrl} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                      onError={(e) => e.target.parentElement.style.display = 'none'}
                    />
                  </div>
                ) : (
                  <div className="p-2 bg-white/20 rounded-xl">
                    {viewingReceipt.type === 'qr' ? <QrCode size={20} /> : <Image size={20} />}
                  </div>
                )}
                <div>
                  {viewingReceipt.merchantSnapshot?.receiptHeader && (
                    <span className="text-[10px] font-bold opacity-90 uppercase tracking-wide block">
                      {viewingReceipt.merchantSnapshot.receiptHeader}
                    </span>
                  )}
                  <h3 className="font-bold text-lg leading-tight">{viewingReceipt.merchant}</h3>
                  <span className="text-xs font-medium opacity-80">
                    {viewingReceipt.type === 'qr' ? 'Digital Receipt' : 'Uploaded Receipt'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setViewingReceipt(null)} 
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors relative z-10"
              >
                <X size={18}/>
              </button>
            </div>

            {/* Merchant Info Bar */}
            {(viewingReceipt.merchantSnapshot?.address || viewingReceipt.merchantSnapshot?.phone) && (
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {viewingReceipt.merchantSnapshot?.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} style={{ color: viewingReceipt.merchantSnapshot?.brandColor || '#10b981' }} />
                    {viewingReceipt.merchantSnapshot.address}
                  </span>
                )}
                {viewingReceipt.merchantSnapshot?.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon size={12} style={{ color: viewingReceipt.merchantSnapshot?.brandColor || '#10b981' }} />
                    {viewingReceipt.merchantSnapshot.phone}
                  </span>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-4 md:p-6 max-h-[60vh] overflow-y-auto">
              {/* Date */}
              <div className="text-center pb-4 mb-4 border-b border-dashed border-slate-200">
                <p className="text-xs text-slate-400">{viewingReceipt.date} at {viewingReceipt.time}</p>
                {viewingReceipt.excludeFromStats && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full mt-2">
                    <EyeOff size={10}/> Excluded from Stats
                  </span>
                )}
              </div>

              {/* Items or Image */}
              {viewingReceipt.type === 'qr' && viewingReceipt.items?.length > 0 ? (
                <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
                  {viewingReceipt.items.map((item, i) => {
                    const qty = item.qty || item.quantity || 1;
                    const price = item.price || item.unitPrice || 0;
                    return (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-600">{qty} x {item.name}</span>
                        <span className="font-bold text-slate-800">₹{price * qty}</span>
                      </div>
                    );
                  })}
                </div>
              ) : viewingReceipt.image && (
                <div className="aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 mb-4">
                  <img src={viewingReceipt.image} alt="Receipt" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Total */}
              <div 
                className="rounded-xl p-4 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'}10 0%, ${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'}05 100%)` }}
              >
                <div 
                  className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
                  style={{ backgroundColor: viewingReceipt.merchantSnapshot?.brandColor || '#10b981' }}
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500 uppercase">Total</span>
                  <span 
                    className="text-3xl font-bold"
                    style={{ color: viewingReceipt.merchantSnapshot?.brandColor || '#1e293b' }}
                  >
                    ₹{viewingReceipt.amount}
                  </span>
                </div>
              </div>

              {/* Footer Message */}
              {(viewingReceipt.merchantSnapshot?.receiptFooter || viewingReceipt.footer) && (
                <div 
                  className="text-center py-3 px-4 rounded-xl border border-dashed mt-4"
                  style={{ 
                    borderColor: `${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'}40`, 
                    backgroundColor: `${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'}05` 
                  }}
                >
                  <p className="text-sm italic text-slate-600">
                    "{viewingReceipt.merchantSnapshot?.receiptFooter || viewingReceipt.footer}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .animate-pop-in { animation: pop-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default CustomerCalendar;