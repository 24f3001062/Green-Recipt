import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../contexts/AuthContext";
import * as api from "../../services/api";

/**
 * Google Login Button Component
 * 
 * Handles Google Sign-In flow:
 * 1. User clicks the Google button
 * 2. Google popup authenticates user
 * 3. Frontend receives ID token
 * 4. Backend verifies token and issues session
 * 
 * @param {Object} props
 * @param {string} props.role - User role: "customer" or "merchant"
 * @param {function} props.onSuccess - Callback after successful login
 * @param {function} props.onError - Callback after failed login
 * @param {string} props.buttonText - Custom button text
 */
const GoogleLoginButton = ({ 
  role = "customer", 
  onSuccess, 
  onError,
  buttonText = "Continue with Google",
  className = ""
}) => {
  const { handleVerification } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError(null);

    try {
      // Send Google credential to backend
      const response = await api.googleAuth({
        credential: credentialResponse.credential,
        role,
      });

      // Store session using the auth context
      api.setSession({
        accessToken: response.data.accessToken,
        expiresIn: response.data.expiresIn,
        role: response.data.role,
        user: response.data.user,
        isProfileComplete: response.data.user?.isProfileComplete,
      });

      // Update auth context
      handleVerification(response.data);

      // Call success callback
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      console.error("Google auth error:", err);
      
      const errorMessage = err.response?.data?.message || "Google sign-in failed";
      const errorCode = err.response?.data?.code;
      
      setError(errorMessage);
      
      if (onError) {
        onError({ message: errorMessage, code: errorCode, error: err });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    const errorMessage = "Google sign-in was cancelled or failed";
    setError(errorMessage);
    
    if (onError) {
      onError({ message: errorMessage, code: "GOOGLE_POPUP_CLOSED" });
    }
  };

  return (
    <div className={`google-login-container ${className}`}>
      {error && (
        <div className="text-sm text-red-600 mb-3 text-center">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="w-full flex items-center justify-center py-3 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 text-slate-600">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="4" 
                fill="none"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm font-medium">Signing in...</span>
          </div>
        </div>
      ) : (
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          text="continue_with"
          shape="rectangular"
          size="large"
          width="100%"
          logo_alignment="left"
          useOneTap={false}
          theme="outline"
        />
      )}
    </div>
  );
};

export default GoogleLoginButton;
