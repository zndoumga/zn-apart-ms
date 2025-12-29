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
} from 'lucide-react';
import { useCurrency } from '../store/useAppStore';
import {
  LineChart,
  Line,
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
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

const Finances: React.FC = () => {
  const { formatAmount, currency } = useCurrency();
  
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

  // Date range for KPI cards
  const dateRange = useMemo(() => {
    const today = new Date();
    const start = dateRangeStart ? new Date(dateRangeStart) : startOfMonth(today);
    const end = dateRangeEnd ? new Date(dateRangeEnd) : endOfMonth(today);
    return { startDate: start, endDate: end };
  }, [dateRangeStart, dateRangeEnd]);

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

  // Queries
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: expenses, isLoading: loadingExpenses } = useExpenses();
  const { data: properties } = useProperties(true);
  const { data: expensesByCategory } = useExpensesByCategory();

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
      expenses: number; 
      profit: number;
      nightsBooked: number;
      avgNightPrice: number;
      cashflow: number;
      occupancyRate: number;
    }[] = [];
    
    let currentMonth = startOfMonth(startDate);
    const endMonth = endOfMonth(endDate);
    
    while (currentMonth <= endMonth) {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const monthRevenue = calculateTotalRevenue(bookings, monthStart, monthEnd);
      const monthExpenses = calculateTotalExpenses(expenses, monthStart, monthEnd);
      const nightsBooked = calculateNightsBooked(bookings, monthStart, monthEnd);
      const avgNightPrice = nightsBooked > 0 ? monthRevenue.EUR / nightsBooked : 0;
      const occupancyRate = calculateOccupancyRate(bookings, properties, monthStart, monthEnd);
      
      months.push({
        month: format(currentMonth, 'MMM yyyy', { locale: fr }),
        revenue: monthRevenue.EUR,
        expenses: monthExpenses.EUR,
        profit: monthRevenue.EUR - monthExpenses.EUR,
        nightsBooked,
        avgNightPrice: Math.round(avgNightPrice * 100) / 100,
        cashflow: monthRevenue.EUR - monthExpenses.EUR, // Cashflow = Net Income
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
    if (!expenses) return [];

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
      
      // Initialize all categories to 0
      allCategories.forEach((category) => {
        monthData[category] = 0;
      });
      
      // Sum expenses by category for this month
      expenses.forEach((expense) => {
        const expenseDate = new Date(expense.date);
        if (expenseDate >= monthStart && expenseDate <= monthEnd) {
          monthData[expense.category] = (monthData[expense.category] as number) + expense.amountEUR;
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
    return 'Période';
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
          {/* Total Bookings - Light Purple */}
          <div className="bg-purple-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Total Bookings</p>
            <p className="text-3xl font-bold text-gray-900">{metrics?.totalBookings || 0}</p>
          </div>

          {/* Nights Booked - Light Yellow */}
          <div className="bg-yellow-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Nights Booked</p>
            <p className="text-3xl font-bold text-gray-900">{metrics?.nightsBooked || 0}</p>
          </div>

          {/* Occupancy Rate - Light Pink */}
          <div className="bg-pink-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Occupancy Rate</p>
            <p className="text-3xl font-bold text-gray-900">{((metrics?.occupancyRate || 0).toFixed(0))}%</p>
          </div>

          {/* Avg Daily Rate - Light Orange */}
          <div className="bg-orange-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Avg Daily Rate</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatAmount(metrics?.avgDailyRate?.EUR || 0, metrics?.avgDailyRate?.FCFA || 0)}
            </p>
          </div>
        </div>

        {/* KPI Cards - Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Income - Light Green */}
          <div className="bg-green-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Total Income</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatAmount(metrics?.totalIncome?.EUR || 0, metrics?.totalIncome?.FCFA || 0)}
            </p>
          </div>

          {/* Total Expenses - Light Red */}
          <div className="bg-red-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Total Expenses</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatAmount(metrics?.totalExpenses?.EUR || 0, metrics?.totalExpenses?.FCFA || 0)}
            </p>
          </div>

          {/* Net Income - Light Blue */}
          <div className="bg-blue-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Net Income</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatAmount(metrics?.netIncome?.EUR || 0, metrics?.netIncome?.FCFA || 0)}
            </p>
          </div>

          {/* Return on Investment - Light Green */}
          <div className="bg-green-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Return on Investment</p>
            <p className="text-3xl font-bold text-gray-900">{((metrics?.roi || 0).toFixed(1))}%</p>
          </div>
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
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(0)} nuits`} />
                  <Bar dataKey="nightsBooked" fill="#3b82f6" name="Nuits réservées" />
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
                  <BarChart data={channelDataByMonth.months}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                    <Legend />
                    {channelDataByMonth.channels.map((channel, index) => (
                      <Bar
                        key={channel}
                        dataKey={channel}
                        stackId="channels"
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        name={getChannelLabel(channel)}
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

          {/* 3. Revenue vs Expenses */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Revenus vs Dépenses</h3>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      currency === 'EUR' ? `€${Number(value).toFixed(0)}` : `${Number(value).toFixed(0)} FCFA`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    name="Revenus"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    name="Dépenses"
                    strokeWidth={2}
                  />
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
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      currency === 'EUR' ? `€${Number(value).toFixed(0)}` : `${Number(value).toFixed(0)} FCFA`
                    }
                  />
                  <Bar dataKey="profit" name="Revenu net">
                    {monthlyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.profit >= 0 ? '#10b981' : '#ef4444'}
                      />
                    ))}
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
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      currency === 'EUR' ? `€${Number(value).toFixed(2)}` : `${Number(value).toFixed(0)} FCFA`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="avgNightPrice"
                    stroke="#8b5cf6"
                    name="Prix moyen/nuit"
                    strokeWidth={2}
                  />
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
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      currency === 'EUR' ? `€${Number(value).toFixed(0)}` : `${Number(value).toFixed(0)} FCFA`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="cashflow"
                    stroke="#06b6d4"
                    name="Trésorerie"
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
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
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <Line
                    type="monotone"
                    dataKey="occupancyRate"
                    stroke="#ec4899"
                    name="Taux d'occupation"
                    strokeWidth={2}
                    dot={{ fill: '#ec4899', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
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
                {expenseBreakdownByMonth.categories.length > 0 ? (
                  <BarChart data={expenseBreakdownByMonth.months}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) =>
                        currency === 'EUR' ? `€${Number(value).toFixed(0)}` : `${Number(value).toFixed(0)} FCFA`
                      }
                    />
                    <Legend />
                    {expenseBreakdownByMonth.categories.map((category, index) => (
                      <Bar
                        key={category}
                        dataKey={category}
                        stackId="expenses"
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        name={getCategoryLabel(category)}
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

