import React, { useState } from 'react';
import { Bell, Clock, AlertTriangle, Leaf, Tag, CheckCircle, Sparkles, Shield, RotateCcw, X, Check, Filter, ChevronDown } from 'lucide-react';

const CustomerNotifications = () => {
  
  // Notification data
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'warranty',
      title: 'Warranty Expiring Soon',
      message: 'The warranty for "Sony WH-1000XM5" expires in 3 days. Need to claim repairs?',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      type: 'budget',
      title: 'Monthly Budget Alert',
      message: 'You have used 85% of your "Eating Out" budget for December.',
      time: '5 hours ago',
      read: false
    },
    {
      id: 3,
      type: 'eco',
      title: 'Green Milestone Reached! 🌱',
      message: 'Congratulations! You have saved 1kg of paper receipts this year.',
      time: 'Yesterday',
      read: true
    },
    {
      id: 4,
      type: 'return',
      title: 'Return Window Closing',
      message: 'Last chance to return items from your "Zara" purchase on Dec 10.',
      time: '2 days ago',
      read: true
    },
    {
      id: 5,
      type: 'eco',
      title: 'Weekly Summary Ready',
      message: 'Your weekly spending summary is ready. You spent ₹4,320 across 12 receipts.',
      time: '3 days ago',
      read: true
    }
  ]);

  const [filter, setFilter] = useState('all');

  // Mark all as read
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Mark single as read
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Delete notification
  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Get style based on type
  const getStyle = (type) => {
    switch(type) {
      case 'warranty': return { icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', gradient: 'from-amber-500 to-orange-500' };
      case 'budget': return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', gradient: 'from-red-500 to-rose-500' };
      case 'eco': return { icon: Leaf, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', gradient: 'from-emerald-500 to-teal-500' };
      case 'return': return { icon: RotateCcw, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', gradient: 'from-blue-500 to-indigo-500' };
      default: return { icon: Tag, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', gradient: 'from-slate-500 to-slate-600' };
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = filter === 'all' 
    ? notifications 
    : filter === 'unread' 
      ? notifications.filter(n => !n.read)
      : notifications.filter(n => n.type === filter);

  return (
    <div className="max-w-3xl mx-auto space-y-5 md:space-y-6 pb-24 md:pb-10">
      
      {/* ========== HEADER ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            Smart Alerts
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{unreadCount}</span>
            )}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Stay on top of warranties, budgets & more</p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={markAllRead}
            className="text-xs md:text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors px-3 py-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 self-start sm:self-auto"
          >
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* ========== FILTER TABS ========== */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: 'Unread', count: unreadCount },
          { id: 'warranty', label: 'Warranty' },
          { id: 'budget', label: 'Budget' },
          { id: 'eco', label: 'Eco' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filter === f.id 
                ? 'bg-slate-800 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
            {f.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.id ? 'bg-white/20' : 'bg-red-500 text-white'}`}>{f.count}</span>}
          </button>
        ))}
      </div>

      {/* ========== NOTIFICATIONS LIST ========== */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 md:py-16">
            <div className="w-16 md:w-20 h-16 md:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-slate-300 md:w-8 md:h-8" />
            </div>
            <p className="font-semibold text-slate-600 mb-1">No notifications</p>
            <p className="text-sm text-slate-400">You're all caught up!</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const style = getStyle(notif.type);
            const Icon = style.icon;

            return (
              <div 
                key={notif.id} 
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`p-4 md:p-5 rounded-xl md:rounded-2xl border transition-all relative overflow-hidden group cursor-pointer
                  ${notif.read 
                    ? 'bg-white border-slate-100 hover:border-slate-200' 
                    : `bg-white ${style.border} shadow-sm hover:shadow-md`
                  }
                `}
              >
                {/* Unread indicator bar */}
                {!notif.read && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${style.gradient}`} />
                )}

                <div className="flex gap-3 md:gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                    <Icon size={18} className="md:w-5 md:h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-bold text-sm md:text-base ${notif.read ? 'text-slate-600' : 'text-slate-800'}`}>
                        {notif.title}
                      </h3>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!notif.read && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                          className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-slate-100 transition-all"
                        >
                          <X size={14} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                    
                    <p className={`text-xs md:text-sm mt-1 leading-relaxed ${notif.read ? 'text-slate-400' : 'text-slate-600'}`}>
                      {notif.message}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-2 md:mt-3">
                      <p className="text-[10px] md:text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={10} className="md:w-3 md:h-3" /> {notif.time}
                      </p>
                      <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.color}`}>
                        {notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========== ALL CAUGHT UP ========== */}
      {filteredNotifications.length > 0 && unreadCount === 0 && (
        <div className="text-center py-6 md:py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 rounded-full">
            <Sparkles size={16} className="text-emerald-500" />
            <span className="text-sm font-bold text-emerald-700">You're all caught up!</span>
          </div>
        </div>
      )}

      {/* Scrollbar hide style */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default CustomerNotifications;