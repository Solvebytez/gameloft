'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Input from './Input';
import DatePicker from './DatePicker';

interface MatchDateFieldProps {
  onFind?: (date: string) => void;
}

export default function MatchDateField({ onFind }: MatchDateFieldProps) {
  const [date, setDate] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const validateDate = (dateValue: string): boolean => {
    if (!dateValue || dateValue.trim() === '') {
      return false;
    }
    // Validate dd-mm-yyyy format
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dateRegex.test(dateValue)) {
      return false;
    }
    const [day, month, year] = dateValue.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return (
      dateObj.getDate() === day &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getFullYear() === year
    );
  };

  const handleFind = () => {
    if (!validateDate(date)) {
      toast.error('Please select a valid date', {
        duration: 3000,
        style: {
          background: '#fff',
          color: '#d32f2f',
          border: '2px solid #d32f2f',
        },
      });
      return;
    }
    
    toast.success(`Finding matches for ${date}`, {
      duration: 3000,
      style: {
        background: '#fff',
        color: '#2e7d32',
        border: '2px solid #2e7d32',
      },
    });
    
    if (onFind) {
      onFind(date);
    }
  };

  const handleDateChange = (selectedDate: string) => {
    setDate(selectedDate);
    toast.success(`Date selected: ${selectedDate}`, {
      duration: 2000,
      style: {
        background: '#fff',
        color: '#2e7d32',
        border: '2px solid #2e7d32',
      },
    });
  };

  const handleInputFocus = () => {
    setIsCalendarOpen(true);
  };

  const handleCalendarClose = () => {
    setIsCalendarOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFind();
    } else if (e.key === 'Escape') {
      setIsCalendarOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <label htmlFor="match-date" className="block text-sm font-bold text-retro-dark">
        Match Date*
      </label>
      <div className="flex items-stretch gap-2">
        <div className="w-[70%] relative">
          <input
            type="text"
            id="match-date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
            }}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="dd-mm-yyyy"
            className="w-full h-full px-4 py-3 bg-white border-[3px] border-retro-dark text-retro-dark font-bold text-lg rounded focus:outline-none focus:ring-2 focus:ring-retro-accent disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ paddingRight: '2.5rem' }}
          />
          <svg
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <DatePicker
            value={date}
            onChange={handleDateChange}
            onClose={handleCalendarClose}
            isOpen={isCalendarOpen}
            onSelectAndClose={() => setIsCalendarOpen(false)}
          />
        </div>
        <button
          type="button"
          onClick={handleFind}
          className="w-[30%] px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity self-stretch"
        >
          Find
        </button>
      </div>
    </div>
  );
}

