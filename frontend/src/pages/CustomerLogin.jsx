import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, setSession } from "../services/api.js";
import { Receipt, Mail, Lock, Eye, EyeOff } from "lucide-react"; // 👈 Used Lucide for consistent icons

const CustomerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 👁️ VISIBILITY STATE
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await loginUser({ email, password, role: "customer" });
      setSession({ token: data.token, role: data.role });
      navigate("/customer-dashboard");
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-green-50 min-h-screen flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-[420px]">
        {/* Logo Section */}
        <div className="text-center mb-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition"
          >
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-sm shadow-lg shadow-green-500/30">
              <Receipt size={20} />
            </div>
            <span className="text-xl font-bold text-slate-900">
              GreenReceipt
            </span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 p-8 md:p-10 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-green-300"></div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            Access your digital receipts and smart analytics.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && <div className="text-sm text-red-600">{error}</div>}
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 ml-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="text-slate-400" size={20} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/50 focus:bg-white transition-all placeholder-slate-400 text-slate-800"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field with Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-slate-400" size={20} />
                </div>
                
                {/* 👇 DYNAMIC TYPE: text or password */}
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/50 focus:bg-white transition-all placeholder-slate-400 text-slate-800"
                  placeholder="••••••••"
                />

                {/* 👁️ TOGGLE BUTTON */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex justify-end mt-2">
                <Link
                  to="/forgot-password"
                  state={{ role: "customer" }}
                  className="text-xs font-semibold text-emerald-600 hover:text-green-700"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-4 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5 transition-all duration-300 text-sm tracking-wide disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>

            {/* NEW LINK BELOW BUTTON */}
            <div className="text-center mt-4">
              <span className="text-xs text-slate-400">
                New to GreenReceipt?{" "}
              </span>
              <Link
                to="/customer-signup"
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                Create Account
              </Link>
            </div>
          </form>

          {/* Switch to Merchant */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">Business owner?</p>
            <Link
              to="/merchant-login"
              className="inline-block mt-1 text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors"
            >
              Switch to Merchant Login &rarr;
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          &copy; 2025 GreenReceipt. Secure & Encrypted.
        </p>
      </div>
    </div>
  );
};

export default CustomerLogin;