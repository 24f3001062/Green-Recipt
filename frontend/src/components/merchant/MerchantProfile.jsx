import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  LogOut, 
  Edit2, 
  Save, 
  X,
  Receipt,
  ShieldCheck,
  Leaf,
  Trophy,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Palette,
  ImageIcon,
  Type
} from 'lucide-react';
import { fetchProfile, updateProfile, fetchMerchantAnalytics, clearSession } from '../../services/api';

// ============== TOAST NOTIFICATION ==============
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
  <div className="space-y-6 animate-pulse max-w-4xl mx-auto pb-10">
    <div className="bg-slate-200 rounded-2xl h-48" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-slate-200 rounded-2xl h-80" />
      <div className="space-y-6">
        <div className="bg-slate-200 rounded-2xl h-64" />
        <div className="bg-slate-200 rounded-2xl h-48" />
      </div>
    </div>
  </div>
);

const MerchantProfile = () => {
  // Core state
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState({});

  // Stats
  const [stats, setStats] = useState({ totalReceipts: 0, paperSaved: 0 });

  // ============== LOAD PROFILE ==============
  const loadProfile = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      const [profileRes, analyticsRes] = await Promise.allSettled([
        fetchProfile(),
        fetchMerchantAnalytics(),
      ]);

      if (profileRes.status === 'fulfilled') {
        const data = profileRes.value.data;
        setProfile(data);
        setTempProfile({
          shopName: data.shopName || '',
          ownerName: data.ownerName || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          receiptFooter: data.receiptFooter || 'Thank you! Visit again.',
          receiptHeader: data.receiptHeader || '',
          brandColor: data.brandColor || '#10b981',
          logoUrl: data.logoUrl || '',
        });
      }

      if (analyticsRes.status === 'fulfilled') {
        const analytics = analyticsRes.value.data;
        const totalReceipts = analytics.summary?.thisYear?.count || analytics.summary?.thisMonth?.count || 0;
        // Estimate paper saved: ~2.5g per receipt
        const paperSaved = ((totalReceipts * 2.5) / 1000).toFixed(1);
        setStats({ totalReceipts, paperSaved });
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

  // ============== DERIVED DATA ==============
  const memberSince = useMemo(() => {
    if (!profile?.createdAt) return null;
    return new Date(profile.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [profile?.createdAt]);

  // ============== HANDLERS ==============
  const handleEdit = () => {
    setTempProfile({
      shopName: profile.shopName || '',
      ownerName: profile.ownerName || '',
      phone: profile.phone || '',
      email: profile.email || '',
      address: profile.address || '',
      receiptFooter: profile.receiptFooter || 'Thank you! Visit again.',
      receiptHeader: profile.receiptHeader || '',
      brandColor: profile.brandColor || '#10b981',
      logoUrl: profile.logoUrl || '',
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!tempProfile.shopName?.trim()) {
      setToast({ message: 'Shop name is required', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const { data } = await updateProfile({
        shopName: tempProfile.shopName,
        ownerName: tempProfile.ownerName,
        phone: tempProfile.phone,
        email: tempProfile.email,
        address: tempProfile.address,
        receiptFooter: tempProfile.receiptFooter,
        receiptHeader: tempProfile.receiptHeader,
        brandColor: tempProfile.brandColor,
        logoUrl: tempProfile.logoUrl,
      });
      
      setProfile(data);
      setIsEditing(false);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if(window.confirm("Are you sure you want to logout?")) {
      clearSession();
      window.location.href = '/merchant-login';
    }
  };

  const handleRefresh = () => loadProfile(true);

  // ============== RENDER ==============
  if (loading) return <ProfileSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-10">
      
      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* 1️⃣ BUSINESS IDENTITY HEADER */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
            {/* Avatar / Logo Placeholder */}
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md border-4 border-white/20 text-emerald-600 font-bold text-3xl shrink-0 uppercase">
                {(profile?.shopName || 'S').charAt(0)}
            </div>
            
            <div className="text-center md:text-left flex-1">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                    <h1 className="text-2xl md:text-3xl font-bold">{profile?.shopName || 'Your Shop'}</h1>
                    <button 
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
                <p className="text-emerald-100 font-medium mt-1 flex items-center justify-center md:justify-start gap-2">
                    <Store size={16} /> Food & Beverage • Merchant
                </p>
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
                    {profile?.merchantCode && (
                      <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10">
                          {profile.merchantCode}
                      </span>
                    )}
                    {profile?.isVerified && (
                      <span className="px-3 py-1 bg-emerald-800/30 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10 flex items-center gap-1">
                          <ShieldCheck size={12} /> Verified
                      </span>
                    )}
                    {memberSince && (
                      <span className="px-3 py-1 bg-white/10 rounded-full text-xs backdrop-blur-sm border border-white/10">
                          Since {memberSince}
                      </span>
                    )}
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2️⃣ BASIC DETAILS FORM (Editable) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="font-bold text-slate-800 text-lg">Business Details</h2>
                    <p className="text-slate-400 text-xs mt-0.5">Contact info & location</p>
                </div>
                {!isEditing ? (
                    <button 
                        onClick={handleEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
                    >
                        <Edit2 size={14} /> Edit
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button 
                            onClick={handleCancel}
                            disabled={saving}
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                )}
            </div>

            <div className="p-6 space-y-5">
                {/* Inputs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Shop Name */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Shop Name</label>
                        <div className="relative">
                            <Store className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                disabled={!isEditing}
                                type="text" 
                                value={isEditing ? tempProfile.shopName : (profile?.shopName || '')}
                                onChange={(e) => setTempProfile({...tempProfile, shopName: e.target.value})}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none font-medium transition-all ${isEditing ? 'bg-white border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            />
                        </div>
                    </div>

                    {/* Owner Name */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Owner Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                disabled={!isEditing}
                                type="text" 
                                value={isEditing ? tempProfile.ownerName : (profile?.ownerName || '')}
                                onChange={(e) => setTempProfile({...tempProfile, ownerName: e.target.value})}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none font-medium transition-all ${isEditing ? 'bg-white border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                disabled={!isEditing}
                                type="text" 
                                value={isEditing ? tempProfile.phone : (profile?.phone || '')}
                                onChange={(e) => setTempProfile({...tempProfile, phone: e.target.value})}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none font-medium transition-all ${isEditing ? 'bg-white border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                disabled={!isEditing}
                                type="email" 
                                value={isEditing ? tempProfile.email : (profile?.email || '')}
                                onChange={(e) => setTempProfile({...tempProfile, email: e.target.value})}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none font-medium transition-all ${isEditing ? 'bg-white border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            />
                        </div>
                    </div>

                     {/* Address */}
                     <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Shop Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                            <textarea 
                                disabled={!isEditing}
                                rows="2"
                                value={isEditing ? tempProfile.address : (profile?.address || '')}
                                onChange={(e) => setTempProfile({...tempProfile, address: e.target.value})}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none font-medium transition-all resize-none ${isEditing ? 'bg-white border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
            
            {/* 3️⃣ RECEIPT PREVIEW */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Receipt size={18} className="text-emerald-600"/> Receipt Branding
                </h3>
                
                <div className="space-y-4">
                    {/* Brand Color */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                            <Palette size={12} /> Brand Color
                        </label>
                        <div className="flex items-center gap-2">
                            <input 
                                disabled={!isEditing}
                                type="color"
                                value={isEditing ? tempProfile.brandColor : (profile?.brandColor || '#10b981')}
                                onChange={(e) => setTempProfile({...tempProfile, brandColor: e.target.value})}
                                className={`w-10 h-10 rounded-lg border cursor-pointer ${isEditing ? 'border-emerald-500' : 'border-slate-200'}`}
                            />
                            <div className="flex-1 flex gap-1">
                                {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'].map((color) => (
                                    <button
                                        key={color}
                                        disabled={!isEditing}
                                        onClick={() => isEditing && setTempProfile({...tempProfile, brandColor: color})}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                                            (isEditing ? tempProfile.brandColor : profile?.brandColor) === color 
                                                ? 'border-slate-800 scale-110' 
                                                : 'border-transparent'
                                        } ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Logo URL */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                            <ImageIcon size={12} /> Logo URL (optional)
                        </label>
                        <input 
                             disabled={!isEditing}
                             type="url"
                             value={isEditing ? tempProfile.logoUrl : (profile?.logoUrl || '')}
                             onChange={(e) => setTempProfile({...tempProfile, logoUrl: e.target.value})}
                             placeholder="https://example.com/logo.png"
                             className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${isEditing ? 'border-emerald-500' : 'bg-slate-50 border-slate-200'}`}
                        />
                    </div>

                    {/* Header Text */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                            <Type size={12} /> Header Text (optional)
                        </label>
                        <input 
                             disabled={!isEditing}
                             type="text"
                             value={isEditing ? tempProfile.receiptHeader : (profile?.receiptHeader || '')}
                             onChange={(e) => setTempProfile({...tempProfile, receiptHeader: e.target.value})}
                             placeholder="e.g. ★ Premium Coffee Shop ★"
                             className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${isEditing ? 'border-emerald-500' : 'bg-slate-50 border-slate-200'}`}
                        />
                    </div>

                    {/* Footer Message */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Footer Message</label>
                        <input 
                             disabled={!isEditing}
                             type="text"
                             value={isEditing ? tempProfile.receiptFooter : (profile?.receiptFooter || '')}
                             onChange={(e) => setTempProfile({...tempProfile, receiptFooter: e.target.value})}
                             placeholder="e.g. Thank you, visit again!"
                             className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${isEditing ? 'border-emerald-500' : 'bg-slate-50 border-slate-200'}`}
                        />
                    </div>

                    {/* LIVE PREVIEW BOX */}
                    <div className="mt-4 bg-slate-100 p-4 rounded-xl">
                        <p className="text-[10px] text-slate-400 font-bold uppercase text-center mb-2">Live Customer Preview</p>
                        <div className="bg-white p-4 shadow-sm border border-slate-200 mx-auto max-w-[220px] text-center font-mono text-[10px] leading-tight relative overflow-hidden">
                            {/* Brand Color Header Strip */}
                            <div 
                                className="absolute top-0 left-0 right-0 h-1.5"
                                style={{ backgroundColor: isEditing ? tempProfile.brandColor : (profile?.brandColor || '#10b981') }}
                            />
                            <div className="absolute -top-1 left-0 w-full h-2 bg-[radial-gradient(circle,transparent_50%,#fff_50%)] bg-[length:8px_8px] rotate-180" style={{ top: '6px' }}></div>
                            
                            <div className="pt-2">
                                {/* Logo */}
                                {(isEditing ? tempProfile.logoUrl : profile?.logoUrl) && (
                                    <img 
                                        src={isEditing ? tempProfile.logoUrl : profile?.logoUrl}
                                        alt="Logo"
                                        className="w-10 h-10 object-contain mx-auto mb-1 rounded"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                )}
                                
                                {/* Header Text */}
                                {(isEditing ? tempProfile.receiptHeader : profile?.receiptHeader) && (
                                    <div 
                                        className="text-[9px] font-bold mb-1"
                                        style={{ color: isEditing ? tempProfile.brandColor : (profile?.brandColor || '#10b981') }}
                                    >
                                        {isEditing ? tempProfile.receiptHeader : profile?.receiptHeader}
                                    </div>
                                )}
                                
                                <div 
                                    className="font-bold text-xs mb-0.5"
                                    style={{ color: isEditing ? tempProfile.brandColor : (profile?.brandColor || '#10b981') }}
                                >
                                    {isEditing ? tempProfile.shopName : (profile?.shopName || 'Your Shop')}
                                </div>
                                <div className="text-slate-400 text-[8px] mb-2">{isEditing ? tempProfile.address : (profile?.address || 'Your Address')}</div>
                                {(isEditing ? tempProfile.phone : profile?.phone) && (
                                    <div className="text-slate-400 text-[8px] mb-2">📞 {isEditing ? tempProfile.phone : profile?.phone}</div>
                                )}
                                <div className="border-b border-dashed border-slate-300 my-2"></div>
                                <div className="flex justify-between my-1"><span>Masala Chai</span><span>15.00</span></div>
                                <div className="flex justify-between my-1"><span>Sandwich</span><span>45.00</span></div>
                                <div className="border-b border-dashed border-slate-300 my-2"></div>
                                <div 
                                    className="flex justify-between font-bold"
                                    style={{ color: isEditing ? tempProfile.brandColor : (profile?.brandColor || '#10b981') }}
                                >
                                    <span>TOTAL</span><span>₹60.00</span>
                                </div>
                                <div className="mt-3 text-slate-500 italic text-[9px]">"{isEditing ? tempProfile.receiptFooter : (profile?.receiptFooter || 'Thank you!')}"</div>
                                
                                {/* Brand Color Footer Strip */}
                                <div 
                                    className="absolute bottom-0 left-0 right-0 h-1"
                                    style={{ backgroundColor: isEditing ? tempProfile.brandColor : (profile?.brandColor || '#10b981'), opacity: 0.3 }}
                                />
                            </div>
                            <div className="absolute -bottom-1 left-0 w-full h-2 bg-[radial-gradient(circle,transparent_50%,#fff_50%)] bg-[length:8px_8px]"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4️⃣ 🌱 IMPACT CARD (Real Stats) */}
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="font-bold text-emerald-900 mb-1 flex items-center gap-2">
                        <Leaf size={18} className="text-emerald-600" /> Your Green Impact
                    </h3>
                    <p className="text-xs text-emerald-700 mb-6">Since joining, you have saved:</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                            <p className="text-2xl font-bold text-emerald-800">{stats.paperSaved} <span className="text-xs font-normal text-emerald-600">kg</span></p>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase">Paper Saved</p>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                            <p className="text-2xl font-bold text-emerald-800">{stats.totalReceipts.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase">Digital Bills</p>
                        </div>
                    </div>

                    {stats.totalReceipts > 100 && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100/50 p-2 rounded-lg">
                          <Trophy size={14} className="text-amber-500" />
                          <span>Great job! You've issued over <strong>{stats.totalReceipts}</strong> digital receipts!</span>
                      </div>
                    )}
                </div>
                {/* Background Decor */}
                <Leaf className="absolute -right-6 -bottom-6 text-emerald-200/50 rotate-[-15deg]" size={140} />
            </div>

            {/* 5️⃣ LOGOUT BUTTON (Moved to Bottom) */}
            <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors border border-red-100"
            >
                <LogOut size={16} /> Logout Account
            </button>

        </div>
      </div>
    </div>
  );
};

export default MerchantProfile;