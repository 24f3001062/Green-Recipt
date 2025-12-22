import React, { useState, useEffect } from 'react';
import { ArrowUpRight, PlusCircle, ShoppingBag, Clock, X, Receipt } from 'lucide-react';
import { fetchMerchantReceipts } from '../../services/api';

const MerchantOverview = ({ onNavigate }) => {
  
  // 🟢 STATE
  const [sales, setSales] = useState([]);
  const [viewingReceipt, setViewingReceipt] = useState(null); // 👈 Track clicked bill

  // Load from backend with local fallback
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await fetchMerchantReceipts();
        // Handle paginated response structure
        const receiptsData = data.receipts || data || [];
        if (mounted) {
          setSales(receiptsData);
          localStorage.setItem('merchantSales', JSON.stringify(receiptsData));
        }
      } catch (error) {
        const saved = localStorage.getItem('merchantSales');
        if (mounted && saved) setSales(JSON.parse(saved));
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // 3️⃣ Filter Logic
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysBills = sales.filter(bill => bill.date === todayStr);
  const totalSales = todaysBills.reduce((sum, bill) => sum + (bill.total ?? bill.amount ?? 0), 0); 
  const billCount = todaysBills.length;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Good Morning!</h2>
          <p className="text-slate-500 text-sm">Here is what's happening today.</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs font-bold text-slate-400 uppercase">Current Date</p>
          <p className="text-slate-800 font-medium">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sales */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider relative z-10">Today's Sales</p>
              <h3 className="text-4xl font-bold text-slate-800 mt-2 relative z-10">₹{totalSales}</h3>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-bold relative z-10">
              <ArrowUpRight size={16} /> <span>Live Updates</span>
            </div>
        </div>

        {/* Count */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-40">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bills Generated</p>
              <h3 className="text-4xl font-bold text-slate-800 mt-2">{billCount}</h3>
            </div>
            <p className="text-slate-400 text-xs">Avg bill value: ₹{billCount > 0 ? Math.round(totalSales/billCount) : 0}</p>
        </div>

        {/* Action */}
        <button 
          onClick={() => onNavigate('billing')}
          className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex flex-col justify-center items-center gap-3 h-40 active:scale-95"
        >
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <PlusCircle size={24} />
          </div>
          <span className="font-bold text-lg">Create New Bill</span>
        </button>
      </div>

      {/* Recent Activity & Trending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-6">Recent Transactions (Today)</h3>
          <div className="space-y-4">
            {todaysBills.length === 0 ? <p className="text-slate-400 text-center py-8">No sales yet today.</p> : 
              todaysBills.slice(0, 5).map((bill, index) => (
                <div 
                    key={index} 
                    onClick={() => setViewingReceipt(bill)} // 👈 OPEN MODAL ON CLICK
                    className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0 cursor-pointer active:scale-95 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm group-hover:text-emerald-700 transition-colors">
                        Bill #{bill.id?.includes('-') ? bill.id.split('-')[1] : bill.id || bill._id}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10} /> {bill.time}</p>
                    </div>
                  </div>
                      <span className="font-bold text-slate-800">₹{bill.total ?? bill.amount}</span>
                </div>
              ))
            }
          </div>
        </div>
        
        {/* Trending (Static for now) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-6">Trending Items</h3>
            <div className="space-y-6">
               {[{ name: "Masala Chai", count: 42, color: "bg-orange-500" }, { name: "Veg Puff", count: 28, color: "bg-emerald-500" }].map((item, i) => (
                 <div key={i}>
                   <div className="flex justify-between text-xs font-bold text-slate-600 mb-1"><span>{item.name}</span><span>{item.count} sold</span></div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${item.color}`} style={{ width: `${item.count}%` }}></div></div>
                 </div>
               ))}
            </div>
        </div>
      </div>

      {/* 🧾 RECEIPT DETAIL MODAL */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-50 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-[popIn_0.2s_ease-out]">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <span className="text-sm font-bold flex items-center gap-2"><Receipt size={16}/> Receipt Detail</span>
              <button onClick={() => setViewingReceipt(null)} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20"><X size={16}/></button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto bg-white m-4 rounded-xl shadow-sm border border-slate-200">
               <div className="text-center border-b border-dashed border-slate-200 pb-4 mb-4">
                  <h2 className="text-xl font-bold text-slate-800">{viewingReceipt.merchant}</h2>
                  <p className="text-xs text-slate-400 mt-1">{viewingReceipt.date} at {viewingReceipt.time}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {viewingReceipt.id || viewingReceipt._id}</p>
               </div>

               {/* Items List */}
               <div className="space-y-3 mb-4">
                 {viewingReceipt.items && viewingReceipt.items.map((item, i) => (
                   <div key={i} className="flex justify-between text-sm">
                     {/* Handle short keys (n, q, p) or full keys (name, qty, price) */}
                     <span className="text-slate-600">
                        {(item.q || item.qty || item.quantity || 1)} x {item.n || item.name}
                     </span>
                     <span className="font-bold text-slate-800">
                        ₹{(item.p || item.price || item.unitPrice) * (item.q || item.qty || item.quantity || 1)}
                     </span>
                   </div>
                 ))}
               </div>

               <div className="border-t border-dashed border-slate-200 pt-4 flex justify-between items-center mb-6">
                 <span className="font-bold text-slate-500">TOTAL RECEIVED</span>
                  <span className="text-2xl font-bold text-slate-800">₹{viewingReceipt.total ?? viewingReceipt.amount}</span>
               </div>

               <div className="text-center">
                 <p className="text-[10px] text-emerald-600 font-bold uppercase bg-emerald-50 inline-block px-3 py-1 rounded-full">Payment Completed</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantOverview;