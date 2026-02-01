'use client';

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';

interface MultiSelectProps {
  label?: string;
  options: Array<{ value: string | number; label: string }>;
  selectedValues: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  onSearch?: (searchTerm: string) => void;
  placeholder?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onEnterKey?: () => void;
}

const MultiSelect = forwardRef<HTMLDivElement, MultiSelectProps>(({
  label,
  options,
  selectedValues,
  onChange,
  onSearch,
  placeholder = 'Search and select...',
  error,
  containerClassName = '',
  labelClassName = '',
  inputRef: externalInputRef,
  onEnterKey,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const isClosingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset highlighted index when filtered options change
  useEffect(() => {
    if (filteredOptions.length > 0) {
      setHighlightedIndex(0);
    }
  }, [filteredOptions.length]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside both container and dropdown
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (isOpen && isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  // Focus input when dropdown opens (but not when closing)
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure dropdown is rendered
      const timer = setTimeout(() => {
        // Double check it's still open before focusing
        if (isOpen && inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const toggleOption = (value: string | number, e?: React.MouseEvent | React.ChangeEvent<HTMLInputElement>) => {
    if (e) {
      e.stopPropagation();
      if ('preventDefault' in e) {
        e.preventDefault();
      }
    }
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
    // Don't close dropdown when toggling options
  };

  const removeOption = (value: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== value));
  };

  const getSelectedLabels = () => {
    return selectedValues
      .map((value) => options.find((opt) => opt.value === value)?.label)
      .filter(Boolean) as string[];
  };

  return (
    <div ref={containerRef} className={containerClassName}>
      {label && (
        <label
          className={`block text-sm font-semibold text-[#2d2d2d] mb-2 uppercase ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <div
          className={`w-full min-h-[48px] px-4 py-3 bg-white border-[3px] border-retro-dark text-retro-dark font-bold text-lg rounded focus-within:ring-2 focus-within:ring-retro-accent cursor-pointer ${
            error ? 'border-red-500' : ''
          }`}
          onClick={() => {
            if (!isClosingRef.current) {
              setIsOpen(!isOpen);
            }
          }}
        >
          <div className="flex flex-wrap gap-2 items-center min-h-[24px]">
            {selectedValues.length > 0 ? (
              getSelectedLabels().map((label, index) => {
                const value = selectedValues[index];
                return (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-retro-accent/20 text-retro-dark rounded text-sm"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={(e) => removeOption(value, e)}
                      className="hover:text-red-600 focus:outline-none"
                    >
                      ×
                    </button>
                  </span>
                );
              })
            ) : null}
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onSearch?.(e.target.value);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isClosingRef.current) {
                  setIsOpen(true);
                }
              }}
              onFocus={() => {
                // Completely disabled - don't auto-open on focus
                // This prevents the dropdown from reopening when we're trying to close it
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.nativeEvent) {
                    e.nativeEvent.stopImmediatePropagation();
                  }
                  
                  // If dropdown is open
                  if (isOpen) {
                    // Set closing flag FIRST
                    isClosingRef.current = true;
                    
                    // If there are filtered options and the highlighted one is NOT selected, select it
                    // If it's already selected, don't toggle (just close)
                    if (filteredOptions.length > 0) {
                      const selectedOption = filteredOptions[highlightedIndex] || filteredOptions[0];
                      const isAlreadySelected = selectedValues.includes(selectedOption.value);
                      // Only toggle if not already selected
                      if (!isAlreadySelected) {
                        toggleOption(selectedOption.value, e as any);
                      }
                    }
                    
                    // Close dropdown using functional update
                    setIsOpen(() => false);
                    setSearchTerm('');
                    setHighlightedIndex(0);
                    
                    // Blur immediately
                    requestAnimationFrame(() => {
                      if (inputRef.current) {
                        inputRef.current.blur();
                      }
                    });
                    
                    // Move to next field
                    setTimeout(() => {
                      // Ensure it's closed
                      setIsOpen(false);
                      onEnterKey?.();
                    }, 200);
                    
                    // Reset flag after delay
                    setTimeout(() => {
                      isClosingRef.current = false;
                    }, 1000);
                  } 
                  // If dropdown is closed, open it
                  else {
                    setIsOpen(true);
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (!isOpen) {
                    setIsOpen(true);
                  } else if (filteredOptions.length > 0) {
                    setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (isOpen && filteredOptions.length > 0) {
                    setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsOpen(false);
                  setSearchTerm('');
                }
              }}
              placeholder={selectedValues.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-retro-dark font-bold text-lg placeholder:text-retro-dark/60"
            />
          </div>
        </div>

        {isOpen && dropdownPosition && typeof window !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white border-2 border-retro-dark rounded-lg shadow-xl max-h-60 overflow-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                // If there's a highlighted option, select it only if not already selected
                if (filteredOptions.length > 0) {
                  const selectedOption = filteredOptions[highlightedIndex] || filteredOptions[0];
                  const isAlreadySelected = selectedValues.includes(selectedOption.value);
                  // Only toggle if not already selected
                  if (!isAlreadySelected) {
                    toggleOption(selectedOption.value, e as any);
                  }
                  setIsOpen(false);
                  setSearchTerm('');
                  setHighlightedIndex(0);
                  setTimeout(() => {
                    onEnterKey?.();
                  }, 100);
                }
              }
            }}
            tabIndex={-1}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const isHighlighted = index === highlightedIndex;
                return (
                  <div
                    key={option.value}
                    className={`px-4 py-2 cursor-pointer hover:bg-retro-accent/10 ${
                      isSelected ? 'bg-retro-accent/20' : ''
                    } ${
                      isHighlighted ? 'bg-blue-100' : ''
                    }`}
                    onClick={(e) => toggleOption(option.value, e)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        // Only toggle if not already selected (don't deselect)
                        const isAlreadySelected = selectedValues.includes(option.value);
                        if (!isAlreadySelected) {
                          toggleOption(option.value, e);
                        }
                        // Close dropdown and move to next field
                        setIsOpen(false);
                        setSearchTerm('');
                        setHighlightedIndex(0);
                        setTimeout(() => {
                          onEnterKey?.();
                        }, 100);
                      }
                    }}
                    tabIndex={0}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleOption(option.value, e);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-retro-accent border-retro-dark rounded focus:ring-retro-accent cursor-pointer"
                      />
                      <span className="text-retro-dark font-semibold pointer-events-none">
                        {option.label}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-2 text-retro-dark/60 text-center">
                No users found
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
});

MultiSelect.displayName = 'MultiSelect';

export default MultiSelect;

