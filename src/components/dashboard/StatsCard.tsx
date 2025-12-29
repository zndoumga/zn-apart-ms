import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changeLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  subtitle?: string;
  isLoading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  change,
  changeLabel,
  variant = 'default',
  subtitle,
  isLoading = false,
}) => {
  const variants = {
    default: {
      bg: 'bg-indigo-50',
      icon: 'text-indigo-600',
    },
    success: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
    },
    warning: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
    },
    danger: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
    },
  };

  const getChangeColor = () => {
    if (change === undefined || change === 0) return 'text-gray-500';
    return change > 0 ? 'text-emerald-600' : 'text-red-600';
  };

  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="w-3.5 h-3.5" />;
    return change > 0 ? (
      <TrendingUp className="w-3.5 h-3.5" />
    ) : (
      <TrendingDown className="w-3.5 h-3.5" />
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 animate-pulse">
        <div className="flex items-start justify-between mb-6">
          <div className="h-3 w-28 bg-gray-200 rounded" />
          <div className="h-12 w-12 bg-gray-200 rounded-xl" />
        </div>
        <div className="mb-4">
          <div className="h-10 w-40 bg-gray-200 rounded" />
        </div>
        <div>
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-6">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <div
          className={clsx(
            'p-3 rounded-xl',
            variants[variant].bg
          )}
        >
          <span className={clsx(variants[variant].icon, 'text-lg')}>{icon}</span>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">{value}</h3>
        {subtitle && <p className="text-xs text-gray-500 font-medium">{subtitle}</p>}
      </div>
      
      {change !== undefined && (
        <div className="flex items-center gap-2 pt-1">
          <div className={clsx('flex items-center gap-1.5', getChangeColor())}>
            {getTrendIcon()}
            <span className="text-sm font-semibold">
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
          </div>
          {changeLabel && (
            <span className="text-xs text-gray-500 font-medium">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;

