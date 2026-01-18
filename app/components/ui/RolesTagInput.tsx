'use client';

import { useState, KeyboardEvent } from 'react';

interface RolesTagInputProps {
  value: string[];
  onChange: (roles: string[]) => void;
  label?: string;
  error?: string;
}

export default function RolesTagInput({ value, onChange, label, error }: RolesTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const handleRemoveTag = (roleToRemove: string) => {
    onChange(value.filter((role) => role !== roleToRemove));
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-[#2d2d2d] mb-2 uppercase">
          {label}
        </label>
      )}
      <div className="w-full min-h-[3rem] px-4 py-2 bg-white border-[3px] border-retro-dark text-retro-dark font-bold text-lg rounded focus-within:outline-none focus-within:ring-2 focus-within:ring-retro-accent flex flex-wrap gap-2 items-center">
        {value.map((role) => (
          <span
            key={role}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-md font-semibold text-sm"
          >
            {role}
            <button
              type="button"
              onClick={() => handleRemoveTag(role)}
              className="hover:text-red-200 focus:outline-none"
              aria-label={`Remove ${role}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? 'Add role...' : ''}
          className="flex-1 min-w-[120px] outline-none font-bold text-lg bg-transparent"
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

