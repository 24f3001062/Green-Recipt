// import React, { useState, useEffect, useRef, useMemo } from 'react';
// import { Calendar as CalendarIcon, X, Filter, ChevronDown, Check, Receipt, Store, MapPin, Phone as PhoneIcon, Wallet, ChevronLeft, ChevronRight } from 'lucide-react'; 
// import { fetchCustomerReceipts } from '../../services/api';
// import { MONTH_NAMES } from '../../utils/mockData';

// const CustomerCalendar = () => {
//   // 🟢 STATE
//   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
//   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
//   const [selectedDateKey, setSelectedDateKey] = useState(null);
//   const [monthData, setMonthData] = useState({});
//   const [receipts, setReceipts] = useState([]);
  
//   // MODAL STATE
//   const [viewingReceipt, setViewingReceipt] = useState(null);

//   // DROPDOWN STATE
//   const [openDropdown, setOpenDropdown] = useState(null); 
//   const dropdownRef = useRef(null);

//   const YEARS = [2024, 2025, 2026, 2027]; 

//   // 🔄 EFFECT: Load Receipts
//   useEffect(() => {
//     let mounted = true;
//     const load = async () => {
//       try {
//         const { data } = await fetchCustomerReceipts();
//         const receiptsData = data.receipts || data || [];
//         if (mounted) {
//           setReceipts(receiptsData);
//         }
//       } catch (error) {
//         // Silent fail or load from cache
//       }
//     };
//     load();
//     window.addEventListener('customer-receipts-updated', load);
//     return () => {
//       mounted = false;
//       window.removeEventListener('customer-receipts-updated', load);
//     };
//   }, []);

//   // 🔄 EFFECT: Process Data
//   useEffect(() => {
//     const data = {};
//     receipts.forEach((r) => {
//       const dateKey = r.date || (r.transactionDate ? r.transactionDate.split('T')[0] : null);
//       if (!dateKey) return;
//       const [y, m] = dateKey.split('-');
//       if (Number(y) !== selectedYear || Number(m) !== selectedMonth + 1) return;
//       if (!data[dateKey]) data[dateKey] = [];
//       data[dateKey].push(r);
//     });
//     setMonthData(data);
//     setSelectedDateKey(null);
//   }, [receipts, selectedYear, selectedMonth]);

//   // 🔄 EFFECT: Close dropdowns
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setOpenDropdown(null);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // Helper: Month Navigation
//   const changeMonth = (direction) => {
//     if (direction === 'prev') {
//         if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
//         else setSelectedMonth(selectedMonth - 1);
//     } else {
//         if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
//         else setSelectedMonth(selectedMonth + 1);
//     }
//   };

//   const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
//   const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay(); 

//   const selectedDayBills = useMemo(
//     () => (selectedDateKey ? monthData[selectedDateKey] || [] : []),
//     [selectedDateKey, monthData]
//   );
//   const selectedDayTotal = selectedDayBills.reduce(
//     (a, b) => a + (b.total ?? b.amount ?? 0),
//     0
//   );

//   // 🎨 RENDER GRID (Green Theme & Faded Inactive)
//   const renderCalendarGrid = () => {
//     const days = [];
    
//     // Empty slots
//     for (let i = 0; i < firstDayOfMonth; i++) {
//       days.push(<div key={`empty-${i}`} className="h-14 md:h-24"></div>);
//     }
    
//     // Days
//     for (let day = 1; day <= daysInMonth; day++) {
//       const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//       const dayData = monthData[dateKey] || [];
//       const dayTotal = dayData.reduce((a, b) => a + (b.total ?? b.amount ?? 0), 0);
//       const isSelected = selectedDateKey === dateKey;
//       const hasSales = dayTotal > 0;

//       days.push(
//         <div 
//           key={day}
//           onClick={() => setSelectedDateKey(dateKey)}
//           className="relative h-14 md:h-24 flex flex-col items-center justify-start pt-1 md:pt-2 cursor-pointer group"
//         >
//           {/* Day Circle */}
//           <div className={`
//              w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all duration-200 active:scale-90
//              ${isSelected 
//                 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 scale-110 z-10' // 👈 SELECTED: GREEN
//                 : hasSales 
//                     ? 'bg-white text-emerald-800 border-2 border-emerald-100' // 👈 SALES: WHITE/GREEN
//                     : 'text-slate-400 hover:bg-slate-50' // 👈 EMPTY: FADED (Light Opacity)
//              }
//           `}>
//              {day}
//           </div>

//           {/* Indicators */}
//           {hasSales && (
//             <div className="mt-1 flex flex-col items-center">
//                 {/* Mobile: Dot */}
//                 <div className={`
//                     md:hidden h-1.5 w-1.5 rounded-full 
//                     ${isSelected ? 'bg-white' : 'bg-emerald-500'} 
//                 `}></div>

//                 {/* Desktop: Price Pill */}
//                 <span className="hidden md:block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1">
//                     ₹{dayTotal >= 1000 ? (dayTotal/1000).toFixed(1) + 'k' : dayTotal}
//                 </span>
//             </div>
//           )}
//         </div>
//       );
//     }
//     return days;
//   };

//   return (
//     <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)] animate-fade-in relative pb-20 md:pb-0" onClick={() => setOpenDropdown(null)}> 
      
//       {/* 🔹 MAIN CALENDAR CARD */}
//       <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-4 md:p-6 flex flex-col overflow-hidden relative">
        
//         {/* Header */}
//         <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 z-20"> 
          
//           {/* Title Area */}
//           <div className="flex items-center justify-between w-full md:w-auto">
//              <div className="flex items-center gap-3">
//                 {/* 👈 HEADER ICON: GREEN */}
//                 <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
//                     <Wallet size={20} className="md:w-6 md:h-6" />
//                 </div>
//                 <div>
//                     <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Spending</h2>
//                     <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">Track Expenses</p>
//                 </div>
//              </div>
             
//              {/* Mobile Year Dropdown */}
//              <div className="md:hidden relative">
//                 <button 
//                   onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'mobile-year' ? null : 'mobile-year'); }}
//                   className="flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 active:scale-95 transition-transform"
//                 >
//                     {selectedYear}
//                     <ChevronDown size={14} className={`transition-transform ${openDropdown === 'mobile-year' ? 'rotate-180' : ''}`} />
//                 </button>
                
//                 {openDropdown === 'mobile-year' && (
//                     <div className="absolute top-full mt-2 right-0 w-24 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
//                         {YEARS.map(y => (
//                             <button 
//                                 key={y}
//                                 onClick={() => { setSelectedYear(y); setOpenDropdown(null); }}
//                                 className={`w-full text-center py-2.5 text-xs font-bold ${selectedYear === y ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
//                             >
//                                 {y}
//                             </button>
//                         ))}
//                     </div>
//                 )}
//              </div>
//           </div>

//           {/* Month Navigation */}
//           <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100 w-full md:w-auto justify-between">
//              <button onClick={() => changeMonth('prev')} className="p-2 md:p-3 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all active:scale-90"><ChevronLeft size={18} /></button>
             
//              <button onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'month' ? null : 'month'); }} className="flex-1 px-4 text-center font-bold text-slate-800 text-sm md:text-base flex items-center justify-center gap-2">
//                 {MONTH_NAMES[selectedMonth]}
//                 <ChevronDown size={14} className="text-slate-400" />
//              </button>

//              <button onClick={() => changeMonth('next')} className="p-2 md:p-3 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all active:scale-90"><ChevronRight size={18} /></button>
//           </div>
          
//           {/* Desktop Month Dropdown */}
//           {openDropdown === 'month' && (
//              <div className="absolute top-28 md:top-20 left-1/2 -translate-x-1/2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-80 overflow-y-auto z-50 animate-in fade-in zoom-in-95 p-2 grid grid-cols-2 gap-1">
//                 {MONTH_NAMES.map((m, i) => (
//                     <button key={i} onClick={() => { setSelectedMonth(i); setOpenDropdown(null); }} className={`px-2 py-3 text-xs font-bold rounded-lg transition-colors ${selectedMonth === i ? 'bg-emerald-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
//                         {m}
//                     </button>
//                 ))}
//              </div>
//           )}
//         </div>
        
//         {/* Days of Week */}
//         <div className="grid grid-cols-7 mb-2 text-center">
//           {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
//              <div key={i} className={`text-[10px] md:text-xs font-black uppercase ${i === 0 ? 'text-red-500' : 'text-slate-700'}`}>{day}</div>
//           ))}
//         </div>

//         {/* Calendar Grid */}
//         <div className="grid grid-cols-7 overflow-y-auto no-scrollbar pb-24 md:pb-0">
//           {renderCalendarGrid()}
//         </div>
//       </div>
      
//       {/* 🔹 BOTTOM SHEET DRAWER */}
//       <div 
//         className={`
//             fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-slate-100 transition-transform duration-300 ease-out
//             md:static md:inset-auto md:w-96 md:rounded-[2rem] md:border md:shadow-xl md:h-auto md:translate-y-0
//             ${selectedDateKey ? 'translate-y-0' : 'translate-y-full md:translate-y-0 md:hidden'}
//         `}
//         style={{ height: selectedDateKey ? 'auto' : '0' }}
//       >
//         <div className="md:hidden w-full flex justify-center pt-3 pb-1" onClick={() => setSelectedDateKey(null)}>
//             <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
//         </div>

//         <div className="p-6 md:h-full flex flex-col max-h-[70vh] md:max-h-none">
            
//             {/* Header */}
//             <div className="flex justify-between items-start mb-6">
//                 <div>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
//                         {selectedDateKey ? new Date(selectedDateKey).toLocaleDateString('en-US', { weekday: 'long' }) : ''}
//                     </p>
//                     <h3 className="text-2xl font-black text-slate-900">
//                         {selectedDateKey ? new Date(selectedDateKey).getDate() : ''} <span className="text-lg font-bold text-slate-400">{selectedDateKey ? new Date(selectedDateKey).toLocaleDateString('en-US', { month: 'long' }) : ''}</span>
//                     </h3>
//                 </div>
//                 <button onClick={() => setSelectedDateKey(null)} className="hidden md:block p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={18} /></button>
//             </div>

//             {/* Total Spent Card - GREEN THEME */}
//             <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/30 mb-6 flex justify-between items-center shrink-0">
//                 <div>
//                     <p className="text-xs font-bold text-emerald-100 uppercase">Total Spent</p>
//                     <p className="text-3xl font-black mt-1">₹{selectedDayTotal}</p>
//                 </div>
//                 <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
//                     <Wallet className="text-white" size={20} />
//                 </div>
//             </div>

//             {/* List */}
//             <div className="flex-1 overflow-y-auto space-y-3 pb-safe no-scrollbar">
//                 {selectedDayBills.length === 0 ? (
//                     <div className="text-center py-8 text-slate-400">
//                         <p className="text-sm font-bold">No spending activity</p>
//                     </div>
//                 ) : (
//                     selectedDayBills.map((bill, i) => {
//                         const itemName = bill.items?.[0]?.name || bill.items?.[0]?.n || 'Item';
//                         const storeName = bill.merchant || bill.shopName || "Unknown Store";
//                         const total = bill.total ?? bill.amount ?? 0;

//                         return (
//                             <div 
//                                 key={i} 
//                                 onClick={() => setViewingReceipt(bill)}
//                                 className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl active:scale-95 transition-transform cursor-pointer hover:border-emerald-300"
//                             >
//                                 <div className="flex items-center gap-4">
//                                     <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
//                                         <Store size={18} />
//                                     </div>
//                                     <div>
//                                         <p className="text-sm font-bold text-slate-900 leading-tight">{storeName}</p>
//                                         {/* <p className="text-xs text-slate-500 mt-0.5">{itemName}</p> */}
//                                     </div>
//                                 </div>
//                                 <span className="font-black text-slate-900">₹{total}</span>
//                             </div>
//                         );
//                     })
//                 )}
//             </div>
//         </div>
//       </div>

//       {/* 🧾 RECEIPT MODAL (Keeping consistent with rest of app) */}
//       {viewingReceipt && (
//         <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
//           <div className="bg-slate-50 w-full md:max-w-md rounded-t-[2rem] md:rounded-[2rem] overflow-hidden shadow-2xl relative animate-[slideUp_0.3s_ease-out] md:animate-[popIn_0.2s_ease-out] max-h-[90vh] flex flex-col">
             
//              {/* Modal Header */}
//              <div className="text-white p-5 flex justify-between items-center shrink-0"
//               style={{ background: `linear-gradient(135deg, ${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'} 0%, ${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'}dd 100%)` }}>
//               <div className="flex items-center gap-3 relative z-10">
//                 <div className="p-2 bg-white/20 rounded-xl"><Receipt size={18}/></div>
//                 <span className="text-base font-bold">Receipt Detail</span>
//               </div>
//               <button onClick={() => setViewingReceipt(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 relative z-10"><X size={18}/></button>
//             </div>
            
//             <div className="p-6 overflow-y-auto bg-white m-2 rounded-[1.5rem] shadow-sm border border-slate-100 relative mb-safe">
//                {/* Receipt Info */}
//                <div className="text-center border-b border-dashed border-slate-200 pb-5 mb-5">
//                   <h2 className="text-2xl font-black text-slate-900 mb-1">{viewingReceipt.merchant}</h2>
//                   <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wide">
//                      <span>{viewingReceipt.date}</span>
//                      <span>•</span>
//                      <span>{viewingReceipt.time}</span>
//                   </div>
//                </div>
               
//                {/* Items */}
//                <div className="space-y-3 mb-6">
//                  {viewingReceipt.items && viewingReceipt.items.map((item, i) => (
//                    <div key={i} className="flex justify-between text-sm items-center">
//                      <div className="flex items-center gap-2">
//                         <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-bold text-slate-600">{item.q || item.quantity || 1}</span>
//                         <span className="font-bold text-slate-700">{item.n || item.name}</span>
//                      </div>
//                      <span className="font-bold text-slate-900">₹{(item.p || item.price || item.unitPrice) * (item.q || item.quantity || 1)}</span>
//                    </div>
//                  ))}
//                </div>

//                {/* Total */}
//                <div className="border-t-2 border-dashed border-slate-100 pt-4 flex justify-between items-center mb-6">
//                  <span className="font-black text-slate-400 text-xs uppercase tracking-wider">Total Paid</span>
//                  <span className="text-3xl font-black text-slate-900">₹{viewingReceipt.total ?? viewingReceipt.amount}</span>
//                </div>
               
//                {/* Payment Method */}
//                <div className="text-center">
//                   <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wide">
//                     <Check size={12} strokeWidth={4} /> Paid via {viewingReceipt.paymentMethod || 'Cash'}
//                   </span>
//                </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CustomerCalendar;


import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, X, Filter, ChevronDown, Check, Receipt, Store, MapPin, Phone as PhoneIcon, Wallet, ChevronLeft, ChevronRight } from 'lucide-react'; 
import { fetchCustomerReceipts } from '../../services/api';
import { MONTH_NAMES } from '../../utils/mockData';

const CustomerCalendar = () => {
  // 🟢 STATE
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [monthData, setMonthData] = useState({});
  const [receipts, setReceipts] = useState([]);
  
  // MODAL STATE
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // DROPDOWN STATE
  const [openDropdown, setOpenDropdown] = useState(null); 
  const dropdownRef = useRef(null);

  const YEARS = [2024, 2025, 2026, 2027]; 

  // 🔄 EFFECT: Load Receipts
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await fetchCustomerReceipts();
        const receiptsData = data.receipts || data || [];
        if (mounted) {
          setReceipts(receiptsData);
        }
      } catch (error) {
        // Silent fail
      }
    };
    load();
    window.addEventListener('customer-receipts-updated', load);
    return () => {
      mounted = false;
      window.removeEventListener('customer-receipts-updated', load);
    };
  }, []);

  // 🔄 EFFECT: Process Data
  useEffect(() => {
    const data = {};
    receipts.forEach((r) => {
      const dateKey = r.date || (r.transactionDate ? r.transactionDate.split('T')[0] : null);
      if (!dateKey) return;
      const [y, m] = dateKey.split('-');
      if (Number(y) !== selectedYear || Number(m) !== selectedMonth + 1) return;
      if (!data[dateKey]) data[dateKey] = [];
      data[dateKey].push(r);
    });
    setMonthData(data);
    setSelectedDateKey(null);
  }, [receipts, selectedYear, selectedMonth]);

  // 🔄 EFFECT: Close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper: Month Navigation
  const changeMonth = (direction) => {
    if (direction === 'prev') {
        if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
        else setSelectedMonth(selectedMonth - 1);
    } else {
        if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
        else setSelectedMonth(selectedMonth + 1);
    }
  };

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay(); 

  const selectedDayBills = useMemo(
    () => (selectedDateKey ? monthData[selectedDateKey] || [] : []),
    [selectedDateKey, monthData]
  );
  const selectedDayTotal = selectedDayBills.reduce(
    (a, b) => a + (b.total ?? b.amount ?? 0),
    0
  );

  // 🎨 RENDER GRID (Green Theme & Faded Inactive)
  const renderCalendarGrid = () => {
    const days = [];
    
    // Empty slots
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-14 md:h-24"></div>);
    }
    
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = monthData[dateKey] || [];
      const dayTotal = dayData.reduce((a, b) => a + (b.total ?? b.amount ?? 0), 0);
      const isSelected = selectedDateKey === dateKey;
      const hasSales = dayTotal > 0;

      days.push(
        <div 
          key={day}
          onClick={() => setSelectedDateKey(dateKey)}
          className="relative h-14 md:h-24 flex flex-col items-center justify-start pt-1 md:pt-2 cursor-pointer group"
        >
          {/* Day Circle */}
          <div className={`
             w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all duration-200 active:scale-90
             ${isSelected 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 scale-110 z-10' 
                : hasSales 
                    ? 'bg-white text-emerald-800 border-2 border-emerald-100' 
                    : 'text-slate-400 hover:bg-slate-50'
             }
          `}>
             {day}
          </div>

          {/* Indicators */}
          {hasSales && (
            <div className="mt-1 flex flex-col items-center">
                {/* Mobile: Dot */}
                <div className={`
                    md:hidden h-1.5 w-1.5 rounded-full 
                    ${isSelected ? 'bg-white' : 'bg-emerald-500'} 
                `}></div>

                {/* Desktop: Price Pill */}
                <span className="hidden md:block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1">
                    ₹{dayTotal >= 1000 ? (dayTotal/1000).toFixed(1) + 'k' : dayTotal}
                </span>
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)] animate-fade-in relative pb-20 md:pb-0" onClick={() => setOpenDropdown(null)}> 
      
      {/* 🔹 MAIN CALENDAR CARD */}
      <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-4 md:p-6 flex flex-col overflow-hidden relative">
        
        {/* HEADER SECTION (Matched Merchant Layout) */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 z-20"> 
          
          {/* 1. Title Area */}
          <div className="flex items-center justify-between w-full md:w-auto">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                    <Wallet size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Spending</h2>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">Track Expenses</p>
                </div>
             </div>
             
             {/* Mobile Year Dropdown */}
             <div className="md:hidden relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'mobile-year' ? null : 'mobile-year'); }}
                  className="flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 active:scale-95 transition-transform"
                >
                    {selectedYear}
                    <ChevronDown size={14} className={`transition-transform ${openDropdown === 'mobile-year' ? 'rotate-180' : ''}`} />
                </button>
                
                {openDropdown === 'mobile-year' && (
                    <div className="absolute top-full mt-2 right-0 w-24 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                        {YEARS.map(y => (
                            <button 
                                key={y}
                                onClick={() => { setSelectedYear(y); setOpenDropdown(null); }}
                                className={`w-full text-center py-2.5 text-xs font-bold ${selectedYear === y ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* 2. Controls (Desktop) */}
          <div className="w-full md:w-auto flex gap-2">
             
             {/* MONTH SELECTOR */}
             <div className="flex-1 flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100 relative">
                <button onClick={() => changeMonth('prev')} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all active:scale-90"><ChevronLeft size={18} /></button>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'month' ? null : 'month'); }} 
                  className="flex-1 px-2 text-center font-bold text-slate-800 text-sm flex items-center justify-center gap-1"
                >
                   {MONTH_NAMES[selectedMonth]}
                   <ChevronDown size={14} className="text-slate-400" />
                </button>
                
                {/* Desktop Month Dropdown Menu */}
                {openDropdown === 'month' && (
                  <div className="absolute top-full mt-2 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 p-1 grid grid-cols-1">
                      {MONTH_NAMES.map((m, i) => (
                          <button key={i} onClick={() => { setSelectedMonth(i); setOpenDropdown(null); }} className={`px-3 py-2 text-xs font-bold text-left rounded-lg ${selectedMonth === i ? 'bg-emerald-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
                              {m}
                          </button>
                      ))}
                  </div>
                )}

                <button onClick={() => changeMonth('next')} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all active:scale-90"><ChevronRight size={18} /></button>
             </div>

             {/* YEAR SELECTOR (Desktop) */}
             <div className="relative w-24 hidden md:block">
                <button 
                  onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'year' ? null : 'year'); }}
                  className="w-full h-full bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between px-3 text-sm font-bold text-slate-800"
                >
                    {selectedYear}
                    <ChevronDown size={14} className="text-slate-400" />
                </button>
                
                {openDropdown === 'year' && (
                  <div className="absolute top-full mt-2 right-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1">
                      {YEARS.map(y => (
                          <button key={y} onClick={() => { setSelectedYear(y); setOpenDropdown(null); }} className={`w-full py-2 text-xs font-bold rounded-lg mb-1 last:mb-0 ${selectedYear === y ? 'bg-emerald-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
                              {y}
                          </button>
                      ))}
                  </div>
                )}
             </div>

          </div>
        </div>
        
        {/* Days Header */}
        <div className="grid grid-cols-7 mb-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
             <div key={i} className={`text-[10px] md:text-xs font-black uppercase ${i === 0 ? 'text-red-500 ' : 'text-slate-600'}`}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 overflow-y-auto no-scrollbar pb-24 md:pb-0">
          {renderCalendarGrid()}
        </div>
      </div>
      
      {/* 🔹 BOTTOM SHEET DRAWER */}
      <div 
        className={`
            fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-slate-100 transition-transform duration-300 ease-out
            md:static md:inset-auto md:w-96 md:rounded-[2rem] md:border md:shadow-xl md:h-auto md:translate-y-0
            ${selectedDateKey ? 'translate-y-0' : 'translate-y-full md:translate-y-0 md:hidden'}
        `}
        style={{ height: selectedDateKey ? 'auto' : '0' }}
      >
        <div className="md:hidden w-full flex justify-center pt-3 pb-1" onClick={() => setSelectedDateKey(null)}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        <div className="p-6 md:h-full flex flex-col max-h-[70vh] md:max-h-none">
            
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {selectedDateKey ? new Date(selectedDateKey).toLocaleDateString('en-US', { weekday: 'long' }) : ''}
                    </p>
                    <h3 className="text-2xl font-black text-slate-900">
                        {selectedDateKey ? new Date(selectedDateKey).getDate() : ''} <span className="text-lg font-bold text-slate-400">{selectedDateKey ? new Date(selectedDateKey).toLocaleDateString('en-US', { month: 'long' }) : ''}</span>
                    </h3>
                </div>
                <button onClick={() => setSelectedDateKey(null)} className="hidden md:block p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={18} /></button>
            </div>

            {/* Total Spent Card - GREEN THEME */}
            <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/30 mb-6 flex justify-between items-center shrink-0">
                <div>
                    <p className="text-xs font-bold text-emerald-100 uppercase">Total Spent</p>
                    <p className="text-3xl font-black mt-1">₹{selectedDayTotal}</p>
                </div>
                <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Wallet className="text-white" size={20} />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-safe no-scrollbar">
                {selectedDayBills.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <p className="text-sm font-bold">No spending activity</p>
                    </div>
                ) : (
                    selectedDayBills.map((bill, i) => {
                        const storeName = bill.merchant || bill.shopName || "Unknown Store";
                        const total = bill.total ?? bill.amount ?? 0;

                        return (
                            <div 
                                key={i} 
                                onClick={() => setViewingReceipt(bill)}
                                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl active:scale-95 transition-transform cursor-pointer hover:border-emerald-300"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                                        <Store size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 leading-tight">{storeName}</p>
                                    </div>
                                </div>
                                <span className="font-black text-slate-900">₹{total}</span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>

      {/* 🧾 RECEIPT MODAL */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-50 w-full md:max-w-md rounded-t-[2rem] md:rounded-[2rem] overflow-hidden shadow-2xl relative animate-[slideUp_0.3s_ease-out] md:animate-[popIn_0.2s_ease-out] max-h-[90vh] flex flex-col">
             
             {/* Modal Header */}
             <div className="text-white p-5 flex justify-between items-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'} 0%, ${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'}dd 100%)` }}>
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-white/20 rounded-xl"><Receipt size={18}/></div>
                <span className="text-base font-bold">Receipt Detail</span>
              </div>
              <button onClick={() => setViewingReceipt(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 relative z-10"><X size={18}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-white m-2 rounded-[1.5rem] shadow-sm border border-slate-100 relative mb-safe">
               <div className="text-center border-b border-dashed border-slate-200 pb-5 mb-5">
                  <h2 className="text-2xl font-black text-slate-900 mb-1">{viewingReceipt.merchant}</h2>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wide">
                     <span>{viewingReceipt.date}</span>
                     <span>•</span>
                     <span>{viewingReceipt.time}</span>
                  </div>
               </div>
               
               <div className="space-y-3 mb-6">
                 {viewingReceipt.items && viewingReceipt.items.map((item, i) => (
                   <div key={i} className="flex justify-between text-sm items-center">
                     <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-bold text-slate-600">{item.q || item.quantity || 1}</span>
                        <span className="font-bold text-slate-700">{item.n || item.name}</span>
                     </div>
                     <span className="font-bold text-slate-900">₹{(item.p || item.price || item.unitPrice) * (item.q || item.quantity || 1)}</span>
                   </div>
                 ))}
               </div>

               <div className="border-t-2 border-dashed border-slate-100 pt-4 flex justify-between items-center mb-6">
                 <span className="font-black text-slate-400 text-xs uppercase tracking-wider">Total Paid</span>
                 <span className="text-3xl font-black text-slate-900">₹{viewingReceipt.total ?? viewingReceipt.amount}</span>
               </div>
               
               <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wide">
                    <Check size={12} strokeWidth={4} /> Paid via {viewingReceipt.paymentMethod || 'Cash'}
                  </span>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCalendar;