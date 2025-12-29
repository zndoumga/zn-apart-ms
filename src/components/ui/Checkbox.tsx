import React from 'react';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, onChange, checked, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
    };

    return (
      <div className={clsx('flex items-start', className)}>
        <div className="flex items-center h-5">
          <div className="relative">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              checked={checked}
              onChange={handleChange}
              className="sr-only peer"
              {...props}
            />
            <div
              className={clsx(
                'w-4 h-4 border rounded transition-colors cursor-pointer',
                'peer-focus:ring-2 peer-focus:ring-primary-500 peer-focus:ring-offset-2',
                'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
                checked
                  ? 'bg-primary-600 border-primary-600'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              )}
            >
              {checked && (
                <Check className="w-3 h-3 text-white absolute top-0.5 left-0.5" />
              )}
            </div>
          </div>
        </div>
        {(label || description) && (
          <div className="ml-3">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;

