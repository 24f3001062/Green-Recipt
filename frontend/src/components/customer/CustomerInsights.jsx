import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, ShoppingBag, Coffee, Target, Wallet, Sparkles, Leaf, 
  AlertTriangle, RefreshCw, CreditCard, Banknote, Smartphone, PieChart, BarChart3,
  Calendar, Receipt, Store, ArrowUpRight, ArrowDownRight, Clock, Zap, Award,
  ChevronRight, IndianRupee, Activity, Package, Flame, Star
} from 'lucide-react';
import { fetchCustomerAnalytics } from '../../services/api';

// ============== SKELETON LOADER ==============
const InsightsSkeleton = () => (
  <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-pulse">
    <div className="h-8 bg-slate-200 rounded w-48" />
    <div className="grid grid-cols-2 gap-4">
      <div className="h-32 bg-slate-200 rounded-2xl" />
      <div className="h-32 bg-slate-200 rounded-2xl" />
    </div>
    <div className="h-48 bg-slate-200 rounded-2xl" />
    <div className="h-64 bg-slate-200 rounded-2xl" />
    <div className="h-48 bg-slate-200 rounded-2xl" />
  </div>
);

// ============== MINI CHART COMPONENT ==============
const MiniBarChart = ({ data, height = 60, color = 'emerald' }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const colorClass = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  }[color] || 'bg-emerald-500';

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          className={`flex-1 ${colorClass} rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer relative group`}
          style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
          title={`${d.label}: ₹${d.value}`}
        >
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {d.label}: ₹{d.value}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============== DONUT CHART COMPONENT ==============
const DonutChart = ({ segments, size = 120, strokeWidth = 16 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={strokeWidth}
      />
      {segments.map((seg, i) => {
        const segmentLength = (seg.percentage / 100) * circumference;
        const element = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        );
        offset += segmentLength;
        return element;
      })}
    </svg>
  );
};

// ============== STAT CARD ==============
const StatCard = ({ icon: Icon, label, value, subValue, trend, trendValue, color = 'emerald', className = '' }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };
  const iconBg = colorClasses[color] || colorClasses.emerald;

  return (
    <div className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-xl ${iconBg}`}>
          <Icon size={18} />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trendValue}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        {subValue && <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
};

// ============== CATEGORY ITEM ==============
const getCategoryConfig = (category) => {
  const name = (category || '').toLowerCase();
  if (name.includes('food') || name.includes('restaurant') || name.includes('snack')) {
    return { icon: Coffee, color: 'text-orange-500', bg: 'bg-orange-500', light: 'bg-orange-50' };
  }
  if (name.includes('drink') || name.includes('beverage')) {
    return { icon: Coffee, color: 'text-amber-500', bg: 'bg-amber-500', light: 'bg-amber-50' };
  }
  if (name.includes('shop') || name.includes('retail') || name.includes('cloth')) {
    return { icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500', light: 'bg-blue-50' };
  }
  if (name.includes('grocery') || name.includes('mart')) {
    return { icon: Package, color: 'text-green-500', bg: 'bg-green-500', light: 'bg-green-50' };
  }
  if (name.includes('travel') || name.includes('transport')) {
    return { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500', light: 'bg-purple-50' };
  }
  return { icon: Leaf, color: 'text-emerald-500', bg: 'bg-emerald-500', light: 'bg-emerald-50' };
};

const getPaymentIcon = (method) => {
  const m = (method || '').toLowerCase();
  if (m.includes('upi')) return Smartphone;
  if (m.includes('card')) return CreditCard;
  if (m.includes('cash')) return Banknote;
  return Wallet;
};

// ============== MAIN COMPONENT ==============
const CustomerInsights = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, categories, trends

  // ============== LOAD DATA ==============
  const loadAnalytics = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data } = await fetchCustomerAnalytics();
      setAnalytics(data);
      setError(null);
    } catch (e) {
      setError('Unable to load insights. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // ============== DERIVED DATA ==============
  const chartData = useMemo(() => {
    if (!analytics?.trends?.daily) return [];
    return analytics.trends.daily.slice(-14).map(d => ({
      label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      value: d.total,
    }));
  }, [analytics]);

  const monthlyChartData = useMemo(() => {
    if (!analytics?.trends?.monthly) return [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return analytics.trends.monthly.map(m => ({
      label: monthNames[m.month - 1],
      value: m.total,
    }));
  }, [analytics]);

  const donutSegments = useMemo(() => {
    if (!analytics?.categories?.length) return [];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280'];
    return analytics.categories.slice(0, 5).map((c, i) => ({
      percentage: c.percentage,
      color: colors[i % colors.length],
      label: c.category,
    }));
  }, [analytics]);

  const suggestions = useMemo(() => {
    if (!analytics) return [];
    const list = [];
    const { summary, categories } = analytics;

    // Spending trend suggestion
    if (summary?.changes?.monthOverMonth > 20) {
      list.push({
        icon: AlertTriangle,
        title: 'Spending Alert',
        desc: `Your spending is ${summary.changes.monthOverMonth}% higher than last month. Consider reviewing your expenses.`,
        type: 'warning',
      });
    } else if (summary?.changes?.monthOverMonth < -10) {
      list.push({
        icon: Award,
        title: 'Great Savings!',
        desc: `You've reduced spending by ${Math.abs(summary.changes.monthOverMonth)}% compared to last month. Keep it up!`,
        type: 'success',
      });
    }

    // Top category suggestion
    if (categories?.length > 0) {
      const top = categories[0];
      if (top.percentage > 50) {
        list.push({
          icon: PieChart,
          title: `${top.category} Dominates`,
          desc: `${top.percentage}% of your spending is on ${top.category}. Consider diversifying or setting a budget cap.`,
          type: 'info',
        });
      }
    }

    // Budget projection
    if (summary?.thisMonth?.projectedTotal > summary?.lastMonth?.total * 1.3) {
      list.push({
        icon: TrendingUp,
        title: 'Projected Overspend',
        desc: `At this rate, you might spend ₹${summary.thisMonth.projectedTotal.toLocaleString('en-IN')} this month.`,
        type: 'warning',
      });
    }

    // Default suggestions
    list.push(
      { icon: Target, title: 'Set Budget Goals', desc: 'Create monthly spending limits for each category to stay on track.', type: 'tip' },
      { icon: Sparkles, title: 'Enable Smart Alerts', desc: 'Get notified when you exceed your daily spending average.', type: 'tip' },
    );

    return list.slice(0, 4);
  }, [analytics]);

  // ============== RENDER ==============
  if (loading) return <InsightsSkeleton />;

  const { summary, categories, paymentMethods, topMerchants, topItems, recentActivity } = analytics || {};

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Insights</h2>
          <p className="text-sm text-slate-500 mt-0.5">Your spending analytics</p>
        </div>
        <button 
          onClick={() => loadAnalytics(true)}
          disabled={refreshing}
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={`text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'categories', label: 'Categories', icon: PieChart },
          { id: 'trends', label: 'Trends', icon: Activity },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Hero Stats Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />
            
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">This Month</p>
                  <h3 className="text-4xl font-bold mt-2">₹{(summary?.thisMonth?.total || 0).toLocaleString('en-IN')}</h3>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      {summary?.changes?.monthOverMonth >= 0 ? (
                        <ArrowUpRight size={16} className="text-emerald-200" />
                      ) : (
                        <ArrowDownRight size={16} className="text-emerald-200" />
                      )}
                      <span className="text-sm font-medium text-emerald-100">
                        {Math.abs(summary?.changes?.monthOverMonth || 0)}% vs last month
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <span className="text-sm font-bold">{summary?.thisMonth?.count || 0} receipts</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/20">
                <div>
                  <p className="text-emerald-200 text-xs">Avg/Day</p>
                  <p className="text-lg font-bold">₹{summary?.thisMonth?.avgPerDay || 0}</p>
                </div>
                <div>
                  <p className="text-emerald-200 text-xs">This Week</p>
                  <p className="text-lg font-bold">₹{(summary?.thisWeek?.total || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-emerald-200 text-xs">Projected</p>
                  <p className="text-lg font-bold">₹{(summary?.thisMonth?.projectedTotal || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={Calendar}
              label="Last Month"
              value={`₹${(summary?.lastMonth?.total || 0).toLocaleString('en-IN')}`}
              subValue={`${summary?.lastMonth?.count || 0} receipts`}
              color="slate"
            />
            <StatCard
              icon={TrendingUp}
              label="This Year"
              value={`₹${(summary?.thisYear?.total || 0).toLocaleString('en-IN')}`}
              subValue={`${summary?.thisYear?.count || 0} receipts`}
              color="blue"
            />
          </div>

          {/* Mini Spending Chart */}
          {chartData.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">Daily Spending</h3>
                <span className="text-xs text-slate-400">Last 14 days</span>
              </div>
              <MiniBarChart data={chartData} height={80} color="emerald" />
            </div>
          )}

          {/* Top Merchants */}
          {topMerchants?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">Favorite Merchants</h3>
                <Store size={18} className="text-slate-400" />
              </div>
              <div className="space-y-3">
                {topMerchants.slice(0, 3).map((merchant, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                        {(merchant.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{merchant.name}</p>
                        <p className="text-xs text-slate-400">{merchant.visits} visits</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-800">₹{merchant.totalSpent.toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="space-y-6 animate-fade-in">
          {/* Donut Chart */}
          {donutSegments.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4">Spending Breakdown</h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <DonutChart segments={donutSegments} size={140} strokeWidth={20} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="text-lg font-bold text-slate-800">₹{(summary?.thisMonth?.total || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {donutSegments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-sm text-slate-600 flex-1">{seg.label}</span>
                      <span className="text-sm font-bold text-slate-700">{seg.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Category List */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4">Category Details</h3>
            <div className="space-y-3">
              {(categories || []).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No spending data yet</p>
              )}
              {(categories || []).map((cat, i) => {
                const config = getCategoryConfig(cat.category);
                const Icon = config.icon;
                return (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${config.light}`}>
                          <Icon className={config.color} size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700">{cat.category}</p>
                          <p className="text-xs text-slate-400">{cat.count} transactions • Avg ₹{cat.avgTransaction}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">₹{cat.totalSpent.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-400">{cat.percentage}%</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white border border-slate-200 overflow-hidden">
                      <div 
                        className={`h-full ${config.bg} transition-all duration-500`} 
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Methods */}
          {paymentMethods?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4">Payment Methods</h3>
              
              {/* Payment Summary Cards - UPI vs Cash */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* UPI Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <Smartphone size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-emerald-800">UPI Payments</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    ₹{(paymentMethods.find(pm => pm.method?.toLowerCase() === 'upi')?.total || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {paymentMethods.find(pm => pm.method?.toLowerCase() === 'upi')?.count || 0} transactions
                  </p>
                </div>
                
                {/* Cash Card */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-amber-500 rounded-lg">
                      <Banknote size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-amber-800">Cash Payments</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">
                    ₹{(paymentMethods.find(pm => pm.method?.toLowerCase() === 'cash')?.total || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {paymentMethods.find(pm => pm.method?.toLowerCase() === 'cash')?.count || 0} transactions
                  </p>
                </div>
              </div>

              {/* All Payment Methods List */}
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((pm, i) => {
                  const Icon = getPaymentIcon(pm.method);
                  const percentage = paymentMethods.reduce((sum, p) => sum + p.total, 0) > 0 
                    ? Math.round((pm.total / paymentMethods.reduce((sum, p) => sum + p.total, 0)) * 100) 
                    : 0;
                  return (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Icon size={18} className="text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-700 text-sm capitalize">{pm.method}</p>
                        <p className="text-xs text-slate-400">{pm.count} times • {percentage}%</p>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">₹{pm.total.toLocaleString('en-IN')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === 'trends' && (
        <div className="space-y-6 animate-fade-in">
          {/* Monthly Trend */}
          {monthlyChartData.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">Monthly Trend</h3>
                <span className="text-xs text-slate-400">Last 6 months</span>
              </div>
              <MiniBarChart data={monthlyChartData} height={100} color="blue" />
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                {monthlyChartData.map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))}
              </div>
            </div>
          )}

          {/* Week Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={Calendar}
              label="This Week"
              value={`₹${(summary?.thisWeek?.total || 0).toLocaleString('en-IN')}`}
              subValue={`${summary?.thisWeek?.count || 0} receipts`}
              trend={summary?.changes?.weekOverWeek >= 0 ? 'up' : 'down'}
              trendValue={Math.abs(summary?.changes?.weekOverWeek || 0)}
              color="emerald"
            />
            <StatCard
              icon={Clock}
              label="Last Week"
              value={`₹${(summary?.lastWeek?.total || 0).toLocaleString('en-IN')}`}
              subValue={`${summary?.lastWeek?.count || 0} receipts`}
              color="slate"
            />
          </div>

          {/* Top Items */}
          {topItems?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">Top Purchases</h3>
                <Flame size={18} className="text-orange-500" />
              </div>
              <div className="space-y-2">
                {topItems.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center text-xs font-bold text-emerald-700">
                        #{i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-700 text-sm">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.quantity} qty • Avg ₹{item.avgPrice}</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-700">₹{item.totalSpent.toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivity?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Receipt size={18} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 text-sm truncate">{activity.merchant}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(activity.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' • '}{activity.category} • {activity.paymentMethod}
                      </p>
                    </div>
                    <p className="font-bold text-slate-700">₹{activity.amount}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-amber-500" size={20} />
            <h3 className="font-bold text-slate-700">Smart Suggestions</h3>
          </div>
          <div className="space-y-3">
            {suggestions.map((tip, i) => {
              const Icon = tip.icon;
              const bgColor = tip.type === 'warning' ? 'bg-amber-50 border-amber-100' 
                           : tip.type === 'success' ? 'bg-emerald-50 border-emerald-100'
                           : 'bg-white border-slate-100';
              const iconColor = tip.type === 'warning' ? 'text-amber-600' 
                             : tip.type === 'success' ? 'text-emerald-600'
                             : 'text-blue-600';
              return (
                <div key={i} className={`p-4 rounded-xl border ${bgColor} flex gap-3 items-start`}>
                  <div className={`p-2 rounded-lg bg-white shadow-sm ${iconColor}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{tip.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Note */}
      <p className="text-center text-xs text-slate-400 pt-4">
        Data refreshed {analytics?.meta?.generatedAt ? new Date(analytics.meta.generatedAt).toLocaleTimeString('en-IN') : 'recently'}
      </p>

      {/* CSS */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default CustomerInsights;