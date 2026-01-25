'use client';

import { Toaster } from 'react-hot-toast';
import SuperAdminLoginForm from '@/app/components/auth/SuperAdminLoginForm';

export default function SuperAdminLoginPage() {
  return (
    <>
      <div className="min-h-screen bg-[#e8dcc8] flex items-center justify-center relative px-4">
        {/* Green square indicator - top right */}
        <div className="absolute top-4 right-4 w-4 h-4 bg-green-500"></div>
        
        <div className="w-full max-w-md">
          {/* Title */}
          <h1 className="text-4xl font-bold text-[#2d2d2d] text-center mb-2">
            Gameloft
          </h1>
          
          {/* Subtitle */}
          <p className="text-sm text-[#2d2d2d] text-center mb-8">
            Super Admin Sign in to continue
          </p>
          
          {/* Login Form */}
          <SuperAdminLoginForm />
          
          {/* Footer */}
          <p className="text-sm text-[#2d2d2d] text-center mt-8">
            Gameloft Super Admin Authentication
          </p>
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
}

