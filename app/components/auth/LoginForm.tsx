'use client';

import { useState } from 'react';
import Input from '@/app/components/ui/Input';
import api from '@/app/lib/api';

function firstValidationMessage(
  errors: Record<string, string[] | string> | undefined,
  key: string
): string | undefined {
  const v = errors?.[key];
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  if (typeof v === 'string') return v;
  return undefined;
}

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();

  const clearErrors = () => {
    setEmailError(undefined);
    setPasswordError(undefined);
    setFormError(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearErrors();

    try {
      const response = await api.post('/v1/admin/login', {
        email,
        password,
      });

      if (response.data.success) {
        if (rememberMe && response.data.data?.admin) {
          sessionStorage.setItem('admin', JSON.stringify(response.data.data.admin));
        }

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      } else {
        setFormError(response.data.message || 'Login failed.');
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; errors?: Record<string, string[] | string> } };
        message?: string;
      };
      const data = err.response?.data;
      const errors = data?.errors;
      const emailErr = firstValidationMessage(errors, 'email');
      const passwordErr = firstValidationMessage(errors, 'password');
      setEmailError(emailErr);
      setPasswordError(passwordErr);
      const hasFieldErrors = !!(emailErr || passwordErr);
      if (!hasFieldErrors) {
        setFormError(
          data?.message ||
            err.message ||
            'Login failed. Please check your credentials.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border-4 border-[#2d2d2d] rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div
            className="rounded-md border-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {formError}
          </div>
        )}
        {/* Email Field */}
        <Input
          type="email"
          label="EMAIL"
          id="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(undefined);
            setFormError(undefined);
          }}
          placeholder="Enter your email"
          required
          className="py-3 text-xl"
          error={emailError}
        />

        {/* Password Field */}
        <Input
          type="password"
          label="PASSWORD"
          id="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError(undefined);
            setFormError(undefined);
          }}
          placeholder="Enter your password"
          required
          className="py-3 text-xl"
          error={passwordError}
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
          className="w-full py-3 text-white font-semibold uppercase rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#3c8dbc' }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#357abd';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#3c8dbc';
            }
          }}
        >
          {isLoading ? 'LOGGING IN...' : 'LOGIN'}
        </button>
      </form>
    </div>
  );
}

