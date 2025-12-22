import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  User, Mail, Phone, MapPin, Shield, LogOut, ChevronRight, AlertTriangle, 
  Save, CheckCircle, Lock, Eye, EyeOff, X, Loader2, Receipt, Calendar,
  TrendingUp, RefreshCw, Trash2, Camera, Edit3
} from 'lucide-react';
import { fetchProfile, updateProfile, clearSession, changePassword, deleteAccount, fetchCustomerAnalytics } from '../../services/api';

// ============== TOAST NOTIFICATION COMPONENT ==============
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-500' : 'bg-amber-500';
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? X : AlertTriangle;

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in-right max-w-sm`}>
      <Icon size={18} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-auto p-1 hover:bg-white/20 rounded-full">
        <X size={14} />
      </button>
    </div>
  );
};

// ============== SKELETON LOADER ==============
const ProfileSkeleton = () => (
  <div className="max-w-xl mx-auto space-y-6 pb-20 animate-pulse">
    <div className="h-8 bg-slate-200 rounded w-40" />
    <div className="bg-white p-6 rounded-2xl border border-slate-100">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-slate-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-slate-200 rounded w-32" />
          <div className="h-4 bg-slate-200 rounded w-48" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
    </div>
    <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-slate-200 rounded-lg" />)}
    </div>
  </div>
);

// ============== MODAL COMPONENT ==============
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// ============== MAIN COMPONENT ==============
const CustomerProfile = () => {
  // Core state
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });
  const [originalForm, setOriginalForm] = useState({});
  
  // UI state
  const [toast, setToast] = useState(null);
  const [activeSection, setActiveSection] = useState('personal'); // personal, address, security
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({ totalSpent: 0, receiptCount: 0 });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ============== LOAD PROFILE ==============
  const loadProfile = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    
    try {
      const [profileRes, analyticsRes] = await Promise.allSettled([
        fetchProfile(),
        fetchCustomerAnalytics(),
      ]);

      if (profileRes.status === 'fulfilled') {
        const data = profileRes.value.data;
        setProfile(data);
        const formData = {
          name: data?.name || '',
          email: data?.email || '',
          phone: data?.phone || '',
          line1: data?.address?.line1 || '',
          line2: data?.address?.line2 || '',
          city: data?.address?.city || '',
          state: data?.address?.state || '',
          postalCode: data?.address?.postalCode || '',
          country: data?.address?.country || '',
        };
        setForm(formData);
        setOriginalForm(formData);
      }

      if (analyticsRes.status === 'fulfilled') {
        const analytics = analyticsRes.value.data;
        // Handle both old and new analytics API structure
        const totalSpent = analytics.summary?.thisYear?.total || analytics.summary?.thisMonth?.total || analytics.totalSpent || 0;
        const receiptCount = analytics.summary?.thisYear?.count || analytics.summary?.thisMonth?.count || analytics.categories?.reduce((sum, c) => sum + c.count, 0) || 0;
        setStats({
          totalSpent,
          receiptCount,
        });
      }
    } catch (e) {
      setToast({ message: 'Unable to load profile', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ============== DERIVED STATE ==============
  const initials = useMemo(() => 
    (profile?.name || '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'GR',
    [profile?.name]
  );

  const hasChanges = useMemo(() => {
    return Object.keys(form).some(key => form[key] !== originalForm[key]);
  }, [form, originalForm]);

  const memberSince = useMemo(() => {
    if (!profile?.createdAt) return null;
    return new Date(profile.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }, [profile?.createdAt]);

  // ============== VALIDATION ==============
  const validateForm = () => {
    if (form.name.trim().length < 2) {
      setToast({ message: 'Name must be at least 2 characters', type: 'error' });
      return false;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setToast({ message: 'Please enter a valid email', type: 'error' });
      return false;
    }
    if (form.phone && form.phone.length < 7) {
      setToast({ message: 'Phone number must be at least 7 digits', type: 'error' });
      return false;
    }
    return true;
  };

  // ============== HANDLERS ==============
  const handleSave = async () => {
    if (!hasChanges) {
      setToast({ message: 'No changes to save', type: 'warning' });
      return;
    }
    if (!validateForm()) return;

    setSaving(true);
    const previousForm = { ...form };
    
    try {
      const payload = {
        name: form.name?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address: {
          line1: form.line1?.trim() || undefined,
          line2: form.line2?.trim() || undefined,
          city: form.city?.trim() || undefined,
          state: form.state?.trim() || undefined,
          postalCode: form.postalCode?.trim() || undefined,
          country: form.country?.trim() || undefined,
        },
      };

      // Clean empty values
      payload.address = Object.fromEntries(
        Object.entries(payload.address).filter(([, v]) => v)
      );
      if (!Object.keys(payload.address).length) delete payload.address;
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k];
      });

      const { data } = await updateProfile(payload);
      setProfile(data);
      setOriginalForm({ ...form });
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (e) {
      // Rollback on error
      setForm(previousForm);
      setToast({ message: e?.response?.data?.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({ message: 'Passwords do not match', type: 'error' });
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setToast({ message: 'Password changed successfully!', type: 'success' });
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      setToast({ message: e?.response?.data?.message || 'Failed to change password', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setToast({ message: 'Please type DELETE to confirm', type: 'error' });
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount();
      clearSession();
      window.location.href = '/';
    } catch (e) {
      setToast({ message: e?.response?.data?.message || 'Failed to delete account', type: 'error' });
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      clearSession();
      window.location.href = '/customer-login';
    }
  };

  const handleRefresh = () => loadProfile(true);

  // ============== RENDER ==============
  if (loading) return <ProfileSkeleton />;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">My Profile</h2>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
        
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold uppercase ring-4 ring-white/30">
              {initials}
            </div>
            {profile?.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle size={14} className="text-emerald-600" />
              </div>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold truncate">{profile?.name || 'Your Name'}</h3>
            <p className="text-emerald-100 text-sm truncate">{profile?.email}</p>
            {memberSince && (
              <p className="text-emerald-200/70 text-xs mt-1">Member since {memberSince}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <Receipt className="mx-auto mb-2 text-emerald-500" size={24} />
          <p className="text-2xl font-bold text-slate-800">{stats.receiptCount}</p>
          <p className="text-xs text-slate-500">Receipts</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <TrendingUp className="mx-auto mb-2 text-blue-500" size={24} />
          <p className="text-2xl font-bold text-slate-800">₹{stats.totalSpent.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Total Spent</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <Calendar className="mx-auto mb-2 text-purple-500" size={24} />
          <p className="text-2xl font-bold text-slate-800">{stats.receiptCount > 0 ? Math.ceil(stats.totalSpent / stats.receiptCount) : 0}</p>
          <p className="text-xs text-slate-500">Avg/Receipt</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        {[
          { id: 'personal', label: 'Personal', icon: User },
          { id: 'address', label: 'Address', icon: MapPin },
          { id: 'security', label: 'Security', icon: Shield },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeSection === tab.id 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Personal Info Section */}
      {activeSection === 'personal' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <User size={18} className="text-emerald-500" />
              Personal Information
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>
      )}

      {/* Address Section */}
      {activeSection === 'address' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <MapPin size={18} className="text-emerald-500" />
              Address Details
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Address Line 1
              </label>
              <input
                type="text"
                value={form.line1}
                onChange={(e) => setForm(f => ({ ...f, line1: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Street address, apartment, etc."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Address Line 2
              </label>
              <input
                type="text"
                value={form.line2}
                onChange={(e) => setForm(f => ({ ...f, line2: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Landmark, building name (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="Maharashtra"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => setForm(f => ({ ...f, postalCode: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="400001"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="India"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Section */}
      {activeSection === 'security' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Shield size={18} className="text-emerald-500" />
                Security Settings
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Lock size={18} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-700">Change Password</p>
                    <p className="text-xs text-slate-400">Update your account password</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
              
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckCircle size={18} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-700">Email Verified</p>
                    <p className="text-xs text-slate-400">{profile?.email}</p>
                  </div>
                </div>
                {profile?.isVerified ? (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    Verified
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                    Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 rounded-2xl border border-red-100 overflow-hidden">
            <div className="p-4 border-b border-red-100">
              <h3 className="font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle size={18} />
                Danger Zone
              </h3>
            </div>
            <div className="p-4">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full p-3 flex items-center justify-between bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={18} className="text-red-500" />
                  <div className="text-left">
                    <p className="font-medium text-red-700">Delete Account</p>
                    <p className="text-xs text-red-400">Permanently delete your account and data</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-red-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      {(activeSection === 'personal' || activeSection === 'address') && (
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`w-full p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
            hasChanges 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          } disabled:opacity-60`}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              {hasChanges ? 'Save Changes' : 'No Changes'}
            </>
          )}
        </button>
      )}

      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        className="w-full bg-white border border-slate-200 text-slate-600 p-4 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-red-200 hover:text-red-600 transition-all"
      >
        <LogOut size={18} /> Log Out
      </button>
      
      <p className="text-center text-xs text-slate-400">Version 1.0.0 • GreenReceipt</p>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }}
        title="Change Password"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords(s => ({ ...s, current: !s.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
                placeholder="Min. 6 characters"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(s => ({ ...s, new: !s.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {changingPassword ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Changing...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmation('');
        }}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> This action is irreversible. All your data, receipts, and account information will be permanently deleted.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Type "DELETE" to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-500"
              placeholder="DELETE"
            />
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirmation !== 'DELETE'}
            className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={18} />
                Delete My Account
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* CSS Animations */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default CustomerProfile;