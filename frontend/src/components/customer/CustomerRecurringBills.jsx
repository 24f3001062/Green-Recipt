import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Plus, X, Calendar, Clock, DollarSign, Bell, Pause, Play,
  Trash2, Edit3, Check, AlertTriangle, ChevronDown, ChevronRight,
  Zap, CreditCard, Wifi, Shield, Home, Smartphone, FileText,
  MoreHorizontal, CheckCircle, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';
import {
  fetchBills, createBill, updateBill, deleteBill,
  toggleBillStatus, markBillPaid, fetchUpcomingBills
} from '../../services/api';
import toast from 'react-hot-toast';

// ============== CATEGORY CONFIG ==============
const CATEGORY_CONFIG = {
  utilities: { icon: Zap, color: 'amber', label: 'Utilities' },
  subscriptions: { icon: RefreshCw, color: 'purple', label: 'Subscriptions' },
  insurance: { icon: Shield, color: 'blue', label: 'Insurance' },
  rent: { icon: Home, color: 'emerald', label: 'Rent' },
  loan: { icon: FileText, color: 'red', label: 'Loan/EMI' },
  credit_card: { icon: CreditCard, color: 'slate', label: 'Credit Card' },
  phone: { icon: Smartphone, color: 'indigo', label: 'Phone' },
  internet: { icon: Wifi, color: 'cyan', label: 'Internet' },
  other: { icon: FileText, color: 'gray', label: 'Other' },
};

const CYCLE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom (Days)' },
];

const REMINDER_OFFSET_OPTIONS = [
  { value: 0, label: 'On due date' },
  { value: 1, label: '1 day before' },
  { value: 2, label: '2 days before' },
  { value: 3, label: '3 days before' },
  { value: 5, label: '5 days before' },
  { value: 7, label: '1 week before' },
];

// ============== SKELETON LOADER ==============
const BillsSkeleton = ({ isDark }) => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className={`h-24 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
    ))}
  </div>
);

// ============== BILL CARD COMPONENT ==============
const BillCard = ({ bill, isDark, onEdit, onDelete, onToggleStatus, onMarkPaid }) => {
  const [showActions, setShowActions] = useState(false);
  const config = CATEGORY_CONFIG[bill.category] || CATEGORY_CONFIG.other;
  const Icon = config.icon;
  
  const colorStyles = {
    amber: { bg: isDark ? 'bg-amber-900/30' : 'bg-amber-50', text: isDark ? 'text-amber-400' : 'text-amber-600', border: isDark ? 'border-amber-800' : 'border-amber-200' },
    purple: { bg: isDark ? 'bg-purple-900/30' : 'bg-purple-50', text: isDark ? 'text-purple-400' : 'text-purple-600', border: isDark ? 'border-purple-800' : 'border-purple-200' },
    blue: { bg: isDark ? 'bg-blue-900/30' : 'bg-blue-50', text: isDark ? 'text-blue-400' : 'text-blue-600', border: isDark ? 'border-blue-800' : 'border-blue-200' },
    emerald: { bg: isDark ? 'bg-emerald-900/30' : 'bg-emerald-50', text: isDark ? 'text-emerald-400' : 'text-emerald-600', border: isDark ? 'border-emerald-800' : 'border-emerald-200' },
    red: { bg: isDark ? 'bg-red-900/30' : 'bg-red-50', text: isDark ? 'text-red-400' : 'text-red-600', border: isDark ? 'border-red-800' : 'border-red-200' },
    slate: { bg: isDark ? 'bg-slate-700' : 'bg-slate-100', text: isDark ? 'text-slate-400' : 'text-slate-600', border: isDark ? 'border-slate-600' : 'border-slate-200' },
    indigo: { bg: isDark ? 'bg-indigo-900/30' : 'bg-indigo-50', text: isDark ? 'text-indigo-400' : 'text-indigo-600', border: isDark ? 'border-indigo-800' : 'border-indigo-200' },
    cyan: { bg: isDark ? 'bg-cyan-900/30' : 'bg-cyan-50', text: isDark ? 'text-cyan-400' : 'text-cyan-600', border: isDark ? 'border-cyan-800' : 'border-cyan-200' },
    gray: { bg: isDark ? 'bg-gray-700' : 'bg-gray-100', text: isDark ? 'text-gray-400' : 'text-gray-600', border: isDark ? 'border-gray-600' : 'border-gray-200' },
  };
  const style = colorStyles[config.color] || colorStyles.gray;
  
  const formattedDueDate = bill.nextDueDate 
    ? new Date(bill.nextDueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    : 'N/A';
  
  const isPaused = bill.status === 'paused';
  const isPaid = bill.isPaidThisCycle;
  
  return (
    <div 
      className={`p-4 rounded-2xl border transition-all group relative ${
        isPaused ? 'opacity-60' : ''
      } ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-100 hover:border-slate-200'}`}
    >
      {/* Status indicators */}
      {bill.isOverdue && !isPaid && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
          <AlertTriangle size={12} className="text-white" />
        </div>
      )}
      {bill.isDueSoon && !bill.isOverdue && !isPaid && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
          <Bell size={12} className="text-white" />
        </div>
      )}
      
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${style.bg} ${style.border} border`}>
          <Icon size={20} className={style.text} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={`font-bold text-sm ${isPaused ? 'line-through' : ''} ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {bill.name}
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {config.label} • {CYCLE_OPTIONS.find(c => c.value === bill.billCycle)?.label || bill.billCycle}
              </p>
            </div>
            
            {/* Amount */}
            {bill.amount && (
              <div className="text-right shrink-0">
                <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  ₹{bill.amount.toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>
          
          {/* Due date and status */}
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-full ${
              bill.isOverdue && !isPaid
                ? isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                : bill.isDueSoon && !isPaid
                  ? isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'
                  : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
            }`}>
              <Calendar size={10} />
              {bill.isOverdue ? 'Overdue' : `Due ${formattedDueDate}`}
            </span>
            
            {isPaid && (
              <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-full ${
                isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <CheckCircle size={10} />
                Paid
              </span>
            )}
            
            {isPaused && (
              <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-full ${
                isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>
                <Pause size={10} />
                Paused
              </span>
            )}
            
            {bill.reminderOffsets?.length > 0 && (
              <span className={`text-xs font-medium flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Bell size={10} />
                {bill.reminderOffsets.length} reminder{bill.reminderOffsets.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
        {/* Actions menu */}
        <div className="relative">
          <button 
            onClick={() => setShowActions(!showActions)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <MoreHorizontal size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
          </button>
          
          {showActions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
              <div className={`absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg z-20 py-1 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                {!isPaid && (
                  <button 
                    onClick={() => { onMarkPaid(bill._id); setShowActions(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                      isDark ? 'hover:bg-slate-700 text-emerald-400' : 'hover:bg-slate-50 text-emerald-600'
                    }`}
                  >
                    <Check size={14} /> Mark as Paid
                  </button>
                )}
                <button 
                  onClick={() => { onEdit(bill); setShowActions(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                    isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Edit3 size={14} /> Edit Bill
                </button>
                <button 
                  onClick={() => { onToggleStatus(bill._id, isPaused ? 'active' : 'paused'); setShowActions(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                    isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  {isPaused ? 'Resume' : 'Pause'} Reminders
                </button>
                <button 
                  onClick={() => { onDelete(bill._id); setShowActions(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                    isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-slate-50 text-red-600'
                  }`}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============== ADD/EDIT BILL MODAL ==============
const BillModal = ({ isOpen, onClose, bill, onSave, isDark }) => {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'other',
    billCycle: 'monthly',
    dueDay: 1,
    customIntervalDays: 30,
    reminderOffsets: [3, 1],
    notes: '',
    isAutoPay: false,
  });
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (bill) {
      setFormData({
        name: bill.name || '',
        amount: bill.amount || '',
        category: bill.category || 'other',
        billCycle: bill.billCycle || 'monthly',
        dueDay: bill.dueDay || 1,
        customIntervalDays: bill.customIntervalDays || 30,
        reminderOffsets: bill.reminderOffsets || [3, 1],
        notes: bill.notes || '',
        isAutoPay: bill.isAutoPay || false,
      });
    } else {
      setFormData({
        name: '',
        amount: '',
        category: 'other',
        billCycle: 'monthly',
        dueDay: new Date().getDate(),
        customIntervalDays: 30,
        reminderOffsets: [3, 1],
        notes: '',
        isAutoPay: false,
      });
    }
  }, [bill, isOpen]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a bill name');
      return;
    }

    if (formData.billCycle === 'custom' && (!formData.customIntervalDays || formData.customIntervalDays < 1)) {
      toast.error('Please enter a valid interval in days');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        dueDay: parseInt(formData.dueDay),
        customIntervalDays: formData.billCycle === 'custom' ? parseInt(formData.customIntervalDays) : null,
        startDate: new Date().toISOString(),
      };
      
      await onSave(payload, bill?._id);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleReminderOffset = (offset) => {
    setFormData(prev => {
      const offsets = prev.reminderOffsets.includes(offset)
        ? prev.reminderOffsets.filter(o => o !== offset)
        : [...prev.reminderOffsets, offset].sort((a, b) => b - a);
      return { ...prev, reminderOffsets: offsets.length > 0 ? offsets : [1] };
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
        isDark ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
        }`}>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {bill ? 'Edit Bill' : 'Add Recurring Bill'}
          </h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <X size={20} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Bill Name */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Bill Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Netflix Subscription"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500' 
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
            />
          </div>
          
          {/* Amount */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Amount (optional)
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>₹</span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm transition-colors ${
                  isDark 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500' 
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
              />
            </div>
          </div>
          
          {/* Category */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CATEGORY_CONFIG).map(([key, { icon: CatIcon, label }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: key })}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    formData.category === key
                      ? isDark 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                        : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : isDark
                        ? 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <CatIcon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Billing Cycle & Due Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Billing Cycle
              </label>
              <select
                value={formData.billCycle}
                onChange={(e) => setFormData({ ...formData, billCycle: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                  isDark 
                    ? 'bg-slate-700 border-slate-600 text-white focus:border-emerald-500' 
                    : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500'
                } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
              >
                {CYCLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Due Day
              </label>
              <select
                value={formData.dueDay}
                onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                  isDark 
                    ? 'bg-slate-700 border-slate-600 text-white focus:border-emerald-500' 
                    : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500'
                } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {day === 31 ? 'Last day' : day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Interval Configuration */}
          {formData.billCycle === 'custom' && (
            <div className="animate-fade-in">
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Repeat Interval
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={formData.customIntervalDays}
                  onChange={(e) => setFormData({ ...formData, customIntervalDays: e.target.value })}
                  placeholder="e.g. 28"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                    isDark 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500' 
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  days
                </span>
              </div>
              <p className={`text-xs mt-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Next bill will be due {formData.customIntervalDays || '...'} days after the previous one.
              </p>
            </div>
          )}
          
          {/* Reminder Offsets */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Remind Me
            </label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OFFSET_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleReminderOffset(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    formData.reminderOffsets.includes(opt.value)
                      ? isDark 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-500'
                      : isDark
                        ? 'bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Select when you want to be reminded
            </p>
          </div>
          
          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Payment link, account number, etc."
              rows={2}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm resize-none transition-colors ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500' 
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
            />
          </div>
          
          {/* Auto-pay toggle */}
          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
            isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'
          }`}>
            <input
              type="checkbox"
              checked={formData.isAutoPay}
              onChange={(e) => setFormData({ ...formData, isAutoPay: e.target.checked })}
              className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
            />
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>Auto-pay enabled</p>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>This bill is paid automatically</p>
            </div>
          </label>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} />
                {bill ? 'Update Bill' : 'Add Bill'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============== MAIN COMPONENT ==============
const CustomerRecurringBills = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [filter, setFilter] = useState('all');
  
  // Load bills
  const loadBills = async () => {
    try {
      const { data } = await fetchBills({ status: filter === 'all' ? 'all' : filter });
      setBills(data.bills || []);
    } catch (error) {
      console.error('Failed to load bills:', error);
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadBills();
  }, [filter]);
  
  // Handlers
  const handleSave = async (payload, billId) => {
    if (billId) {
      await updateBill(billId, payload);
      toast.success('Bill updated successfully');
    } else {
      await createBill(payload);
      toast.success('Bill added successfully');
    }
    loadBills();
  };
  
  const handleDelete = async (billId) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    
    try {
      await deleteBill(billId);
      toast.success('Bill deleted');
      loadBills();
    } catch (error) {
      toast.error('Failed to delete bill');
    }
  };
  
  const handleToggleStatus = async (billId, status) => {
    try {
      await toggleBillStatus(billId, status);
      toast.success(status === 'active' ? 'Reminders resumed' : 'Reminders paused');
      loadBills();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };
  
  const handleMarkPaid = async (billId) => {
    try {
      await markBillPaid(billId);
      toast.success('Bill marked as paid for this cycle');
      loadBills();
    } catch (error) {
      toast.error('Failed to mark as paid');
    }
  };
  
  const handleEdit = (bill) => {
    setEditingBill(bill);
    setShowModal(true);
  };
  
  const handleAddNew = () => {
    setEditingBill(null);
    setShowModal(true);
  };
  
  // Stats
  const stats = useMemo(() => {
    const active = bills.filter(b => b.status === 'active');
    const overdue = active.filter(b => b.isOverdue && !b.isPaidThisCycle);
    const dueSoon = active.filter(b => b.isDueSoon && !b.isOverdue && !b.isPaidThisCycle);
    const totalMonthly = active.reduce((sum, b) => sum + (b.amount || 0), 0);
    
    return { active: active.length, overdue: overdue.length, dueSoon: dueSoon.length, totalMonthly };
  }, [bills]);
  
  return (
    <div className="max-w-3xl mx-auto space-y-5 md:space-y-6 pb-24 md:pb-10">
      
      {/* ========== HEADER ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {t('bills.title', 'Recurring Bills')}
          </h1>
          <p className={`text-xs md:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('bills.subtitle', 'Track and get reminded about your bills')}
          </p>
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
        >
          <Plus size={18} />
          {t('bills.addBill', 'Add Bill')}
        </button>
      </div>
      
      {/* ========== STATS CARDS ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Bills</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{stats.active}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Monthly Total</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>₹{stats.totalMonthly.toLocaleString('en-IN')}</p>
        </div>
        <div className={`p-4 rounded-xl border ${stats.overdue > 0 ? isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className={`text-xs font-medium ${stats.overdue > 0 ? isDark ? 'text-red-400' : 'text-red-600' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>Overdue</p>
          <p className={`text-2xl font-bold mt-1 ${stats.overdue > 0 ? isDark ? 'text-red-400' : 'text-red-600' : isDark ? 'text-white' : 'text-slate-800'}`}>{stats.overdue}</p>
        </div>
        <div className={`p-4 rounded-xl border ${stats.dueSoon > 0 ? isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className={`text-xs font-medium ${stats.dueSoon > 0 ? isDark ? 'text-amber-400' : 'text-amber-600' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>Due Soon</p>
          <p className={`text-2xl font-bold mt-1 ${stats.dueSoon > 0 ? isDark ? 'text-amber-400' : 'text-amber-600' : isDark ? 'text-white' : 'text-slate-800'}`}>{stats.dueSoon}</p>
        </div>
      </div>
      
      {/* ========== FILTER TABS ========== */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {[
          { id: 'all', label: 'All Bills' },
          { id: 'active', label: 'Active' },
          { id: 'paused', label: 'Paused' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              filter === f.id 
                ? isDark ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      
      {/* ========== BILLS LIST ========== */}
      {loading ? (
        <BillsSkeleton isDark={isDark} />
      ) : bills.length === 0 ? (
        <div className="text-center py-12 md:py-16">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <FileText size={32} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
          </div>
          <p className={`font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {filter === 'all' ? 'No bills yet' : `No ${filter} bills`}
          </p>
          <p className={`text-sm mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Add your recurring bills to get reminders
          </p>
          <button 
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors text-sm"
          >
            <Plus size={16} />
            Add Your First Bill
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map(bill => (
            <BillCard
              key={bill._id}
              bill={bill}
              isDark={isDark}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onMarkPaid={handleMarkPaid}
            />
          ))}
        </div>
      )}
      
      {/* ========== ADD/EDIT MODAL ========== */}
      <BillModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingBill(null); }}
        bill={editingBill}
        onSave={handleSave}
        isDark={isDark}
      />
      
      {/* Scrollbar hide style */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default CustomerRecurringBills;
