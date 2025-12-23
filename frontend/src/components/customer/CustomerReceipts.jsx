import React, { useState, useEffect } from 'react';
import { MOCK_RECEIPTS } from './customerData';
import ReceiptCard from './ReceiptCard';
import { Search, Filter, Inbox } from 'lucide-react';
import { fetchCustomerReceipts } from '../../services/api';

const CustomerReceipts = () => {
  const [receipts, setReceipts] = useState([]);

  // Load from backend, fall back to cached/mocks if it fails.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await fetchCustomerReceipts();
        // Handle paginated response structure
        const receiptsData = data.receipts || data || [];
        if (mounted) {
          setReceipts(receiptsData);
          localStorage.setItem('customerReceipts', JSON.stringify(receiptsData));
        }
      } catch (error) {
        const saved = localStorage.getItem('customerReceipts');
        const fallback = saved ? JSON.parse(saved) : MOCK_RECEIPTS;
        if (mounted) setReceipts(fallback);
      }
    };
    load();

    const handleUpdate = () => load();
    window.addEventListener('customer-receipts-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('customer-receipts-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // 💾 EFFECT: Auto-save changes (client-only edits like delete)
  useEffect(() => {
    if (receipts?.length) {
      localStorage.setItem('customerReceipts', JSON.stringify(receipts));
    }
  }, [receipts]);

  // UI State
  const [filter, setFilter] = useState("all"); // all, qr, upload
  const [search, setSearch] = useState("");

  // ——— CRUD ACTIONS ———
  
  // 🗑️ DELETE (called after API call succeeds in ReceiptCard)
  const handleDelete = (id) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  // ✏️ UPDATE
  const handleUpdate = (updatedReceipt) => {
    setReceipts(prev => prev.map(r => r.id === updatedReceipt.id ? updatedReceipt : r));
  };

  // 🔍 FILTER LOGIC
  const filtered = receipts.filter(r => {
     const matchesType = filter === 'all' || r.type === filter;
     const matchesSearch = r.merchant.toLowerCase().includes(search.toLowerCase());
     return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      
      {/* Header & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-10">
         <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
            <input 
              type="text" 
              placeholder="Search receipts..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
         </div>
         <div className="flex gap-2">
            {['all', 'qr', 'upload'].map(type => (
              <button 
                key={type}
                onClick={() => setFilter(type)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${filter === type ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                {type === 'qr' ? 'Digital' : type === 'upload' ? 'Uploaded' : 'All'}
              </button>
            ))}
         </div>
      </div>

      {/* List */}
      <div className="space-y-3">
         {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 opacity-60 flex flex-col items-center">
               <Inbox size={48} className="mb-2 opacity-50"/>
               <p className="font-medium">No receipts found.</p>
            </div>
         ) : (
            filtered.map(r => (
                <div key={r.id} className="relative">
                    {/* Visual indicator for Excluded Receipts */}
                    {r.excludeFromStats && (
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 -ml-6 hidden md:flex items-center justify-center w-6 h-6" title="Excluded from Analytics">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        </div>
                    )}
                    <ReceiptCard 
                        data={r} 
                        onDelete={() => handleDelete(r.id)} 
                        onUpdate={handleUpdate}
                    />
                </div>
            ))
         )}
      </div>
    </div>
  );
};

export default CustomerReceipts;