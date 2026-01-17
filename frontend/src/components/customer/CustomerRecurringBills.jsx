import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Plus, X, Calendar, DollarSign, Bell, Pause, Play,
  Trash2, Edit3, Check, AlertTriangle, ChevronRight,
  Zap, CreditCard, Wifi, Shield, Home, Smartphone, FileText,
  MoreHorizontal, CheckCircle, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';
import {
  fetchBills, createBill, updateBill, deleteBill,
  toggleBillStatus, markBillPaid
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
      } ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'}`}
    >
      {/* Status indicators */}
      {bill.isOverdue && !isPaid && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
          <AlertTriangle size={12} className="text-white" />
        </div>
      )}
      {bill.isDueSoon && !bill.isOverdue && !isPaid && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
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
          <div className="flex items-center gap-3 mt-2 flex-wrap">
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
    paymentMethod: '',
  });
  const [loading, setLoading] = useState(false);
  const [customIntervalUnit, setCustomIntervalUnit] = useState('days');
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  
  // Popular bill presets
  const POPULAR_BILLS = {
    utilities: [
      { name: 'Electricity Bill', amount: 1500 },
      { name: 'Water Bill', amount: 500 },
      { name: 'Gas Bill', amount: 800 },
    ],
    subscriptions: [
      { name: 'Netflix', amount: 649 },
      { name: 'Amazon Prime', amount: 1499 },
      { name: 'Spotify', amount: 119 },
      { name: 'YouTube Premium', amount: 129 },
    ],
    insurance: [
      { name: 'Health Insurance', amount: 5000 },
      { name: 'Car Insurance', amount: 3000 },
      { name: 'Life Insurance', amount: 2500 },
    ],
  };
  
  // Quick amount templates
  const AMOUNT_TEMPLATES = [500, 1000, 1500, 2000, 5000];
  
  useEffect(() => {
    if (bill) {
      const intervalDays = bill.customIntervalDays || 30;
      const isWeekly = intervalDays % 7 === 0;
      setCustomIntervalUnit(isWeekly ? 'weeks' : 'days');
      setFormData({
        name: bill.name || '',
        amount: bill.amount || '',
        category: bill.category || 'other',
        billCycle: bill.billCycle || 'monthly',
        dueDay: bill.dueDay || 1,
        customIntervalDays: intervalDays,
        reminderOffsets: bill.reminderOffsets || [3, 1],
        notes: bill.notes || '',
        isAutoPay: bill.isAutoPay || false,
        paymentMethod: bill.paymentMethod || '',
      });
      setStep(1);
    } else {
      setCustomIntervalUnit('days');
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
        paymentMethod: '',
      });
      setStep(1);
    }
    setErrors({});
  }, [bill, isOpen]);
  
  // Validation
  const validateStep = (stepNum) => {
    const newErrors = {};
    
    if (stepNum === 1) {
      if (!formData.name.trim()) newErrors.name = 'Bill name is required';
      if (!formData.category) newErrors.category = 'Please select a category';
    }
    
    if (stepNum === 2) {
      if (!formData.billCycle) newErrors.billCycle = 'Please select billing cycle';
      if (formData.billCycle === 'custom' && (!formData.customIntervalDays || formData.customIntervalDays < 1)) {
        newErrors.customIntervalDays = 'Please enter valid interval';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 3));
    }
  };
  
  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) {
      setStep(1);
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
      setStep(1);
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
  
  const selectPreset = (preset) => {
    setFormData(prev => ({ ...prev, name: preset.name, amount: preset.amount }));
  };

  const customIntervalValue = customIntervalUnit === 'weeks'
    ? Math.max(1, Math.round(Number(formData.customIntervalDays || 0) / 7))
    : Math.max(1, Number(formData.customIntervalDays || 0) || 1);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full max-w-4xl max-h-[90vh] mx-auto overflow-hidden rounded-3xl shadow-2xl transform transition-all ${
        isDark ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Header with Progress */}
        <div className={`relative px-6 py-5 border-b ${isDark ? 'border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50'}`}>
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-all hover:rotate-90 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-white/80'}`}
          >
            <X size={20} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
          </button>
          
          <div className="pr-12">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500'}`}>
                {step === 1 && <FileText size={16} className={isDark ? 'text-emerald-400' : 'text-white'} />}
                {step === 2 && <Calendar size={16} className={isDark ? 'text-emerald-400' : 'text-white'} />}
                {step === 3 && <Bell size={16} className={isDark ? 'text-emerald-400' : 'text-white'} />}
              </div>
              <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Step {step} of 3
              </p>
            </div>
            <h2 className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {step === 1 && (bill ? 'Edit Bill Details' : 'Add New Bill')}
              {step === 2 && 'Set Billing Schedule'}
              {step === 3 && 'Configure Preferences'}
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {step === 1 && 'Enter the basic information about your bill'}
              {step === 2 && 'Choose when and how often you want to be billed'}
              {step === 3 && 'Set reminders and additional options'}
            </p>
          </div>
          
          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                s <= step 
                  ? isDark ? 'bg-emerald-500' : 'bg-emerald-600'
                  : isDark ? 'bg-slate-700' : 'bg-slate-200'
              }`} />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(90vh-180px)] overflow-y-auto">
          <div className="p-6">
            
            {/* ====== STEP 1: BASIC DETAILS ====== */}
            {step === 1 && (
              <div className="space-y-6 animate-slideIn">
                
                {/* Category Selection */}
                <div>
                  <label className={`block text-sm font-bold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Select Category *
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {Object.entries(CATEGORY_CONFIG).map(([key, { icon: CatIcon, label }]) => {
                      const isSelected = formData.category === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, category: key });
                            setErrors(prev => ({ ...prev, category: '' }));
                          }}
                          className={`relative p-4 rounded-2xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-all transform hover:scale-105 ${
                            isSelected
                              ? isDark
                                ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20'
                                : 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-500/20'
                              : isDark
                                ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                          <CatIcon size={24} className={isSelected ? isDark ? 'text-emerald-400' : 'text-emerald-600' : isDark ? 'text-slate-400' : 'text-slate-600'} />
                          <span className={`text-center ${isSelected ? isDark ? 'text-emerald-300' : 'text-emerald-700' : isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.category && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12} /> {errors.category}</p>}
                </div>

                {/* Popular Presets */}
                {POPULAR_BILLS[formData.category] && (
                  <div className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-blue-50/50 border-blue-100'}`}>
                    <p className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Zap size={14} />
                      Quick Fill - Popular {CATEGORY_CONFIG[formData.category].label} Bills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_BILLS[formData.category].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectPreset(preset)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 ${
                            isDark 
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                          }`}
                        >
                          {preset.name} • ₹{preset.amount}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bill Name */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Bill Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setErrors(prev => ({ ...prev, name: '' }));
                    }}
                    placeholder="e.g., Netflix Premium, Electricity Bill"
                    className={`w-full px-4 py-3.5 rounded-xl border-2 text-base transition-all ${
                      errors.name
                        ? 'border-red-500 focus:border-red-500'
                        : isDark
                          ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                    } focus:outline-none focus:ring-4 focus:ring-emerald-500/10`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12} /> {errors.name}</p>}
                </div>

                {/* Amount with Templates */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Amount (Optional)
                  </label>
                  <div className="relative">
                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>₹</span>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="Leave blank for variable amounts"
                      min="0"
                      step="0.01"
                      className={`w-full pl-10 pr-4 py-3.5 rounded-xl border-2 text-base transition-all ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                      } focus:outline-none focus:ring-4 focus:ring-emerald-500/10`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Quick:</span>
                    {AMOUNT_TEMPLATES.map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFormData({ ...formData, amount: amt })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          Number(formData.amount) === amt
                            ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                            : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Payment Method (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Auto-debit', 'Cash'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: method })}
                        className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          formData.paymentMethod === method
                            ? isDark
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                              : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : isDark
                              ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ====== STEP 2: BILLING SCHEDULE ====== */}
            {step === 2 && (
              <div className="space-y-6 animate-slideIn">
                {/* Billing Cycle */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Billing Cycle *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CYCLE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, billCycle: opt.value });
                          setErrors(prev => ({ ...prev, billCycle: '' }));
                        }}
                        className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          formData.billCycle === opt.value
                            ? isDark
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : isDark
                              ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {errors.billCycle && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12} /> {errors.billCycle}</p>}
                </div>

                {/* Custom Interval */}
                {formData.billCycle === 'custom' && (
                  <div className="animate-slideIn">
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      Custom Frequency
                    </label>
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <input
                        type="number"
                        min="1"
                        value={customIntervalValue}
                        onChange={(e) => {
                          const value = Math.max(1, Number(e.target.value || 1));
                          const days = customIntervalUnit === 'weeks' ? value * 7 : value;
                          setFormData({ ...formData, customIntervalDays: days });
                          setErrors(prev => ({ ...prev, customIntervalDays: '' }));
                        }}
                        placeholder="e.g., 2"
                        className={`w-full px-4 py-3 rounded-xl border-2 text-base transition-all ${
                          errors.customIntervalDays
                            ? 'border-red-500 focus:border-red-500'
                            : isDark
                              ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                        } focus:outline-none focus:ring-4 focus:ring-emerald-500/10`}
                      />
                      <select
                        value={customIntervalUnit}
                        onChange={(e) => {
                          const nextUnit = e.target.value;
                          const value = Math.max(1, Number(customIntervalValue || 1));
                          const days = nextUnit === 'weeks' ? value * 7 : value;
                          setCustomIntervalUnit(nextUnit);
                          setFormData({ ...formData, customIntervalDays: days });
                        }}
                        className={`px-4 py-3 rounded-xl border-2 text-base transition-all ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500'
                            : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                        } focus:outline-none focus:ring-4 focus:ring-emerald-500/10`}
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                      </select>
                    </div>
                    {errors.customIntervalDays && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12} /> {errors.customIntervalDays}</p>}
                    <p className={`text-xs mt-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      We'll remind you every {customIntervalValue} {customIntervalUnit}.
                    </p>
                  </div>
                )}

                {/* Due Day */}
                {(formData.billCycle === 'monthly' || formData.billCycle === 'quarterly') && (
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      Due Day of Month
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dueDay}
                      onChange={(e) => setFormData({ ...formData, dueDay: Math.min(31, Math.max(1, Number(e.target.value))) })}
                      className={`w-full px-4 py-3 rounded-xl border-2 text-base transition-all ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                      } focus:outline-none focus:ring-4 focus:ring-emerald-500/10`}
                    />
                    <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Enter day of month (1-31). Use 31 for last day of month.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ====== STEP 3: PREFERENCES ====== */}
            {step === 3 && (
              <div className="space-y-6 animate-slideIn">
                {/* Reminders */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Remind Me
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {REMINDER_OFFSET_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleReminderOffset(opt.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          formData.reminderOffsets.includes(opt.value)
                            ? isDark
                              ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500'
                              : 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500'
                            : isDark
                              ? 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:border-slate-600'
                              : 'bg-slate-100 text-slate-600 border-2 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {formData.reminderOffsets.includes(opt.value) && <Check size={12} className="inline mr-1" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select one or more reminder times before the due date.
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Payment link, account number, etc."
                    rows={4}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-base resize-none transition-all ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                    } focus:outline-none focus:ring-4 focus:ring-emerald-500/10`}
                  />
                </div>

                {/* Auto-pay Toggle */}
                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isDark ? 'border-slate-700 hover:bg-slate-800/60' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.isAutoPay}
                    onChange={(e) => setFormData({ ...formData, isAutoPay: e.target.checked })}
                    className="w-5 h-5 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div>
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      Auto-pay enabled
                    </p>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Automatically mark this bill as paid on the due date.
                    </p>
                  </div>
                </label>
              </div>
            )}

          </div>

          {/* Footer Navigation */}
          <div className={`sticky bottom-0 px-6 py-4 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={`px-6 py-3.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    isDark 
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ChevronRight size={18} className="rotate-180" />
                  Back
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  Continue
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      {bill ? 'Update Bill' : 'Create Bill'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
      
      {/* Animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
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
      setLoading(true);
      const { data } = await fetchBills({ status: filter === 'all' ? undefined : filter });
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
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Bills</p>
            <FileText size={14} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
          </div>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{stats.active}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Monthly Total</p>
            <DollarSign size={14} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
          </div>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>₹{stats.totalMonthly.toLocaleString('en-IN')}</p>
        </div>
        <div className={`p-4 rounded-xl border ${stats.overdue > 0 ? isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${stats.overdue > 0 ? isDark ? 'text-red-400' : 'text-red-600' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>Overdue</p>
            <AlertTriangle size={14} className={stats.overdue > 0 ? isDark ? 'text-red-400' : 'text-red-600' : isDark ? 'text-slate-500' : 'text-slate-400'} />
          </div>
          <p className={`text-2xl font-bold mt-1 ${stats.overdue > 0 ? isDark ? 'text-red-400' : 'text-red-600' : isDark ? 'text-white' : 'text-slate-800'}`}>{stats.overdue}</p>
        </div>
        <div className={`p-4 rounded-xl border ${stats.dueSoon > 0 ? isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${stats.dueSoon > 0 ? isDark ? 'text-amber-400' : 'text-amber-600' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>Due Soon</p>
            <Bell size={14} className={stats.dueSoon > 0 ? isDark ? 'text-amber-400' : 'text-amber-600' : isDark ? 'text-slate-500' : 'text-slate-400'} />
          </div>
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
