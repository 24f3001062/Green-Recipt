import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, CalendarX, ArrowUpRight, ArrowDownRight,
  RefreshCw, AlertTriangle, BarChart3, PieChart, Users, Receipt, Sparkles,
  CreditCard, Banknote, Smartphone, Wallet, Calendar, Package, Activity,
  Award, Target, Zap, IndianRupee, ShoppingBag
} from 'lucide-react';
import { fetchMerchantAnalytics } from '../../services/api';
import { formatISTDisplay, toIST } from '../../utils/timezone';

// ============== SKELETON LOADER ==============
const InsightsSkeleton = () => (
  <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
    <div className="h-8 bg-slate-200 rounded w-48" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-40 bg-slate-200 rounded-2xl" />
      <div className="h-40 bg-slate-200 rounded-2xl" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
    </div>
    <div className="h-64 bg-slate-200 rounded-2xl" />
    <div className="h-48 bg-slate-200 rounded-2xl" />
  </div>
);

// ============== MINI BAR CHART ==============
const MiniBarChart = ({ data, height = 60, color = 'emerald' }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const colorClass = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }[color] || 'bg-emerald-500';

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          className={`flex-1 ${colorClass} rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer relative group`}
          style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
        >
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {d.label}: ₹{d.value.toLocaleString('en-IN')}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============== STAT CARD ==============
const StatCard = ({ icon: Icon, label, value, subValue, trend, trendValue, color = 'emerald' }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };
  const iconBg = colorClasses[color] || colorClasses.emerald;

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
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

// ============== PAYMENT ICON ==============
const getPaymentIcon = (method) => {
  const m = (method || '').toLowerCase();
  if (m.includes('upi')) return Smartphone;
  if (m.includes('card')) return CreditCard;
  if (m.includes('cash')) return Banknote;
  return Wallet;
};

// ============== MAIN COMPONENT ==============
const MerchantInsights = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, items, trends

  // ============== LOAD DATA ==============
  const loadAnalytics = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data } = await fetchMerchantAnalytics();
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
    if (!analytics?.dailySales) return [];
    return analytics.dailySales.slice(-14).map(d => ({
      label: formatISTDisplay(toIST(d.date), { day: 'numeric', month: 'short' }),
      value: d.total,
    }));
  }, [analytics]);

  const monthlyChartData = useMemo(() => {
    if (!analytics?.monthlyTrend) return [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return analytics.monthlyTrend.map(m => ({
      label: monthNames[m.month - 1],
      value: m.total,
    }));
  }, [analytics]);

  const suggestions = useMemo(() => {
    if (!analytics) return [];
    const list = [];
    const { insights, topItems, summary } = analytics;

    // Only show suggestions when there's actual data
    if (!insights?.hasData) {
      return [{
        icon: Sparkles,
        title: 'Start Your Journey',
        desc: 'Create your first bill to unlock personalized insights and recommendations!',
        type: 'info',
      }];
    }

    // Peak time suggestion - only if we have peak hour data
    if (insights?.peakHour) {
      list.push({
        icon: Clock,
        title: 'Optimize Peak Hours',
        desc: `Your busiest time is ${insights.peakHour.formatted}. Ensure adequate staffing and stock during this period.`,
        type: 'info',
      });
    }

    // Slow day suggestion - only if we have slowest day data
    if (insights?.slowestDay) {
      list.push({
        icon: CalendarX,
        title: `Boost ${insights.slowestDay.name} Sales`,
        desc: `${insights.slowestDay.name} is your slowest day with ${insights.slowestDay.salesCount} sale${insights.slowestDay.salesCount !== 1 ? 's' : ''}. Consider running a special offer like "${insights.slowestDay.name} Deals" to attract more customers.`,
        type: 'tip',
      });
    }

    // Top item combo suggestion - only if we have at least 2 items
    if (topItems?.length >= 2) {
      list.push({
        icon: Package,
        title: 'Create Combo Offer',
        desc: `${topItems[0]?.name} is your bestseller. Try pairing it with ${topItems[1]?.name} for a combo deal to boost sales.`,
        type: 'success',
      });
    }

    // Growth suggestion
    if (summary?.changes?.monthOverMonth > 10) {
      list.push({
        icon: TrendingUp,
        title: 'Great Growth!',
        desc: `Sales are up ${summary.changes.monthOverMonth}% from last month. Keep up the momentum!`,
        type: 'success',
      });
    } else if (summary?.changes?.monthOverMonth < -10) {
      list.push({
        icon: TrendingDown,
        title: 'Sales Dip Alert',
        desc: `Sales are down ${Math.abs(summary.changes.monthOverMonth)}% from last month. Consider promotional offers to recover.`,
        type: 'warning',
      });
    }

    return list.slice(0, 4);
  }, [analytics]);

  // ============== RENDER ==============
  if (loading) return <InsightsSkeleton />;

  const { summary, insights, topItems, paymentMethods, topCustomers, recentActivity } = analytics || {};
  const hasNoSalesData = !insights?.hasData;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sales Insights</h2>
          <p className="text-slate-500 text-sm">Understand what's selling and when.</p>
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

      {/* Empty State Banner - Show when no sales data */}
      {hasNoSalesData && !error && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-2xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={32} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No Sales Data Available Yet</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
            Your sales insights will appear here once you start generating bills. 
            Create your first bill to unlock powerful analytics and recommendations!
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <Clock size={14} />
            <span>Analytics update automatically with each new transaction</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'items', label: 'Top Items', icon: Package },
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
          {/* Insight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Peak Time Card */}
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1">
                  <Clock size={18} /> Peak Sales Time
                </div>
                {insights?.peakHour ? (
                  <>
                    <p className="text-4xl font-bold text-emerald-600 mt-2">
                      {insights.peakHour.formatted}
                    </p>
                    <p className="text-xs text-emerald-700 mt-2 font-medium">
                      {insights.peakHour.salesCount} sale{insights.peakHour.salesCount !== 1 ? 's' : ''} • ₹{(insights.peakHour.totalRevenue || 0).toLocaleString('en-IN')} revenue
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-emerald-600/50 mt-2">
                      No data yet
                    </p>
                    <p className="text-xs text-emerald-700/70 mt-2 font-medium">
                      Insights will appear after your first sale
                    </p>
                  </>
                )}
              </div>
              <Clock className="absolute -right-4 -bottom-4 text-emerald-200 opacity-50" size={120} />
            </div>

            {/* Busiest Day Card */}
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-blue-800 font-bold mb-1">
                  <Calendar size={18} /> Busiest Day
                </div>
                {insights?.busiestDay ? (
                  <>
                    <p className="text-4xl font-bold text-blue-600 mt-2">
                      {insights.busiestDay.name}
                    </p>
                    <p className="text-xs text-blue-700 mt-2 font-medium">
                      {insights.busiestDay.salesCount} sale{insights.busiestDay.salesCount !== 1 ? 's' : ''} • ₹{(insights.busiestDay.totalRevenue || 0).toLocaleString('en-IN')} revenue
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-blue-600/50 mt-2">
                      No data yet
                    </p>
                    <p className="text-xs text-blue-700/70 mt-2 font-medium">
                      Need sales across multiple days to identify patterns
                    </p>
                  </>
                )}
              </div>
              <Calendar className="absolute -right-4 -bottom-4 text-blue-200 opacity-50" size={120} />
            </div>
          </div>

          {/* Slowest Day Alert Card (if busiest and slowest are different) */}
          {insights?.slowestDay && insights?.busiestDay && insights.slowestDay.dayOfWeek !== insights.busiestDay.dayOfWeek && (
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <CalendarX size={24} className="text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-orange-800">Slowest Day: {insights.slowestDay.name}</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Only {insights.slowestDay.salesCount} sale{insights.slowestDay.salesCount !== 1 ? 's' : ''} (₹{(insights.slowestDay.totalRevenue || 0).toLocaleString('en-IN')}) compared to {insights.busiestDay.salesCount} on {insights.busiestDay.name}.
                    Consider running "{insights.slowestDay.name} Special" promotions!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={IndianRupee}
              label="This Month"
              value={`₹${(summary?.thisMonth?.total || 0).toLocaleString('en-IN')}`}
              subValue={`${summary?.thisMonth?.count || 0} receipts`}
              trend={summary?.changes?.monthOverMonth >= 0 ? 'up' : 'down'}
              trendValue={Math.abs(summary?.changes?.monthOverMonth || 0)}
              color="emerald"
            />
            <StatCard
              icon={Calendar}
              label="This Week"
              value={`₹${(summary?.thisWeek?.total || 0).toLocaleString('en-IN')}`}
              subValue={`${summary?.thisWeek?.count || 0} receipts`}
              trend={summary?.changes?.weekOverWeek >= 0 ? 'up' : 'down'}
              trendValue={Math.abs(summary?.changes?.weekOverWeek || 0)}
              color="blue"
            />
            <StatCard
              icon={Receipt}
              label="All Time"
              value={(summary?.totalReceiptsAllTime || 0).toLocaleString()}
              subValue="Total receipts"
              color="purple"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg/Day"
              value={`₹${(summary?.thisMonth?.avgPerDay || 0).toLocaleString('en-IN')}`}
              subValue="This month"
              color="orange"
            />
          </div>

          {/* Daily Sales Chart */}
          {chartData.length > 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">Daily Sales</h3>
                <span className="text-xs text-slate-400">Last 14 days</span>
              </div>
              <MiniBarChart data={chartData} height={100} color="emerald" />
              <div className="flex justify-between mt-2 text-[10px] text-slate-400 overflow-hidden">
                {chartData.filter((_, i) => i % 2 === 0).map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">Daily Sales</h3>
                <span className="text-xs text-slate-400">Last 14 days</span>
              </div>
              <div className="h-[100px] flex items-center justify-center text-slate-400 text-sm">
                Sales chart will appear after your first transaction
              </div>
            </div>
          )}

          {/* Payment Summary - UPI vs Cash Quick View */}
          {paymentMethods?.length > 0 && (
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Wallet size={18} /> Payment Collection Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* UPI */}
                <div className="bg-white/10 backdrop-blur p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <Smartphone size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-emerald-400">UPI</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    ₹{(paymentMethods.find(pm => pm.method?.toLowerCase() === 'upi')?.total || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {paymentMethods.find(pm => pm.method?.toLowerCase() === 'upi')?.count || 0} transactions
                  </p>
                </div>
                {/* Cash */}
                <div className="bg-white/10 backdrop-blur p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-amber-500 rounded-lg">
                      <Banknote size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-amber-400">Cash</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    ₹{(paymentMethods.find(pm => pm.method?.toLowerCase() === 'cash')?.total || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {paymentMethods.find(pm => pm.method?.toLowerCase() === 'cash')?.count || 0} transactions
                  </p>
                </div>
              </div>
            </div>
          )}
          
        </div>
      )}

      {/* ITEMS TAB */}
      {activeTab === 'items' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Items */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-600"/> Top Selling Items
              </h3>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">This Month</span>
            </div>

            <div className="space-y-4">
              {(topItems || []).length === 0 && (
                <div className="text-center py-8">
                  <Package size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No item sales data yet</p>
                  <p className="text-xs text-slate-400 mt-1">Your top-selling items will appear here after your first sale</p>
                </div>
              )}
              {(topItems || []).map((item, idx) => {
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500'];
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800">{item.quantity} sold</span>
                        <span className="text-slate-400 text-xs ml-2">• ₹{item.totalRevenue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-1000`} 
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Avg price: ₹{item.avgPrice}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Users size={18} className="text-blue-500" /> Top Customers
              </h3>
              <Award size={18} className="text-amber-500" />
            </div>
            {topCustomers?.length > 0 ? (
              <div className="space-y-3">
                {topCustomers.map((customer, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                        {(customer.name || 'A')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{customer.name}</p>
                        <p className="text-xs text-slate-400">{customer.visits} visit{customer.visits !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-800">₹{customer.totalSpent.toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No customer data yet</p>
                <p className="text-xs text-slate-400 mt-1">Customer insights will appear once registered customers make purchases</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === 'trends' && (
        <div className="space-y-6 animate-fade-in">
          {/* Monthly Trend */}
          {monthlyChartData.length > 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">Monthly Trend</h3>
                <span className="text-xs text-slate-400">Last 6 months</span>
              </div>
              <MiniBarChart data={monthlyChartData} height={120} color="blue" />
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                {monthlyChartData.map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">Monthly Trend</h3>
                <span className="text-xs text-slate-400">Last 6 months</span>
              </div>
              <div className="h-[120px] flex items-center justify-center text-slate-400 text-sm">
                Monthly trends will appear as you accumulate sales data
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

          {/* Month Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={TrendingUp}
              label="This Month"
              value={`₹${(summary?.thisMonth?.total || 0).toLocaleString('en-IN')}`}
              subValue={`${summary?.thisMonth?.count || 0} receipts`}
              trend={summary?.changes?.monthOverMonth >= 0 ? 'up' : 'down'}
              trendValue={Math.abs(summary?.changes?.monthOverMonth || 0)}
              color="blue"
            />
            <StatCard
              icon={Calendar}
              label="Last Month"
              value={`₹${(summary?.lastMonth?.total || 0).toLocaleString('en-IN')}`}
              subValue={`${summary?.lastMonth?.count || 0} receipts`}
              color="slate"
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4">Recent Activity</h3>
            {recentActivity?.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Receipt size={18} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 text-sm truncate">{activity.customer}</p>
                      <p className="text-xs text-slate-400">
                        {formatISTDisplay(toIST(activity.date), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {' • '}{activity.itemCount} item{activity.itemCount !== 1 ? 's' : ''} • {activity.paymentMethod}
                      </p>
                    </div>
                    <p className="font-bold text-slate-700">₹{activity.amount.toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No recent activity yet</p>
                <p className="text-xs text-slate-400 mt-1">Your latest transactions will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-amber-500" size={20} />
            <h3 className="font-bold text-slate-700">Smart Suggestions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      {/* Footer */}
      <p className="text-center text-xs text-slate-400 pt-4">
        Data refreshed {analytics?.meta?.generatedAt ? formatISTDisplay(toIST(analytics.meta.generatedAt), { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'recently'}
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

export default MerchantInsights;