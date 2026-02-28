'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Input from '@/app/components/ui/Input';
import api from '@/app/lib/api';

export default function SuperAdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    console.log('🔐 Login attempt:', { email, password: '***' });

    try {
      // Note: API routes are exempt from CSRF validation
      // No need to get CSRF cookie for API requests
      
      // Make the login request
      const response = await api.post('/v1/superadmin/login', {
        email,
        password,
      });

      console.log('✅ Login response:', response);
      console.log('✅ Response data:', response.data);
      console.log('✅ Response status:', response.status);
      console.log('✅ Response headers:', response.headers);
      console.log('✅ Cookies:', document.cookie);

      if (response.data.success) {
        console.log('✅ Login successful, redirecting...');
        toast.success('Login successful!');
        
        // Store admin data in sessionStorage if remember me is checked
        if (rememberMe && response.data.data?.admin) {
          sessionStorage.setItem('admin', JSON.stringify(response.data.data.admin));
          console.log('✅ Admin data stored in sessionStorage');
        }
        
        // Wait a moment for cookies to be set, then redirect
        // Using window.location instead of router.push to ensure cookies are sent
        setTimeout(() => {
          window.location.href = '/superadmin';
        }, 100);
      } else {
        console.warn('⚠️ Login response success is false:', response.data);
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error response status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      if (error.stack) {
        console.error('❌ Error stack:', error.stack);
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.email?.[0] ||
                          error.message ||
                          'Login failed. Please check your credentials.';
      console.error('❌ Showing error toast:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🏁 Login attempt finished');
    }
  };

  return (
    <div className="bg-[#f5f1e8] border-4 border-[#2d2d2d] rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <Input
          type="email"
          label="EMAIL"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-[#2d2d2d] mb-2 uppercase"
          >
            PASSWORD
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="pr-12"
              label=""
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2d2d2d] hover:text-[#8b6f47] focus:outline-none transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Forgot Password and Remember Me */}
        <div className="flex items-center justify-between">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 border-2 border-[#2d2d2d] rounded text-[#8b6f47] focus:ring-2 focus:ring-[#2d2d2d] focus:ring-offset-2 cursor-pointer"
            />
            <span className="ml-2 text-sm text-[#2d2d2d]">Remember me</span>
          </label>
          <a
            href="#"
            className="text-sm text-[#2d2d2d] hover:underline"
            onClick={(e) => {
              e.preventDefault();
              // Handle forgot password logic here
            }}
          >
            Forgot your password?
          </a>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-[#8b6f47] text-white font-semibold uppercase rounded-md hover:bg-[#7a5f3a] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'LOGGING IN...' : 'LOGIN'}
        </button>
      </form>
    </div>
  );
}

