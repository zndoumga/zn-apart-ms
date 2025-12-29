import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calendar,
  BarChart3,
} from 'lucide-react';
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
import StatsCard from '../components/dashboard/StatsCard';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useBookings } from '../hooks/useBookings';
import { useExpenses, useExpensesByCategory } from '../hooks/useExpenses';
import { useProperties } from '../hooks/useProperties';
import { useCurrency } from '../store/useAppStore';
import {
  calculateOccupancyRate,
  calculateADR,
  calculateRevPAR,
  calculateAvgStayLength,
  calculateCancellationRate,
  calculateExpenseRatio,
  calculateNetProfit,
  calculateRevenueByProperty,
  calculateMonthlyRevenue,
  calculateMonthlyExpenses,
  calculatePercentageChange,
  calculateTotalRevenue,
  calculateTotalExpenses,
} from '../utils/calculations';
import { getDateRangePreset, DATE_RANGE_PRESETS } from '../utils/dates';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
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
  const [datePreset, setDatePreset] = useState('thisMonth');
  const [year, setYear] = useState(new Date().getFullYear());

  // Date range based on preset
  const dateRange = useMemo(() => getDateRangePreset(datePreset), [datePreset]);

  // Queries
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: expenses, isLoading: loadingExpenses } = useExpenses();
  const { data: properties } = useProperties(true);
  const { data: expensesByCategory } = useExpensesByCategory();

  // Previous period for comparison
  const previousRange = useMemo(() => {
    const previousMonth = subMonths(dateRange.startDate, 1);
    return {
      startDate: startOfMonth(previousMonth),
      endDate: endOfMonth(previousMonth),
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
    const previousRevenue = calculateTotalRevenue(
      bookings,
      previousRange.startDate,
      previousRange.endDate
    );
    const currentExpenses = calculateTotalExpenses(
      expenses,
      dateRange.startDate,
      dateRange.endDate
    );

    const revenueChange = calculatePercentageChange(
      currentRevenue.EUR,
      previousRevenue.EUR
    );

    const occupancyRate = calculateOccupancyRate(
      bookings,
      properties,
      dateRange.startDate,
      dateRange.endDate
    );

    const adr = calculateADR(
      bookings.filter(
        (b) => b.checkIn >= dateRange.startDate && b.checkIn <= dateRange.endDate
      )
    );

    const revpar = calculateRevPAR(
      bookings,
      properties,
      dateRange.startDate,
      dateRange.endDate
    );

    const avgStay = calculateAvgStayLength(
      bookings.filter(
        (b) => b.checkIn >= dateRange.startDate && b.checkIn <= dateRange.endDate
      )
    );

    const cancellationRate = calculateCancellationRate(
      bookings.filter(
        (b) => b.createdAt >= dateRange.startDate && b.createdAt <= dateRange.endDate
      )
    );

    const expenseRatio = calculateExpenseRatio(
      currentExpenses.EUR,
      currentRevenue.EUR
    );

    const netProfit = calculateNetProfit(currentRevenue.EUR, currentExpenses.EUR);

    const revenueByProperty = calculateRevenueByProperty(
      bookings.filter(
        (b) => b.checkIn >= dateRange.startDate && b.checkIn <= dateRange.endDate
      ),
      properties
    );

    return {
      currentRevenue,
      previousRevenue,
      currentExpenses,
      revenueChange,
      occupancyRate,
      adr,
      revpar,
      avgStay,
      cancellationRate,
      expenseRatio,
      netProfit,
      revenueByProperty,
    };
  }, [bookings, expenses, properties, dateRange, previousRange]);

  // Monthly data for charts
  const monthlyData = useMemo(() => {
    if (!bookings || !expenses) return [];

    const revenue = calculateMonthlyRevenue(bookings, year);
    const expensesData = calculateMonthlyExpenses(expenses, year);

    return revenue.map((rev, i) => ({
      month: format(new Date(year, i, 1), 'MMM', { locale: fr }),
      revenue: rev,
      expenses: expensesData[i],
      profit: rev - expensesData[i],
    }));
  }, [bookings, expenses, year]);

  // Expense category data for pie chart
  const categoryData = useMemo(() => {
    if (!expensesByCategory) return [];

    return Object.entries(expensesByCategory).map(([category, data]) => ({
      name: getCategoryLabel(category),
      value: (data as { totalEUR: number }).totalEUR,
    }));
  }, [expensesByCategory]);

  // Property performance data
  const propertyData = useMemo(() => {
    if (!metrics || !properties) return [];

    return properties.map((p) => ({
      name: p.name,
      revenue: metrics.revenueByProperty[p.id] || 0,
    }));
  }, [metrics, properties]);

  const isLoading = loadingBookings || loadingExpenses;

  if (isLoading) {
    return <LoadingSpinner className="h-64" />;
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { value: y.toString(), label: y.toString() };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord KPI</h1>
          <p className="text-gray-600 mt-1">Analyse de vos performances financières</p>
        </div>
        <div className="flex gap-2">
          <Select
            options={DATE_RANGE_PRESETS.filter((p) => p.value !== 'custom')}
            value={datePreset}
            onChange={setDatePreset}
            className="w-48"
          />
          <Select
            options={yearOptions}
            value={year.toString()}
            onChange={(v) => setYear(parseInt(v))}
            className="w-32"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Revenus"
          value={formatAmount(metrics?.currentRevenue.EUR || 0, metrics?.currentRevenue.FCFA || 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          change={metrics?.revenueChange}
          changeLabel="vs période précédente"
          variant="success"
        />
        <StatsCard
          title="Dépenses"
          value={formatAmount(metrics?.currentExpenses.EUR || 0, metrics?.currentExpenses.FCFA || 0)}
          icon={<TrendingDown className="w-5 h-5" />}
          variant="danger"
        />
        <StatsCard
          title="Bénéfice net"
          value={formatAmount(metrics?.netProfit || 0, (metrics?.netProfit || 0) * 656)}
          icon={<DollarSign className="w-5 h-5" />}
          variant={(metrics?.netProfit || 0) > 0 ? 'success' : 'danger'}
        />
        <StatsCard
          title="Taux d'occupation"
          value={`${(metrics?.occupancyRate || 0).toFixed(1)}%`}
          icon={<Percent className="w-5 h-5" />}
          variant="default"
        />
      </div>

      {/* Additional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="ADR (Prix moyen/nuit)"
          value={formatAmount(metrics?.adr || 0, (metrics?.adr || 0) * 656)}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatsCard
          title="RevPAR"
          value={formatAmount(metrics?.revpar || 0, (metrics?.revpar || 0) * 656)}
          icon={<BarChart3 className="w-5 h-5" />}
        />
        <StatsCard
          title="Durée moyenne séjour"
          value={`${(metrics?.avgStay || 0).toFixed(1)} nuits`}
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatsCard
          title="Ratio dépenses"
          value={`${(metrics?.expenseRatio || 0).toFixed(1)}%`}
          icon={<Percent className="w-5 h-5" />}
          variant={(metrics?.expenseRatio || 0) < 50 ? 'success' : 'warning'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
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

        {/* Expense breakdown */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Répartition des dépenses</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    currency === 'EUR' ? `€${Number(value).toFixed(0)}` : `${Number(value).toFixed(0)} FCFA`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Monthly profit */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Bénéfice mensuel</h3>
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
                <Bar dataKey="profit" name="Bénéfice">
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

        {/* Property performance */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Performance par propriété</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={propertyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip
                  formatter={(value) =>
                    currency === 'EUR' ? `€${Number(value).toFixed(0)}` : `${Number(value).toFixed(0)} FCFA`
                  }
                />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenus" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

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
    other: 'Autre',
  };
  return labels[category] || category;
}

export default Finances;

