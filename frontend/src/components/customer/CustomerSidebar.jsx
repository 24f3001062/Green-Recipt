import React, { useMemo } from 'react';
import { Home, FileText, Calendar, PieChart, User, Receipt, Bell, Leaf, Sparkles, TreePine, Droplets } from 'lucide-react';

const CustomerSidebar = ({ activeTab, onNavigate, receipts = [] }) => {
  
  // Calculate Eco Impact based on receipts
  const ecoImpact = useMemo(() => {
    // Average paper receipt = 3.5g (including thermal paper coating)
    // Each digital receipt saves approximately 3.5g of paper
    const paperPerReceipt = 0.0035; // kg
    const treeSavingRate = 0.06; // kg paper per small tree saved (simplified)
    const waterPerKgPaper = 10; // liters of water per kg paper
    
    const totalReceipts = receipts.length;
    const paperSaved = totalReceipts * paperPerReceipt;
    const treeContribution = paperSaved / treeSavingRate;
    const waterSaved = paperSaved * waterPerKgPaper;
    
    // Get this month's receipts
    const now = new Date();
    const thisMonthReceipts = receipts.filter(r => {
      const receiptDate = new Date(r.date || r.createdAt);
      return receiptDate.getMonth() === now.getMonth() && 
             receiptDate.getFullYear() === now.getFullYear();
    });
    const monthlyPaperSaved = thisMonthReceipts.length * paperPerReceipt;
    
    return {
      totalReceipts,
      monthlyReceipts: thisMonthReceipts.length,
      paperSaved: paperSaved.toFixed(2),
      monthlyPaperSaved: monthlyPaperSaved.toFixed(2),
      treeContribution: treeContribution.toFixed(1),
      waterSaved: waterSaved.toFixed(0),
    };
  }, [receipts]);

  // Navigation Items
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'receipts', icon: FileText, label: 'Receipts' },
    { id: 'calendar', icon: Calendar, label: 'History' },
    { id: 'insights', icon: PieChart, label: 'Insights' },
    { id: 'notifications', icon: Bell, label: 'Alerts', hasBadge: true },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  // Mobile nav items (exclude notifications - shown in header)
  const mobileNavItems = navItems.filter(item => item.id !== 'notifications');

  return (
    <>
      {/* 🖥️ DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-200 h-screen sticky top-0">
        
        {/* Logo Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Leaf size={20} />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900">GreenReceipt</span>
              <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Go paperless</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => onNavigate(item.id)} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium relative group
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full" />
                )}
                
                <div className="relative">
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {item.hasBadge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
                
                {/* Hover glow */}
                {isActive && (
                  <div className="absolute inset-0 bg-emerald-500/5 rounded-xl pointer-events-none" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer - Eco Impact */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-700 mb-3">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase">Eco Impact</span>
            </div>
            
            {/* Main stat */}
            <p className="text-sm text-emerald-800 font-medium mb-3">
              You've saved <span className="font-bold text-emerald-700">{ecoImpact.monthlyPaperSaved}kg</span> of paper this month! 🌱
            </p>
            
            {/* Detailed stats */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-600 mb-0.5">
                  <Receipt size={12} />
                </div>
                <p className="text-lg font-bold text-emerald-700">{ecoImpact.monthlyReceipts}</p>
                <p className="text-[9px] text-emerald-600 font-medium">This Month</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-teal-600 mb-0.5">
                  <Droplets size={12} />
                </div>
                <p className="text-lg font-bold text-teal-700">{ecoImpact.waterSaved}L</p>
                <p className="text-[9px] text-teal-600 font-medium">Water Saved</p>
              </div>
            </div>
            
            {/* Total all-time */}
            <div className="mt-3 pt-3 border-t border-emerald-200/50 text-center">
              <p className="text-[10px] text-emerald-600">
                All time: <span className="font-bold">{ecoImpact.totalReceipts} receipts</span> • <span className="font-bold">{ecoImpact.paperSaved}kg</span> paper saved
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* 📱 MOBILE BOTTOM BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-40 safe-area-bottom">
        <div className="flex justify-around items-center px-2 py-2">
          {mobileNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all active:scale-95 relative
                  ${isActive ? 'text-emerald-600' : 'text-slate-400'}
                `}
              >
                {/* Active background */}
                {isActive && (
                  <div className="absolute inset-0 bg-emerald-50 rounded-xl" />
                )}
                
                <div className="relative z-10">
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] relative z-10 ${isActive ? 'font-bold text-emerald-700' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Safe area spacer for iOS */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>

      {/* Styles for safe area */}
      <style>{`
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0); }
        .h-safe-area-inset-bottom { height: env(safe-area-inset-bottom, 0); }
      `}</style>
    </>
  );
};

export default CustomerSidebar;