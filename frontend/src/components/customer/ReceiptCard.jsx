import React, { useState } from 'react';
import { QrCode, Image, X, Calendar, Receipt, Trash2, CreditCard, Smartphone, EyeOff, CheckCircle, Check, Banknote, Loader2 } from 'lucide-react';
import { updateReceipt, deleteReceipt as deleteReceiptApi } from '../../services/api';

const ReceiptCard = ({ data, onDelete, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(
    data.status === 'completed' ? (data.paymentMethod === 'cash' ? 'Cash' : data.paymentMethod === 'upi' ? 'UPI' : 'Paid') : null
  );

  const isQR = data.type === 'qr';

  // Process payment - update backend and reflect locally
  const handlePayment = async (method) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const paymentMethod = method === 'UPI' ? 'upi' : 'cash';
      const { data: updatedReceipt } = await updateReceipt(data.id, {
        paymentMethod,
        status: 'completed'
      });
      
      // Update local state with backend response
      onUpdate(updatedReceipt);
      setPaymentStatus(method);
    } catch (error) {
      console.error('Payment update failed:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete receipt from backend
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this receipt?")) return;
    
    setIsProcessing(true);
    try {
      await deleteReceiptApi(data.id);
      onDelete(data.id);
      setIsOpen(false);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete receipt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* 🔹 THE CARD (Timeline View) */}
      <div 
        onClick={() => setIsOpen(true)}
        className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]
            ${data.excludeFromStats ? 'border-slate-200 opacity-75 grayscale-[0.5]' : 'border-slate-100'}
        `}
      >
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${isQR ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
               {isQR ? <QrCode size={18}/> : <Image size={18}/>}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 line-clamp-1">{data.merchant}</h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                {data.date} • {data.time}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800">₹{data.amount}</p>
            <div className="flex justify-end gap-1 mt-1">
                {data.excludeFromStats && <EyeOff size={12} className="text-slate-400" />}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isQR ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                {isQR ? 'Digital' : 'Upload'}
                </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🔹 THE DETAIL MODAL (Popup) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-50 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-[popIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <span className="text-sm font-bold flex items-center gap-2"><Receipt size={16}/> Receipt Detail</span>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20"><X size={16}/></button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto bg-white m-4 rounded-xl shadow-sm border border-slate-200">
               
               {/* 1. Editable Header Info */}
               <div className="text-center border-b border-dashed border-slate-200 pb-4 mb-4">
                  <>
                    <h2 className="text-xl font-bold text-slate-800">{data.merchant}</h2>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Calendar size={12}/> {data.date} at {data.time}</p>
                  </>
                  
                  {isQR && <p className="text-[10px] text-emerald-600 font-bold uppercase mt-2 bg-emerald-50 inline-block px-2 py-1 rounded">Verified GreenReceipt</p>}
                  
                    {data.excludeFromStats && (
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 bg-slate-100 inline-block px-2 py-1 rounded flex items-center gap-1 mx-auto w-fit"><EyeOff size={10}/> Excluded from Stats</p>
                    )}
               </div>

               {/* 2. Items or Image */}
               {isQR ? (
                 <div className="space-y-3 mb-4">
                   {data.items && data.items.map((item, i) => {
                     const qty = item.qty || item.quantity || 1;
                     const price = item.price || item.unitPrice || 0;
                     return (
                       <div key={i} className="flex justify-between text-sm">
                         <span className="text-slate-600">{qty} x {item.name}</span>
                         <span className="font-bold text-slate-800">₹{price * qty}</span>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="mb-4">
                    <div className="aspect-[3/4] bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden relative">
                        {data.image ? <img src={data.image} alt="Receipt" className="w-full h-full object-cover" /> : <p className="text-xs text-slate-400">No image preview</p>}
                    </div>
                 </div>
               )}

               {/* 3. Amount */}
               <div className="border-t border-dashed border-slate-200 pt-4 flex justify-between items-center mb-6">
                 <span className="font-bold text-slate-500">TOTAL PAID</span>
                 <span className="text-2xl font-bold text-slate-800">₹{data.amount}</span>
               </div>
               
               <div className="text-center space-y-2">
                 <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Stored in GreenReceipt Vault</p>
                 {data.status === 'completed' && (
                    <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 justify-center">
                      <Check size={14}/> Paid via {data.paymentMethod === 'cash' ? 'Cash' : data.paymentMethod === 'upi' ? 'UPI' : data.paymentMethod === 'card' ? 'Card' : data.paymentMethod || 'Unknown'}
                    </p>
                 )}
               </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center">
                <button 
                    onClick={handleDelete} 
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete
                </button>
                {data.status === 'completed' ? (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                    <Check size={14}/> Paid via {data.paymentMethod === 'cash' ? 'Cash' : data.paymentMethod === 'upi' ? 'UPI' : data.paymentMethod || 'Unknown'}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button 
                        onClick={() => handlePayment('UPI')} 
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />} Pay UPI
                    </button>
                    <button 
                        onClick={() => handlePayment('Cash')} 
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />} Pay Cash
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReceiptCard;