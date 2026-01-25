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
        <Input
          type="password"
          label="PASSWORD"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />

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

