import React from 'react';
import { clsx } from 'clsx';
import type { Currency } from '../../types';

interface CurrencyToggleProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  className?: string;
  size?: 'sm' | 'md';
}

const CurrencyToggle: React.FC<CurrencyToggleProps> = ({
  value,
  onChange,
  className,
  size = 'md',
}) => {
  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <div className={clsx('inline-flex rounded-lg bg-gray-100 p-1', className)}>
      <button
        type="button"
        onClick={() => onChange('EUR')}
        className={clsx(
          'rounded-md font-medium transition-all duration-200',
          sizes[size],
          value === 'EUR'
            ? 'bg-white text-primary-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        EUR €
      </button>
      <button
        type="button"
        onClick={() => onChange('FCFA')}
        className={clsx(
          'rounded-md font-medium transition-all duration-200',
          sizes[size],
          value === 'FCFA'
            ? 'bg-white text-primary-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        FCFA
      </button>
    </div>
  );
};

export default CurrencyToggle;

