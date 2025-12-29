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
      bg: 'bg-primary-50',
      icon: 'text-primary-600',
    },
    success: {
      bg: 'bg-success-50',
      icon: 'text-success-600',
    },
    warning: {
      bg: 'bg-warning-50',
      icon: 'text-warning-600',
    },
    danger: {
      bg: 'bg-danger-50',
      icon: 'text-danger-600',
    },
  };

  const getChangeColor = () => {
    if (change === undefined || change === 0) return 'text-gray-500';
    return change > 0 ? 'text-success-600' : 'text-danger-600';
  };

  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="w-4 h-4" />;
    return change > 0 ? (
      <TrendingUp className="w-4 h-4" />
    ) : (
      <TrendingDown className="w-4 h-4" />
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-10 bg-gray-200 rounded-lg" />
        </div>
        <div className="mt-4">
          <div className="h-8 w-32 bg-gray-200 rounded" />
        </div>
        <div className="mt-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-600">{title}</p>
        <div
          className={clsx(
            'p-1.5 rounded-lg',
            variants[variant].bg
          )}
        >
          <span className={variants[variant].icon}>{icon}</span>
        </div>
      </div>
      
      <div className="mt-3">
        <h3 className="text-xl font-bold text-gray-900">{value}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      
      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className={clsx('flex items-center gap-1', getChangeColor())}>
            {getTrendIcon()}
            <span className="text-xs font-medium">
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
          </div>
          {changeLabel && (
            <span className="text-xs text-gray-500">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;

