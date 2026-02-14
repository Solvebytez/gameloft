import React, { useId, forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  labelClassName?: string;
  containerClassName?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  labelClassName = "",
  containerClassName = "",
  error,
  className = "",
  id,
  options,
  value,
  ...props
}, ref) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const isEmpty = value === '' || value === undefined || value === null;

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={selectId}
          className={`block text-sm font-semibold text-[#2d2d2d] mb-2 uppercase ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        value={value}
        className={`w-full px-4 py-3 bg-white border-[3px] border-retro-dark text-retro-dark font-bold text-lg rounded focus:outline-none focus:ring-2 focus:ring-retro-accent disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-red-500" : ""
        } ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
});

Select.displayName = "Select";

export default Select;

