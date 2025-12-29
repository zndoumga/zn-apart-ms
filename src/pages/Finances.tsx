import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calendar,
  BarChart3,
  CalendarRange,
  X,
  Moon,
} from 'lucide-react';
import { useCurrency } from '../store/useAppStore';
import { roundFCFAToNearest25, formatFCFAWithSeparator } from '../utils/currency';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import Select from '../components/ui/Select';
import DatePicker from '../components/ui/DatePicker';
import StatsCard from '../components/dashboard/StatsCard';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useBookings } from '../hooks/useBookings';
import { useExpenses, useExpensesByCategory } from '../hooks/useExpenses';
import { useProperties } from '../hooks/useProperties';
import {
  calculateTotalRevenue,
  calculateTotalExpenses,
  calculateOccupancyRate,
  calculateNightsBooked,
  calculateAverageNightPrice,
  calculateRevenueByProperty,
} from '../utils/calculations';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  format,
  subDays,
  subWeeks,
  subYears,
  startOfYear,
  endOfYear,
  differenceInDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';

const CHART_COLORS = [
  '#6366f1', // indigo-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

// Channel-specific colors
const getChannelColor = (channel: string): string => {
  const channelLower = channel.toLowerCase();
  if (channelLower === 'airbnb') {
    return '#FF5A5F'; // Airbnb brand color (coral red)
  } else if (channelLower === 'booking') {
    return '#003580'; // Booking.com brand color (dark blue)
  } else if (channelLower === 'direct') {
    return '#000000'; // Black for direct
  }
  return '#6366f1'; // Default indigo for other channels
};

// Format number with K notation for FCFA axis
const formatAxisLabel = (value: number, currency: string): string => {
  if (currency === 'FCFA') {
    // If value is >= 1 million, divide by 1,000,000 and show as X.XXXK
    if (value >= 1000000) {
      const valueInMillions = value / 1000000;
      return `${valueInMillions.toFixed(3).replace(/\.?0+$/, '')}K`;
    }
    // Otherwise divide by 1000 and show as whole number with K
    const valueInK = value / 1000;
    return `${Math.round(valueInK)}K`;
  }
  // For EUR, use standard formatting with dot as thousand separator
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(value).replace(/[\s\u00A0]/g, '.');
};

const Finances: React.FC = () => {
  const { formatAmount, currency } = useCurrency();
  
  // Helper function to format tooltip values with FCFA rounding and separator
  const formatTooltipValue = (value: number): string => {
    if (currency === 'EUR') {
      const formatted = Number(value).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `€${formatted}`;
    }
    const rounded = roundFCFAToNearest25(value);
    return `${formatFCFAWithSeparator(rounded)} FCFA`;
  };
  
  // Helper function to format labels (uses K notation for FCFA, no decimals for EUR)
  const formatLabelValue = (value: number): string => {
    if (currency === 'EUR') {
      const formatted = Number(value).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `€${formatted}`;
    }
    // Use K notation for FCFA
    return formatAxisLabel(value, currency);
  };
  
  // Date range for KPI cards
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Period selector for charts
  const [chartPeriod, setChartPeriod] = useState<string>('last12months');

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Queries - must be declared before dateRange useMemo
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: expenses, isLoading: loadingExpenses } = useExpenses();
  const { data: properties } = useProperties(true);
  const { data: expensesByCategory } = useExpensesByCategory();

  // Date range for KPI cards
  const dateRange = useMemo(() => {
    const today = new Date();
    let defaultStart: Date;
    
    // If no start date is selected, use the minimum check-in date from bookings
    if (!dateRangeStart && bookings && bookings.length > 0) {
      const checkInDates = bookings
        .filter(b => b.status !== 'cancelled' && b.checkIn)
        .map(b => new Date(b.checkIn));
      
      if (checkInDates.length > 0) {
        defaultStart = new Date(Math.min(...checkInDates.map(d => d.getTime())));
      } else {
        defaultStart = new Date(2000, 0, 1); // Fallback if no valid bookings
      }
    } else if (!dateRangeStart) {
      defaultStart = new Date(2000, 0, 1); // Fallback if no bookings
    } else {
      defaultStart = new Date(dateRangeStart);
    }
    
    const start = dateRangeStart ? new Date(dateRangeStart) : defaultStart;
    const end = dateRangeEnd ? new Date(dateRangeEnd) : today;
    return { startDate: start, endDate: end };
  }, [dateRangeStart, dateRangeEnd, bookings]);

  // Chart period calculation
  const chartDateRange = useMemo(() => {
    const today = new Date();
    let start: Date;
    
    switch (chartPeriod) {
      case 'last3months':
        start = startOfMonth(subMonths(today, 2));
        break;
      case 'last6months':
        start = startOfMonth(subMonths(today, 5));
        break;
      case 'last12months':
        start = startOfMonth(subMonths(today, 11));
        break;
      case 'lastYear':
        start = startOfYear(subYears(today, 1));
        return { startDate: start, endDate: endOfYear(subYears(today, 1)) };
      case 'thisYear':
        start = startOfYear(today);
        return { startDate: start, endDate: today };
      default:
        start = startOfMonth(subMonths(today, 11));
    }
    
    return { startDate: start, endDate: today };
  }, [chartPeriod]);

  // Previous period for comparison (same duration as selected period, but shifted back)
  const previousRange = useMemo(() => {
    const duration = differenceInDays(dateRange.endDate, dateRange.startDate);
    const previousEnd = subDays(dateRange.startDate, 1);
    const previousStart = subDays(previousEnd, duration);
    return {
      startDate: previousStart,
      endDate: previousEnd,
    };
  }, [dateRange]);

  // Calculations
  const metrics = useMemo(() => {
    if (!bookings || !expenses || !properties) return null;

    const currentRevenue = calculateTotalRevenue(
      bookings,
      dateRange.startDate,
      dateRange.endDate
    );
    const currentExpenses = calculateTotalExpenses(
      expenses,
      dateRange.startDate,
      dateRange.endDate
    );

    const occupancyRate = calculateOccupancyRate(
      bookings,
      properties,
      dateRange.startDate,
      dateRange.endDate
    );

    const nightsBooked = calculateNightsBooked(
      bookings,
      dateRange.startDate,
      dateRange.endDate
    );

    const avgDailyRate = calculateAverageNightPrice(
      bookings,
      dateRange.startDate,
      dateRange.endDate
    );

    // Filter bookings in period (excluding cancelled)
    const bookingsInPeriod = bookings.filter(
      (b) => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        return (
          b.status !== 'cancelled' &&
          ((checkIn >= dateRange.startDate && checkIn <= dateRange.endDate) ||
           (checkOut >= dateRange.startDate && checkOut <= dateRange.endDate) ||
           (checkIn <= dateRange.startDate && checkOut >= dateRange.endDate))
        );
      }
    );

    const totalBookings = bookingsInPeriod.length;
    const netIncome = {
      EUR: currentRevenue.EUR - currentExpenses.EUR,
      FCFA: currentRevenue.FCFA - currentExpenses.FCFA,
    };

    // Calculate total investment from all active properties
    // Investment = Purchase Price + Travaux + Meubles + Équipement
    // Note: Rent is NOT included in investment (it's tracked separately and counted in expenses)
    const totalInvestment = properties
      .filter(p => p.status === 'active')
      .reduce((sum, property) => {
        const purchasePrice = property.purchasePriceEUR || 0;
        const travaux = property.travauxEUR || 0;
        const meubles = property.meublesEUR || 0;
        const equipement = property.equipementEUR || 0;
        
        return sum + purchasePrice + travaux + meubles + equipement;
      }, 0);

    // ROI = (Net Income / Total Investment) × 100
    const roi = totalInvestment > 0 
      ? (netIncome.EUR / totalInvestment) * 100 
      : 0;

    return {
      totalBookings,
      nightsBooked,
      occupancyRate,
      avgDailyRate,
      totalIncome: currentRevenue,
      totalExpenses: currentExpenses,
      netIncome,
      roi,
    };
  }, [bookings, expenses, properties, dateRange]);

  // Monthly data for charts based on chart period
  const monthlyData = useMemo(() => {
    if (!bookings || !expenses || !properties) return [];

    const { startDate, endDate } = chartDateRange;
    const months: { 
      month: string; 
      revenue: number; 
      revenueFCFA: number;
      expenses: number; 
      expensesFCFA: number;
      profit: number;
      profitFCFA: number;
      nightsBooked: number;
      avgNightPrice: number;
      avgNightPriceFCFA: number;
      cashflow: number;
      cashflowFCFA: number;
      occupancyRate: number;
    }[] = [];
    
    let currentMonth = startOfMonth(startDate);
    const endMonth = endOfMonth(endDate);
    
    // Track cumulative cashflow
    let cumulativeCashflowEUR = 0;
    let cumulativeCashflowFCFA = 0;
    
    while (currentMonth <= endMonth) {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const monthRevenue = calculateTotalRevenue(bookings, monthStart, monthEnd);
      const monthExpenses = calculateTotalExpenses(expenses, monthStart, monthEnd);
      const nightsBooked = calculateNightsBooked(bookings, monthStart, monthEnd);
      const avgNightPriceEUR = nightsBooked > 0 ? monthRevenue.EUR / nightsBooked : 0;
      const avgNightPriceFCFA = nightsBooked > 0 ? monthRevenue.FCFA / nightsBooked : 0;
      const occupancyRate = calculateOccupancyRate(bookings, properties, monthStart, monthEnd);
      
      // Calculate monthly profit
      const monthlyProfitEUR = monthRevenue.EUR - monthExpenses.EUR;
      const monthlyProfitFCFA = monthRevenue.FCFA - monthExpenses.FCFA;
      
      // Add to cumulative cashflow
      cumulativeCashflowEUR += monthlyProfitEUR;
      cumulativeCashflowFCFA += monthlyProfitFCFA;
      
      months.push({
        month: format(currentMonth, 'MMM yyyy', { locale: fr }),
        revenue: monthRevenue.EUR,
        revenueFCFA: monthRevenue.FCFA,
        expenses: monthExpenses.EUR,
        expensesFCFA: monthExpenses.FCFA,
        profit: monthlyProfitEUR,
        profitFCFA: monthlyProfitFCFA,
        nightsBooked,
        avgNightPrice: Math.round(avgNightPriceEUR * 100) / 100,
        avgNightPriceFCFA: Math.round(avgNightPriceFCFA * 100) / 100,
        cashflow: cumulativeCashflowEUR, // Cumulative cashflow (rolling sum)
        cashflowFCFA: cumulativeCashflowFCFA,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      });
      
      currentMonth = startOfMonth(addMonths(currentMonth, 1));
    }
    
    return months;
  }, [bookings, expenses, properties, chartDateRange]);

  // Booking channels distribution by month (percentage of bookings by channel)
  const channelDataByMonth = useMemo(() => {
    if (!bookings) return { months: [], channels: [] };

    const { startDate, endDate } = chartDateRange;
    const months: { month: string; [channel: string]: number | string }[] = [];
    const allChannels = new Set<string>();
    
    // First, collect all channels
    bookings.forEach((b) => {
      if (b.status !== 'cancelled') {
        allChannels.add(b.source);
      }
    });
    
    let currentMonth = startOfMonth(startDate);
    const endMonth = endOfMonth(endDate);
    
    while (currentMonth <= endMonth) {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const monthData: { month: string; [channel: string]: number | string } = {
        month: format(currentMonth, 'MMM yyyy', { locale: fr }),
      };
      
      // Initialize all channels to 0
      allChannels.forEach((channel) => {
        monthData[channel] = 0;
      });
      
      // Count bookings by channel for this month
      const monthBookings = bookings.filter((b) => {
        const checkIn = new Date(b.checkIn);
        return b.status !== 'cancelled' && checkIn >= monthStart && checkIn <= monthEnd;
      });
      
      const total = monthBookings.length;
      
      if (total > 0) {
        monthBookings.forEach((booking) => {
          monthData[booking.source] = (monthData[booking.source] as number) + 1;
        });
        
        // Convert counts to percentages
        allChannels.forEach((channel) => {
          monthData[channel] = ((monthData[channel] as number) / total) * 100;
        });
      }
      
      months.push(monthData);
      currentMonth = startOfMonth(addMonths(currentMonth, 1));
    }
    
    return { months, channels: Array.from(allChannels) };
  }, [bookings, chartDateRange]);

  // Expense breakdown by month (by category)
  const expenseBreakdownByMonth = useMemo(() => {
    if (!expenses) return { months: [], categories: [] };

    const { startDate, endDate } = chartDateRange;
    const months: { month: string; [category: string]: number | string }[] = [];
    
    let currentMonth = startOfMonth(startDate);
    const endMonth = endOfMonth(endDate);
    
    // Get all unique categories
    const allCategories = new Set<string>();
    expenses.forEach((e) => {
      const expenseDate = new Date(e.date);
      if (expenseDate >= startDate && expenseDate <= endDate) {
        allCategories.add(e.category);
      }
    });
    
    while (currentMonth <= endMonth) {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const monthData: { month: string; [category: string]: number | string } = {
        month: format(currentMonth, 'MMM yyyy', { locale: fr }),
      };
      
      // Initialize all categories to 0 for both EUR and FCFA
      allCategories.forEach((category) => {
        monthData[category] = 0;
        monthData[`${category}_FCFA`] = 0;
      });
      
      // Sum expenses by category for this month
      expenses.forEach((expense) => {
        const expenseDate = new Date(expense.date);
        if (expenseDate >= monthStart && expenseDate <= monthEnd) {
          monthData[expense.category] = (monthData[expense.category] as number) + expense.amountEUR;
          monthData[`${expense.category}_FCFA`] = (monthData[`${expense.category}_FCFA`] as number) + expense.amountFCFA;
        }
      });
      
      months.push(monthData);
      currentMonth = startOfMonth(addMonths(currentMonth, 1));
    }
    
    return { months, categories: Array.from(allCategories) };
  }, [expenses, chartDateRange]);


  const isLoading = loadingBookings || loadingExpenses;

  if (isLoading) {
    return <LoadingSpinner className="h-64" />;
  }

  const chartPeriodOptions = [
    { value: 'last3months', label: '3 derniers mois' },
    { value: 'last6months', label: '6 derniers mois' },
    { value: 'last12months', label: '12 derniers mois' },
    { value: 'lastYear', label: 'Année dernière' },
    { value: 'thisYear', label: 'Cette année' },
  ];

  const getDateRangeLabel = () => {
    if (dateRangeStart && dateRangeEnd) {
      return `${format(new Date(dateRangeStart), 'dd MMM yyyy', { locale: fr })} - ${format(new Date(dateRangeEnd), 'dd MMM yyyy', { locale: fr })}`;
    }
    if (dateRangeStart) {
      return `Depuis ${format(new Date(dateRangeStart), 'dd MMM yyyy', { locale: fr })}`;
    }
    if (dateRangeEnd) {
      return `Jusqu'au ${format(new Date(dateRangeEnd), 'dd MMM yyyy', { locale: fr })}`;
    }
    return 'Tout';
  };

  const clearDateRange = () => {
    setDateRangeStart('');
    setDateRangeEnd('');
    setShowDatePicker(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord KPI</h1>
          <p className="text-gray-600 mt-1">Analyse de vos performances financières</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Période KPI:</span>
          <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer hover:bg-gray-50 ${
                  dateRangeStart || dateRangeEnd ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <CalendarRange className="w-4 h-4 text-gray-500" />
                <span>{getDateRangeLabel()}</span>
                {(dateRangeStart || dateRangeEnd) && (
                  <X 
                    className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" 
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDateRange();
                    }}
                  />
                )}
              </button>
              
              {showDatePicker && (
                <div className="absolute top-full right-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[280px]">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Du</label>
                      <DatePicker
                        value={dateRangeStart}
                        onChange={(date) => setDateRangeStart(date)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Au</label>
                      <DatePicker
                        value={dateRangeEnd}
                        onChange={(date) => setDateRangeEnd(date)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <button
                        onClick={clearDateRange}
                        className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                      >
                        Effacer
                      </button>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Section 1: KPI Cards */}
      <div className="space-y-4">
        {/* KPI Cards - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Bookings */}
          <StatsCard
            title="Total Bookings"
            value={metrics?.totalBookings || 0}
            icon={<Calendar className="w-5 h-5" />}
            variant="default"
          />

          {/* Nights Booked */}
          <StatsCard
            title="Nights Booked"
            value={metrics?.nightsBooked || 0}
            icon={<Moon className="w-5 h-5" />}
            variant="default"
          />

          {/* Occupancy Rate */}
          <StatsCard
            title="Occupancy Rate"
            value={`${((metrics?.occupancyRate || 0).toFixed(0))}%`}
            icon={<Percent className="w-5 h-5" />}
            variant="default"
          />

          {/* Avg Daily Rate */}
          <StatsCard
            title="Avg Daily Rate"
            value={formatAmount(metrics?.avgDailyRate?.EUR || 0, metrics?.avgDailyRate?.FCFA || 0)}
            icon={<DollarSign className="w-5 h-5" />}
            variant="default"
          />
        </div>

        {/* KPI Cards - Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Income */}
          <StatsCard
            title="Total Income"
            value={formatAmount(metrics?.totalIncome?.EUR || 0, metrics?.totalIncome?.FCFA || 0)}
            icon={<TrendingUp className="w-5 h-5" />}
            variant="success"
          />

          {/* Total Expenses */}
          <StatsCard
            title="Total Expenses"
            value={formatAmount(metrics?.totalExpenses?.EUR || 0, metrics?.totalExpenses?.FCFA || 0)}
            icon={<DollarSign className="w-5 h-5" />}
            variant="default"
          />

          {/* Net Income */}
          <StatsCard
            title="Net Income"
            value={formatAmount(metrics?.netIncome?.EUR || 0, metrics?.netIncome?.FCFA || 0)}
            icon={<TrendingUp className="w-5 h-5" />}
            variant={metrics?.netIncome && metrics.netIncome.EUR > 0 ? 'success' : 'danger'}
          />

          {/* Return on Investment */}
          <StatsCard
            title="Return on Investment"
            value={`${((metrics?.roi || 0).toFixed(1))}%`}
            icon={<Percent className="w-5 h-5" />}
            variant={metrics?.roi && metrics.roi > 0 ? 'success' : 'default'}
          />
        </div>
      </div>

      {/* Section 2: Charts with Period Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Période:</span>
            <Select
              options={chartPeriodOptions}
              value={chartPeriod}
              onChange={setChartPeriod}
              className="w-48"
            />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Nights booked per month */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Nuits réservées par mois</h3>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    domain={[0, 31]}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value) => [`${Number(value).toFixed(0)} nuits`, 'Nuits réservées']}
                  />
                  <Bar 
                    dataKey="nightsBooked" 
                    fill="#6366f1" 
                    name="Nuits réservées"
                    radius={[8, 8, 0, 0]}
                  >
                    <LabelList 
                      dataKey="nightsBooked" 
                      position="top"
                      offset={10}
                      formatter={(value: any) => `${Number(value).toFixed(0)}`}
                      style={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* 2. % Bookings by channels by month (stacked bar showing 100% per month) */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">% Réservations par canal par mois</h3>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                {channelDataByMonth.channels.length > 0 ? (
                  <BarChart data={channelDataByMonth.months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value) => `${Math.ceil(Number(value))}%`}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="square"
                      iconSize={12}
                    />
                    {channelDataByMonth.channels.map((channel, index) => (
                      <Bar
                        key={channel}
                        dataKey={channel}
                        stackId="channels"
                        fill={getChannelColor(channel)}
                        name={getChannelLabel(channel)}
                        radius={index === channelDataByMonth.channels.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                      >
                        <LabelList
                          dataKey={channel}
                          position="center"
                          formatter={(value: any) => {
                            const percent = Number(value);
                            return percent > 0 ? `${Math.ceil(percent)}%` : '';
                          }}
                          style={{ 
                            fill: '#ffffff', 
                            fontSize: 10, 
                            fontWeight: 600,
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                          }}
                        />
                      </Bar>
                    ))}
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Aucune donnée disponible
                  </div>
                )}
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* 3. Revenue vs Expenses */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Revenus vs Dépenses</h3>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => formatAxisLabel(value, currency)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: any) => formatTooltipValue(Number(value))}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                    iconSize={16}
                  />
                  <Line
                    type="monotone"
                    dataKey={currency === 'EUR' ? 'revenue' : 'revenueFCFA'}
                    stroke="#10b981"
                    name="Revenus"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  >
                    <LabelList
                      dataKey={currency === 'EUR' ? 'revenue' : 'revenueFCFA'}
                      position="top"
                      offset={10}
                      formatter={(value: any) => formatLabelValue(Number(value))}
                      style={{ fill: '#10b981', fontSize: 10, fontWeight: 600 }}
                    />
                  </Line>
                  <Line
                    type="monotone"
                    dataKey={currency === 'EUR' ? 'expenses' : 'expensesFCFA'}
                    stroke="#ef4444"
                    name="Dépenses"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  >
                    <LabelList
                      dataKey={currency === 'EUR' ? 'expenses' : 'expensesFCFA'}
                      position="top"
                      offset={10}
                      formatter={(value: any) => formatLabelValue(Number(value))}
                      style={{ fill: '#ef4444', fontSize: 10, fontWeight: 600 }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* 4. Net income by month */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Revenu net par mois</h3>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => formatAxisLabel(value, currency)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: any) => formatTooltipValue(Number(value))}
                  />
                  <Bar dataKey={currency === 'EUR' ? 'profit' : 'profitFCFA'} name="Revenu net" radius={[8, 8, 0, 0]}>
                    <LabelList
                      dataKey={currency === 'EUR' ? 'profit' : 'profitFCFA'}
                      position="top"
                      offset={10}
                      formatter={(value: any) => formatLabelValue(Number(value))}
                      style={{ fill: '#6b7280', fontSize: 10, fontWeight: 500 }}
                    />
                    {monthlyData.map((entry, index) => {
                      const profitValue = currency === 'EUR' ? entry.profit : entry.profitFCFA;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={profitValue >= 0 ? '#10b981' : '#ef4444'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* 5. Average night price by month */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Prix moyen par nuit par mois</h3>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => formatAxisLabel(value, currency)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: any) => formatTooltipValue(Number(value))}
                  />
                  <Line
                    type="monotone"
                    dataKey={currency === 'EUR' ? 'avgNightPrice' : 'avgNightPriceFCFA'}
                    stroke="#8b5cf6"
                    name="Prix moyen/nuit"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  >
                    <LabelList
                      dataKey={currency === 'EUR' ? 'avgNightPrice' : 'avgNightPriceFCFA'}
                      position="top"
                      offset={10}
                      formatter={(value: any) => formatLabelValue(Number(value))}
                      style={{ fill: '#8b5cf6', fontSize: 10, fontWeight: 600 }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* 6. Cashflow trend month after month */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Tendance de trésorerie</h3>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cashflowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => formatAxisLabel(value, currency)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: any) => formatTooltipValue(Number(value))}
                  />
                  <Area
                    type="monotone"
                    dataKey={currency === 'EUR' ? 'cashflow' : 'cashflowFCFA'}
                    stroke="#06b6d4"
                    fill="url(#cashflowGradient)"
                    name="Trésorerie"
                    strokeWidth={3}
                    dot={{ fill: '#06b6d4', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  >
                    <LabelList
                      dataKey={currency === 'EUR' ? 'cashflow' : 'cashflowFCFA'}
                      position="top"
                      offset={10}
                      formatter={(value: any) => formatLabelValue(Number(value))}
                      style={{ fill: '#06b6d4', fontSize: 10, fontWeight: 600 }}
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* 7. Occupancy rate by month */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Taux d'occupation par mois</h3>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                  />
                  <Line
                    type="monotone"
                    dataKey="occupancyRate"
                    stroke="#ec4899"
                    name="Taux d'occupation"
                    strokeWidth={3}
                    dot={{ fill: '#ec4899', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  >
                    <LabelList
                      dataKey="occupancyRate"
                      position="top"
                      offset={10}
                      formatter={(value: any) => `${Math.round(Number(value))}%`}
                      style={{ fill: '#ec4899', fontSize: 10, fontWeight: 600 }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* 8. Expense breakdown by month */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Répartition des dépenses par mois</h3>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                {expenseBreakdownByMonth.categories && expenseBreakdownByMonth.categories.length > 0 ? (
                  <BarChart data={expenseBreakdownByMonth.months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(value) => formatAxisLabel(value, currency)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value: any) =>
                        currency === 'EUR' ? `€${Number(value).toFixed(0)}` : `${Number(value).toFixed(0)} FCFA`
                      }
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="square"
                      iconSize={12}
                    />
                    {expenseBreakdownByMonth.categories.map((category: string, index: number) => (
                      <Bar
                        key={category}
                        dataKey={currency === 'EUR' ? category : `${category}_FCFA`}
                        stackId="expenses"
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        name={getCategoryLabel(category)}
                        radius={index === expenseBreakdownByMonth.categories.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Aucune donnée disponible
                  </div>
                )}
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

function getChannelLabel(source: string): string {
  const labels: Record<string, string> = {
    airbnb: 'Airbnb',
    booking: 'Booking.com',
    direct: 'Direct',
    other: 'Autre',
  };
  return labels[source] || source;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    cleaning: 'Nettoyage',
    maintenance: 'Maintenance',
    utilities: 'Services',
    supplies: 'Fournitures',
    wages: 'Salaires',
    taxes: 'Taxes',
    marketing: 'Marketing',
    furnishings: 'Mobilier',
    security: 'Sécurité',
    rent: 'Loyer',
    common_areas: 'Espaces communs',
    consumables: 'Consommables',
    laundry: 'Blanchisserie',
    canal_sat: 'Canal Sat',
    other: 'Autre',
  };
  return labels[category] || category;
}

export default Finances;

