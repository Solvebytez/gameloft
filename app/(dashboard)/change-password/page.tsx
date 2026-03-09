'use client';

import { useState, useRef } from 'react';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import { useChangePassword } from '@/app/hooks/useChangePassword';

export default function ChangePasswordPage() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmationPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmationPassword, setShowConfirmationPassword] = useState(false);
  
  const changePasswordMutation = useChangePassword();

  // Refs for input fields to enable keyboard navigation
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmationPasswordRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle Enter key to move focus to next field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Define the order of fields
      const fieldOrder = ['currentPassword', 'newPassword', 'confirmationPassword'];
      const currentIndex = fieldOrder.indexOf(currentField);
      
      if (currentIndex < fieldOrder.length - 1) {
        // Move to next field
        const nextField = fieldOrder[currentIndex + 1];
        if (nextField === 'newPassword' && newPasswordRef.current) {
          newPasswordRef.current.focus();
          newPasswordRef.current.select();
        } else if (nextField === 'confirmationPassword' && confirmationPasswordRef.current) {
          confirmationPasswordRef.current.focus();
          confirmationPasswordRef.current.select();
        }
      } else {
        // Last field, submit form
        handleSubmit(e as any);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};

    // Validation
    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    }
    if (!formData.confirmationPassword.trim()) {
      newErrors.confirmationPassword = 'Confirmation password is required';
    } else if (formData.newPassword !== formData.confirmationPassword) {
      newErrors.confirmationPassword = 'Passwords do not match';
    }
    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    // Set errors and show toast if validation fails
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      console.error(firstError, { duration: 3000 });
      return;
    }

    // Clear all errors on success
    setErrors({});

    try {
      await changePasswordMutation.mutateAsync({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirmation_password: formData.confirmationPassword,
      });
      
      // Reset form on success
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmationPassword: '',
      });
    } catch (error: any) {
      // Error is already handled by the mutation's onError callback
      console.error('Error changing password:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password Field */}
          <div>
            <label
              htmlFor="current-password"
              className="block text-sm font-semibold text-[#2d2d2d] mb-2 uppercase"
            >
              Current Password*
            </label>
            <div className="relative">
              <Input
                ref={currentPasswordRef}
                type={showCurrentPassword ? 'text' : 'password'}
                id="current-password"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'currentPassword')}
                error={errors.currentPassword}
                placeholder="Enter current password"
                disabled={changePasswordMutation.isPending}
                className="pr-12"
                label=""
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 focus:outline-none"
                tabIndex={-1}
              >
                {showCurrentPassword ? (
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
            {errors.currentPassword && <p className="mt-1 text-sm text-red-500">{errors.currentPassword}</p>}
          </div>

          {/* New Password Field */}
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-semibold text-[#2d2d2d] mb-2 uppercase"
            >
              New Password*
            </label>
            <div className="relative">
              <Input
                ref={newPasswordRef}
                type={showNewPassword ? 'text' : 'password'}
                id="new-password"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'newPassword')}
                error={errors.newPassword}
                placeholder="Enter new password"
                disabled={changePasswordMutation.isPending}
                className="pr-12"
                label=""
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 focus:outline-none"
                tabIndex={-1}
              >
                {showNewPassword ? (
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
            {errors.newPassword && <p className="mt-1 text-sm text-red-500">{errors.newPassword}</p>}
          </div>

          {/* Confirmation Password Field */}
          <div>
            <label
              htmlFor="confirmation-password"
              className="block text-sm font-semibold text-[#2d2d2d] mb-2 uppercase"
            >
              Confirmation Password*
            </label>
            <div className="relative">
              <Input
                ref={confirmationPasswordRef}
                type={showConfirmationPassword ? 'text' : 'password'}
                id="confirmation-password"
                value={formData.confirmationPassword}
                onChange={(e) => handleInputChange('confirmationPassword', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'confirmationPassword')}
                error={errors.confirmationPassword}
                placeholder="Confirm new password"
                disabled={changePasswordMutation.isPending}
                className="pr-12"
                label=""
              />
              <button
                type="button"
                onClick={() => setShowConfirmationPassword(!showConfirmationPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 focus:outline-none"
                tabIndex={-1}
              >
                {showConfirmationPassword ? (
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
            {errors.confirmationPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmationPassword}</p>}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="px-6 py-3 bg-green-700 text-white font-bold text-lg rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changePasswordMutation.isPending ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
