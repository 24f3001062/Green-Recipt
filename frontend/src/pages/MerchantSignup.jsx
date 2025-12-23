// import React, { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { signupMerchant } from '../services/api.js';
// import { Store, Mail, Lock, Eye, EyeOff, ArrowLeft, Building2 } from 'lucide-react'; // 👈 Lucide Icons

// const MerchantSignup = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     shopName: '',
//     email: '',
//     password: '',
//     confirmPassword: ''
//   });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [info, setInfo] = useState('');

//   // 👁️ VISIBILITY STATES (Independent for each field)
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSignup = async (e) => {
//     e.preventDefault();
//     if (formData.password !== formData.confirmPassword) {
//       setError('Passwords do not match!');
//       return;
//     }
//     setLoading(true);
//     setError('');
//     setInfo('');
//     try {
//       await signupMerchant({
//         shopName: formData.shopName,
//         email: formData.email,
//         password: formData.password,
//         confirmPassword: formData.confirmPassword,
//       });
//       navigate('/verify-merchant', { state: { email: formData.email } });
//     } catch (error) {
//       const message = error.response?.data?.message || "Signup failed";
//       setError(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="bg-gradient-to-br from-slate-50 via-white to-slate-200 min-h-screen flex items-center justify-center p-4 font-sans text-slate-900 relative">

// //       {/* Back to Home Button */}
// //       <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm hover:shadow-md transition-all group">
//         <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
//           // <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
// //         <span>Home</span>
// //       </Link>

// //       <div className="w-full max-w-[420px]">
// //         {/* Header */}
// //         <div className="text-center mb-8">
// //           <div className="inline-flex items-center gap-2 mb-4">
// //             <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-sm shadow-lg shadow-slate-500/30">
//               <i className="fas fa-store"></i>
//                 // <Store size={18} />
// //             </div>
// //             <span className="text-xl font-bold text-slate-900">GreenReceipt</span>
// //           </div>
// //           <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full ml-2">
// //             Merchant Portal
// //           </div>
// //         </div>

// //         {/* Signup Card */}
// //         <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-300/60 p-8 md:p-10 border border-slate-100 relative overflow-hidden">
// //           {/* Top Bar (Navy Blue for Merchants) */}
// //           <div className="absolute top-0 left-0 w-full h-1 bg-slate-900"></div>

// //           <h2 className="text-2xl font-bold text-slate-900 mb-2">Register Business</h2>
// //           <p className="text-slate-500 text-sm mb-6">Start generating digital receipts today.</p>

// //           <form onSubmit={handleSignup} className="space-y-4">
// //             {error && <div className="text-sm text-red-600">{error}</div>}
// //             {info && <div className="text-sm text-emerald-700">{info}</div>}

// //             {/* Business Name */}
// //             <div>
// //               <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">Business Name</label>
// //               <div className="relative">
// //                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
//                     {/* <i className="fas fa-building text-slate-400"></i> */}
//                     // <Building2 className="text-slate-400" size={20} />
// //                 </div>
// //                 <input
//                   name="shopName" type="text" required
//                   onChange={handleChange}
//                   className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/30"
//                   placeholder="My Coffee Shop"
//                 />
//               </div>
//             </div>

//             {/* Email */}
//             <div>
//               <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">Business Email</label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
//                     {/* <i className="fas fa-envelope text-slate-400"></i> */}
//                     // <Mail className="text-slate-400" size={20} />
// //                 </div>
// //                 <input
//                   name="email" type="email" required
//                   onChange={handleChange}
//                   className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/30"
//                   placeholder="admin@business.com"
//                 />
//               </div>
//             </div>

//             {/* Password */}
//             <div>
//               <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">
//                 Password
//                 <span className="font-normal normal-case text-slate-400 ml-2">
//                   (min. 6 characters)
//                 </span>
//               </label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
//                     <Lock className="text-slate-400" size={20} />
//                 </div>

//                 {/* 👇 DYNAMIC TYPE */}
//                 <input
//                   name="password"
//                   type={showPassword ? "text" : "password"}
//                   required
//                   onChange={handleChange}
//                   className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/30"
//                   placeholder="••••••••"
//                 />

//                 {/* 👁️ TOGGLE */}
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
//                 >
//                   {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//                 </button>
//               </div>
//               <input
//                 name="password" type="password" required
//                 onChange={handleChange}
//                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/30"
//                 placeholder="••••••••"
//               />
//             </div>

// //             {/* Confirm Password */}
// //             <div>
// //               <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">
// //                 Confirm Password
// //                 <span className="font-normal normal-case text-slate-400 ml-2">
// //                   (min. 6 characters)
// //                 </span>
// //               </label>
//               // <div className="relative">
//               //     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
//               //       <Lock className="text-slate-400" size={20} />
//               //     </div>

//               //   {/* 👇 DYNAMIC TYPE */}
//               //   <input
//                   name="confirmPassword"
//                   type={showConfirmPassword ? "text" : "password"}
//                   required
//                   onChange={handleChange}
//                   className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/30"
//                   placeholder="••••••••"
//                 />

//                  {/* 👁️ TOGGLE */}
//                  <button
//                   type="button"
//                   onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                   className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
//                 >
//                   {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//                 </button>
//               </div>
// //               <input
//                 name="confirmPassword" type="password" required
//                 onChange={handleChange}
//                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/30"
//                 placeholder="••••••••"
//               />
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full py-3.5 mt-2 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60"
//             >
//               {loading ? 'Creating account...' : 'Create Account'}
//             </button>
//           </form>

//           {/* Toggle to Login */}
//           <div className="mt-6 pt-6 border-t border-slate-100 text-center">
//             <p className="text-sm text-slate-500">Already have an account?</p>
//             <Link to="/merchant-login" className="inline-block mt-1 text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors">
//               Log In here &rarr;
//             </Link>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MerchantSignup;

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupMerchant } from "../services/api.js";
import {
  Store,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Building2,
} from "lucide-react"; // 👈 Lucide Icons

const MerchantSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    shopName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // 👁️ VISIBILITY STATES (Independent for each field)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      await signupMerchant({
        shopName: formData.shopName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      navigate("/verify-merchant", { state: { email: formData.email } });
    } catch (error) {
      const message = error.response?.data?.message || "Signup failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-200 min-h-screen flex items-center justify-center p-4 font-sans text-slate-900 relative">
      {/* Back to Home Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm hover:shadow-md transition-all group"
      >
        <ArrowLeft
          size={16}
          className="group-hover:-translate-x-1 transition-transform"
        />
        <span>Home</span>
      </Link>

      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-sm shadow-lg shadow-slate-500/30">
              <i className="fas fa-store"></i>
               {/* <Store size={18} /> */}
            </div>
            <span className="text-xl font-bold text-slate-900">
              GreenReceipt
            </span>
          </div>
          <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full ml-2">
            Merchant Portal
          </div>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-300/60 p-8 md:p-10 border border-slate-100 relative overflow-hidden">
          {/* Top Bar (Navy Blue for Merchants) */}
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-900"></div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Register Business
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Start generating digital receipts today.
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && <div className="text-sm text-red-600">{error}</div>}
            {info && <div className="text-sm text-emerald-700">{info}</div>}

            {/* Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">
                Business Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building2 className="text-slate-400" size={20} />
                </div>
                <input
                  name="shopName"
                  type="text"
                  required
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/30"
                  placeholder="My Coffee Shop"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">
                Business Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="text-slate-400" size={20} />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/30"
                  placeholder="admin@business.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">
                Password
                <span className="font-normal normal-case text-slate-400 ml-2">
                  (min. 6 characters)
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-slate-400" size={20} />
                </div>

                {/* 👇 DYNAMIC TYPE */}
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  onChange={handleChange}
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/30"
                  placeholder="••••••••"
                />

                {/* 👁️ TOGGLE */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-slate-400" size={20} />
                </div>

                {/* 👇 DYNAMIC TYPE */}
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  onChange={handleChange}
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/30"
                  placeholder="••••••••"
                />

                {/* 👁️ TOGGLE */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Toggle to Login */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">Already have an account?</p>
            <Link
              to="/merchant-login"
              className="inline-block mt-1 text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors"
            >
              Log In here &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantSignup;