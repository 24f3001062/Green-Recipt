import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, PlusCircle, ShoppingBag, Clock, X, Receipt, User, TrendingUp, Flame, MapPin, Phone as PhoneIcon } from 'lucide-react';
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

  // 🔥 Calculate REAL Trending Items from sales data
  const trendingItems = useMemo(() => {
    // Get items from all sales (not just today - last 7 days for better trends)
    const allItems = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    sales.forEach(bill => {
      // Only include recent sales
      if (bill.date >= sevenDaysAgoStr && bill.items) {
        bill.items.forEach(item => {
          const name = item.name || item.n || 'Unknown Item';
          const qty = item.qty || item.quantity || item.q || 1;
          const price = item.price || item.unitPrice || item.p || 0;
          
          if (!allItems[name]) {
            allItems[name] = { name, count: 0, revenue: 0 };
          }
          allItems[name].count += qty;
          allItems[name].revenue += price * qty;
        });
      }
    });

    // Convert to array and sort by count
    const sortedItems = Object.values(allItems)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate percentage based on top seller
    const maxCount = sortedItems[0]?.count || 1;
    return sortedItems.map((item, index) => ({
      ...item,
      percentage: Math.round((item.count / maxCount) * 100),
      color: ['bg-emerald-500', 'bg-blue-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500'][index % 5]
    }));
  }, [sales]);

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
                      {bill.customerName ? <User size={18} /> : <ShoppingBag size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm group-hover:text-emerald-700 transition-colors">
                        {bill.customerName || 'Walk-in Customer'}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> {bill.time}
                        {bill.items?.length > 0 && (
                          <span className="ml-1">• {bill.items.length} item{bill.items.length > 1 ? 's' : ''}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800">₹{bill.total ?? bill.amount}</span>
                    <p className="text-[10px] text-slate-400 capitalize">{bill.paymentMethod || 'cash'}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        
        {/* Trending Items (Real Data) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Trending Items</h3>
              <div className="flex items-center gap-1 text-orange-500">
                <Flame size={16} />
                <span className="text-xs font-bold">This Week</span>
              </div>
            </div>
            <div className="space-y-5">
               {trendingItems.length === 0 ? (
                 <p className="text-slate-400 text-center py-4 text-sm">No sales data yet</p>
               ) : (
                 trendingItems.map((item, i) => (
                   <div key={i}>
                     <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                       <span className="flex items-center gap-2">
                         <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                         {item.name}
                       </span>
                       <span className="text-slate-500">{item.count} sold • ₹{item.revenue}</span>
                     </div>
                     <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className={`h-full ${item.color} rounded-full transition-all duration-700`} 
                         style={{ width: `${item.percentage}%` }}
                       />
                     </div>
                   </div>
                 ))
               )}
            </div>
        </div>
      </div>

      {/* 🧾 RECEIPT DETAIL MODAL */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-50 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-[popIn_0.2s_ease-out]">
            
            {/* Header with Brand Color */}
            <div 
              className="text-white p-4 flex justify-between items-center relative overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'} 0%, ${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'}dd 100%)`
              }}
            >
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <div className="flex items-center gap-3 relative z-10">
                {viewingReceipt.merchantSnapshot?.logoUrl ? (
                  <div className="w-10 h-10 bg-white rounded-lg p-1 shadow">
                    <img 
                      src={viewingReceipt.merchantSnapshot.logoUrl} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                      onError={(e) => e.target.parentElement.style.display = 'none'}
                    />
                  </div>
                ) : (
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Receipt size={16}/>
                  </div>
                )}
                <span className="text-sm font-bold">Receipt Detail</span>
              </div>
              <button onClick={() => setViewingReceipt(null)} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 relative z-10"><X size={16}/></button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto bg-white m-4 rounded-xl shadow-sm border border-slate-200 relative">
               {/* Brand Color Accent */}
               <div 
                 className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
                 style={{ backgroundColor: viewingReceipt.merchantSnapshot?.brandColor || '#10b981' }}
               />
               
               <div className="text-center border-b border-dashed border-slate-200 pb-4 mb-4">
                  {/* Header Text */}
                  {viewingReceipt.merchantSnapshot?.receiptHeader && (
                    <p 
                      className="text-[10px] font-bold uppercase tracking-wide mb-1"
                      style={{ color: viewingReceipt.merchantSnapshot?.brandColor || '#10b981' }}
                    >
                      {viewingReceipt.merchantSnapshot.receiptHeader}
                    </p>
                  )}
                  <h2 
                    className="text-xl font-bold"
                    style={{ color: viewingReceipt.merchantSnapshot?.brandColor || '#1e293b' }}
                  >
                    {viewingReceipt.merchant}
                  </h2>
                  
                  {/* Merchant Info */}
                  {(viewingReceipt.merchantSnapshot?.address || viewingReceipt.merchantSnapshot?.phone) && (
                    <div className="mt-2 space-y-1">
                      {viewingReceipt.merchantSnapshot?.address && (
                        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                          <MapPin size={10} /> {viewingReceipt.merchantSnapshot.address}
                        </p>
                      )}
                      {viewingReceipt.merchantSnapshot?.phone && (
                        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                          <PhoneIcon size={10} /> {viewingReceipt.merchantSnapshot.phone}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-slate-400 mt-2">{viewingReceipt.date} at {viewingReceipt.time}</p>
                  {viewingReceipt.customerName && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-emerald-600">
                      <User size={14} />
                      <span className="text-sm font-semibold">{viewingReceipt.customerName}</span>
                    </div>
                  )}
                  {!viewingReceipt.customerName && (
                    <p className="text-xs text-slate-400 mt-2">Walk-in Customer</p>
                  )}
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

               <div className="border-t border-dashed border-slate-200 pt-4 flex justify-between items-center mb-4">
                 <span className="font-bold text-slate-500">TOTAL RECEIVED</span>
                 <span 
                   className="text-2xl font-bold"
                   style={{ color: viewingReceipt.merchantSnapshot?.brandColor || '#1e293b' }}
                 >
                   ₹{viewingReceipt.total ?? viewingReceipt.amount}
                 </span>
               </div>

               {/* Footer Message */}
               {viewingReceipt.merchantSnapshot?.receiptFooter && (
                 <div 
                   className="text-center py-2 px-3 rounded-lg border border-dashed mb-4"
                   style={{ 
                     borderColor: `${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'}40`,
                     backgroundColor: `${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'}08`
                   }}
                 >
                   <p className="text-xs italic text-slate-500">
                     "{viewingReceipt.merchantSnapshot.receiptFooter}"
                   </p>
                 </div>
               )}

               <div className="text-center">
                 <p 
                   className="text-[10px] font-bold uppercase inline-block px-3 py-1 rounded-full"
                   style={{ 
                     backgroundColor: `${viewingReceipt.merchantSnapshot?.brandColor || '#10b981'}15`,
                     color: viewingReceipt.merchantSnapshot?.brandColor || '#10b981'
                   }}
                 >
                   Paid via {viewingReceipt.paymentMethod === 'upi' ? 'UPI' : viewingReceipt.paymentMethod === 'cash' ? 'Cash' : viewingReceipt.paymentMethod || 'Cash'}
                 </p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantOverview;