'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: 'red' | 'blue' | 'green';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonColor = 'red',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  const buttonColorClasses = {
    red: 'bg-red-700 hover:bg-red-800',
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-700 hover:bg-green-800',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 border-4 border-retro-dark shadow-xl">
        <h2 className="text-2xl font-bold text-retro-dark mb-4">{title}</h2>
        <p className="text-retro-dark mb-6">{message}</p>
        
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border-2 border-retro-dark text-retro-dark font-bold rounded hover:bg-gray-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-6 py-2 text-white font-bold rounded transition-colors ${buttonColorClasses[confirmButtonColor]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

