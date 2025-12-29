import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  CheckSquare,
  AlertCircle,
  Percent,
  PiggyBank,
  TrendingUp,
} from 'lucide-react';
import { useMode, useCurrency } from '../store/useAppStore';
import StatsCard from '../components/dashboard/StatsCard';
import UpcomingCheckIns from '../components/dashboard/UpcomingCheckIns';
import BookingCalendar from '../components/bookings/BookingCalendar';
import BookingDetailsModal from '../components/bookings/BookingDetailsModal';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { useBookings } from '../hooks/useBookings';
import { useExpenses } from '../hooks/useExpenses';
import { useTaskCounts } from '../hooks/useTasks';
import { useUnresolvedRequestCount } from '../hooks/useRequests';
import { useCurrentBalance, useIsBalanceLow } from '../hooks/useMobileMoney';
import { useProperties } from '../hooks/useProperties';
import type { Booking } from '../types';
import Select from '../components/ui/Select';
import {
  calculateTotalRevenue,
  calculateTotalExpenses,
  calculatePercentageChange,
  calculateOccupancyRate,
  calculateNightsBooked,
  calculateAverageNightPrice,
} from '../utils/calculations';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Dashboard: React.FC = () => {
  const { isAdmin } = useMode();
  const { formatAmount } = useCurrency();

  // Month state - shared between calendar and KPIs
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Property filter state - affects all metrics
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  
  // Booking details modal state
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  // Fetch data
  const { data: bookings } = useBookings();
  const { data: expenses } = useExpenses();
  const { data: properties } = useProperties(true);
  const { data: taskCounts } = useTaskCounts();
  const { data: unresolvedRequests } = useUnresolvedRequestCount();
  const { data: balance } = useCurrentBalance();
  const { data: isLowBalance } = useIsBalanceLow();

  // Filter bookings and expenses by property if selected
  const filteredBookings = React.useMemo(() => {
    if (!bookings) return [];
    if (!selectedProperty) return bookings;
    return bookings.filter(b => b.propertyId === selectedProperty);
  }, [bookings, selectedProperty]);

  const filteredExpenses = React.useMemo(() => {
    if (!expenses) return [];
    if (!selectedProperty) return expenses;
    return expenses.filter(e => e.propertyId === selectedProperty);
  }, [expenses, selectedProperty]);

  // Filter properties for occupancy calculation
  const filteredProperties = React.useMemo(() => {
    if (!properties) return [];
    if (!selectedProperty) return properties.filter(p => p.status === 'active');
    return properties.filter(p => p.id === selectedProperty && p.status === 'active');
  }, [properties, selectedProperty]);

  // Calculate metrics based on selected month and property
  const selectedMonthStart = startOfMonth(selectedMonth);
  const selectedMonthEnd = endOfMonth(selectedMonth);
  const lastMonthStart = startOfMonth(subMonths(selectedMonth, 1));
  const lastMonthEnd = endOfMonth(subMonths(selectedMonth, 1));

  const selectedMonthRevenue = filteredBookings
    ? calculateTotalRevenue(filteredBookings, selectedMonthStart, selectedMonthEnd)
    : { EUR: 0, FCFA: 0 };

  const lastMonthRevenue = filteredBookings
    ? calculateTotalRevenue(filteredBookings, lastMonthStart, lastMonthEnd)
    : { EUR: 0, FCFA: 0 };

  const revenueChange = calculatePercentageChange(
    selectedMonthRevenue.EUR,
    lastMonthRevenue.EUR
  );

  const selectedMonthExpenses = filteredExpenses
    ? calculateTotalExpenses(filteredExpenses, selectedMonthStart, selectedMonthEnd)
    : { EUR: 0, FCFA: 0 };

  // Occupancy for selected month
  const monthOccupancy = filteredBookings && filteredProperties
    ? {
        rate: calculateOccupancyRate(filteredBookings, filteredProperties, selectedMonthStart, selectedMonthEnd),
        total: filteredProperties.length,
      }
    : { total: 0, rate: 0 };

  // Nights booked and average night price for selected month
  const nightsBooked = filteredBookings
    ? calculateNightsBooked(filteredBookings, selectedMonthStart, selectedMonthEnd)
    : 0;

  const averageNightPrice = filteredBookings
    ? calculateAverageNightPrice(filteredBookings, selectedMonthStart, selectedMonthEnd)
    : { EUR: 0, FCFA: 0 };

  // Helper function to get property by ID
  const getProperty = (propertyId: string) => {
    return properties?.find((p) => p.id === propertyId);
  };

  // Handler for viewing booking from calendar
  const handleViewBooking = (booking: Booking) => {
    setViewingBooking(booking);
  };

  // Handler for editing booking (navigate to bookings page)
  const handleEditFromDetails = () => {
    if (viewingBooking) {
      setViewingBooking(null);
      // Navigate to bookings page with the booking ID
      window.location.href = `/bookings?edit=${viewingBooking.id}`;
    }
  };

  // Handler for deleting booking (navigate to bookings page)
  const handleDeleteFromDetails = () => {
    if (viewingBooking) {
      setViewingBooking(null);
      // Navigate to bookings page to handle deletion
      window.location.href = `/bookings?delete=${viewingBooking.id}`;
    }
  };

  const propertyOptions = [
    { value: '', label: 'Toutes les propriétés' },
    ...(properties?.map((p) => ({ value: p.id, label: p.name })) || []),
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Vue d'ensemble
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdmin
              ? "Vue d'ensemble de votre activité"
              : 'Bienvenue ! Voici votre résumé du jour.'}
          </p>
        </div>
        <div className="w-64">
          <Select
            options={propertyOptions}
            value={selectedProperty}
            onChange={setSelectedProperty}
            placeholder="Sélectionner une propriété"
          />
        </div>
      </div>

      {/* Stats cards - Row 1: Financial metrics (4 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Income (Revenue) */}
        <StatsCard
          title={`Revenus ${format(selectedMonth, 'MMMM', { locale: fr })}`}
          value={formatAmount(selectedMonthRevenue.EUR, selectedMonthRevenue.FCFA)}
          icon={<TrendingUp className="w-4 h-4" />}
          change={revenueChange}
          changeLabel="vs mois dernier"
          variant="success"
        />

        {/* 2. Expenses - Admin only */}
        {isAdmin ? (
          <StatsCard
            title={`Dépenses ${format(selectedMonth, 'MMMM', { locale: fr })}`}
            value={formatAmount(selectedMonthExpenses.EUR, selectedMonthExpenses.FCFA)}
            icon={<DollarSign className="w-4 h-4" />}
            variant="default"
          />
        ) : (
          <StatsCard
            title="Tâches en attente"
            value={(taskCounts?.todo || 0) + (taskCounts?.inProgress || 0)}
            icon={<CheckSquare className="w-4 h-4" />}
            variant={taskCounts && (taskCounts.todo + taskCounts.inProgress) > 5 ? 'warning' : 'default'}
          />
        )}

        {/* 3. Profit - Admin only */}
        {isAdmin ? (
          <StatsCard
            title="Bénéfice net"
            value={formatAmount(
              selectedMonthRevenue.EUR - selectedMonthExpenses.EUR,
              selectedMonthRevenue.FCFA - selectedMonthExpenses.FCFA
            )}
            icon={<TrendingUp className="w-4 h-4" />}
            variant={selectedMonthRevenue.EUR - selectedMonthExpenses.EUR > 0 ? 'success' : 'danger'}
          />
        ) : (
          <StatsCard
            title="Demandes non résolues"
            value={unresolvedRequests || 0}
            icon={<AlertCircle className="w-4 h-4" />}
            variant={unresolvedRequests && unresolvedRequests > 0 ? 'warning' : 'default'}
          />
        )}

        {/* 4. Solde Mobile Money */}
        <StatsCard
          title="Solde Mobile Money"
          value={formatAmount(balance?.balanceEUR || 0, balance?.balanceFCFA || 0)}
          icon={<PiggyBank className="w-4 h-4" />}
          variant={isAdmin && isLowBalance ? 'danger' : 'default'}
          subtitle={isAdmin && isLowBalance ? '⚠️ Solde bas' : undefined}
        />
      </div>

      {/* Stats cards - Row 2: Operational metrics (5 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* 5. Nights booked */}
        <StatsCard
          title="Nuits réservées"
          value={nightsBooked}
          subtitle={`${format(selectedMonth, 'MMMM yyyy', { locale: fr })}`}
          icon={<Calendar className="w-4 h-4" />}
          variant="default"
        />

        {/* 6. Occupancy rate */}
        <StatsCard
          title="Taux d'occupation"
          value={`${monthOccupancy.rate.toFixed(0)}%`}
          subtitle={`${format(selectedMonth, 'MMMM yyyy', { locale: fr })}`}
          icon={<Percent className="w-4 h-4" />}
          variant="default"
        />

        {/* 7. Average night price */}
        <StatsCard
          title="Prix moyen/nuit"
          value={formatAmount(averageNightPrice.EUR, averageNightPrice.FCFA)}
          icon={<DollarSign className="w-4 h-4" />}
          variant="default"
        />

        {/* 8. Tasks - Admin only */}
        {isAdmin && (
          <StatsCard
            title="Tâches en attente"
            value={(taskCounts?.todo || 0) + (taskCounts?.inProgress || 0)}
            icon={<CheckSquare className="w-4 h-4" />}
            variant={taskCounts && (taskCounts.todo + taskCounts.inProgress) > 5 ? 'warning' : 'default'}
          />
        )}

        {/* 9. Requests - Admin only */}
        {isAdmin && (
          <StatsCard
            title="Demandes non résolues"
            value={unresolvedRequests || 0}
            icon={<AlertCircle className="w-4 h-4" />}
            variant={unresolvedRequests && unresolvedRequests > 0 ? 'warning' : 'default'}
          />
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Calendar (Admin) or Upcoming (Staff) */}
        <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-2'}>
          {isAdmin ? (
            <BookingCalendar 
              currentDate={selectedMonth}
              onDateChange={setSelectedMonth}
              onBookingClick={handleViewBooking}
              propertyFilter={selectedProperty}
            />
          ) : (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Calendrier</h3>
              </CardHeader>
              <CardBody>
                <BookingCalendar 
                  currentDate={selectedMonth}
                  onDateChange={setSelectedMonth}
                  onBookingClick={handleViewBooking}
                  propertyFilter={selectedProperty}
                />
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right column - Upcoming check-ins */}
        <div className="lg:col-span-1">
          <UpcomingCheckIns />
        </div>
      </div>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={viewingBooking}
        property={viewingBooking ? getProperty(viewingBooking.propertyId) : undefined}
        isOpen={!!viewingBooking}
        onClose={() => setViewingBooking(null)}
        onEdit={handleEditFromDetails}
        onDelete={handleDeleteFromDetails}
        isAdmin={isAdmin}
        formatAmount={formatAmount}
      />

      {/* Quick actions for staff */}
      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card hover onClick={() => window.location.href = '/bookings/new'}>
            <CardBody className="text-center py-8">
              <Calendar className="w-8 h-8 text-primary-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Nouvelle réservation</h3>
              <p className="text-sm text-gray-500 mt-1">Ajouter une arrivée</p>
            </CardBody>
          </Card>

          <Card hover onClick={() => window.location.href = '/expenses/new'}>
            <CardBody className="text-center py-8">
              <DollarSign className="w-8 h-8 text-success-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Nouvelle dépense</h3>
              <p className="text-sm text-gray-500 mt-1">Enregistrer un achat</p>
            </CardBody>
          </Card>

          <Card hover onClick={() => window.location.href = '/requests/new'}>
            <CardBody className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-warning-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Nouvelle demande</h3>
              <p className="text-sm text-gray-500 mt-1">Soumettre une demande</p>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

