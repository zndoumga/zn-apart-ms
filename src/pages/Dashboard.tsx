import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  CheckSquare,
  Percent,
  PiggyBank,
  TrendingUp,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { useMode, useCurrency } from '../store/useAppStore';
import StatsCard from '../components/dashboard/StatsCard';
import UpcomingCheckIns from '../components/dashboard/UpcomingCheckIns';
import BookingCalendar from '../components/bookings/BookingCalendar';
import BookingDetailsModal from '../components/bookings/BookingDetailsModal';
import BookingForm from '../components/bookings/BookingForm';
import Modal from '../components/ui/Modal';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useBookings, useCreateBooking } from '../hooks/useBookings';
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
  const { isAdmin, isInvestor } = useMode();
  const { formatAmount } = useCurrency();

  // Month state - shared between calendar and KPIs
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Property filter state - affects all metrics
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  
  // Booking details modal state
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  
  // Booking form modal state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedCheckInDate, setSelectedCheckInDate] = useState<Date | null>(null);

  // Fetch data
  const { data: bookings } = useBookings();
  const { data: expenses } = useExpenses();
  const { data: properties } = useProperties(true);
  const createBooking = useCreateBooking();

  // Set default property "Nvlle Route Omnisport A1" when properties are loaded
  React.useEffect(() => {
    if (properties && !selectedProperty) {
      const defaultProperty = properties.find(p => 
        p.name.toLowerCase().includes('nvlle route omnisport a1') ||
        p.name.toLowerCase().includes('nouvelle route omnisport a1')
      );
      if (defaultProperty) {
        setSelectedProperty(defaultProperty.id);
      }
    }
  }, [properties, selectedProperty]);
  const { data: taskCounts } = useTaskCounts();
  const { data: unresolvedRequestCount } = useUnresolvedRequestCount();
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

  // Handler for date click - open new booking form
  const handleDateClick = (date: Date) => {
    setSelectedCheckInDate(date);
    setShowBookingForm(true);
  };

  // Handler for creating new booking
  const handleCreateBooking = async (data: any) => {
    try {
      await createBooking.mutateAsync(data);
      setShowBookingForm(false);
      setSelectedCheckInDate(null);
    } catch (err) {
      // Error is already handled by the mutation's onError
      console.error('Failed to create booking:', err);
    }
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
    { value: '', label: 'Tous les appartements' },
    ...(properties?.map((p) => ({ value: p.id, label: p.name })) || []),
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vue d'ensemble
          </h1>
          <p className="text-gray-600 text-base">
            {isAdmin
              ? "Vue d'ensemble de votre activité"
              : 'Bienvenue ! Voici votre résumé du jour.'}
          </p>
        </div>
        <div className="w-64 hidden md:block">
          <Select
            options={propertyOptions}
            value={selectedProperty}
            onChange={setSelectedProperty}
            placeholder="Sélectionner un appartement"
          />
        </div>
      </div>

      {/* Quick action buttons for staff */}
      {!isAdmin && !isInvestor && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Button
            onClick={() => window.location.href = '/bookings?new=true'}
            className="w-full px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouvelle réservation
          </Button>
          <Button
            onClick={() => window.location.href = '/expenses?new=true'}
            className="w-full px-3 py-2 bg-red-600 text-white hover:bg-red-700 border-0"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouvelle dépense
          </Button>
          <Button
            onClick={() => window.location.href = '/requests?new=true'}
            className="w-full px-3 py-2 bg-yellow-500 text-white hover:bg-yellow-600 border-0"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouvelle demande
          </Button>
        </div>
      )}

      {/* Apartment selector for mobile - right above KPI cards */}
      <div className="md:hidden flex justify-end">
        <div className="w-40">
          <Select
            options={propertyOptions}
            value={selectedProperty}
            onChange={setSelectedProperty}
            placeholder="Sélectionner un appartement"
          />
        </div>
      </div>

      {/* Stats cards - Mobile: 2 columns, Desktop: varies by mode */}
      <div className="space-y-3 md:space-y-4">
        {isInvestor ? (
          /* Investor mode: 6 KPI cards - Revenue, Expenses, Net Profit, Nights Booked, Occupancy Rate, Average Nightly Rate */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {/* 1. Revenue */}
            <StatsCard
              title={`Revenus ${format(selectedMonth, 'MMMM', { locale: fr })}`}
              value={formatAmount(selectedMonthRevenue.EUR, selectedMonthRevenue.FCFA)}
              icon={<TrendingUp className="w-4 h-4" />}
              variant="success"
            />

            {/* 2. Expenses */}
            <StatsCard
              title={`Dépenses ${format(selectedMonth, 'MMMM', { locale: fr })}`}
              value={formatAmount(selectedMonthExpenses.EUR, selectedMonthExpenses.FCFA)}
              icon={<DollarSign className="w-4 h-4" />}
              variant="default"
            />

            {/* 3. Net Profit */}
            <StatsCard
              title="Bénéfice net"
              value={formatAmount(
                selectedMonthRevenue.EUR - selectedMonthExpenses.EUR,
                selectedMonthRevenue.FCFA - selectedMonthExpenses.FCFA
              )}
              icon={<TrendingUp className="w-4 h-4" />}
              variant={selectedMonthRevenue.EUR - selectedMonthExpenses.EUR > 0 ? 'success' : 'danger'}
            />

            {/* 4. Nights Booked */}
            <StatsCard
              title="Nuits réservées"
              value={nightsBooked}
              icon={<Calendar className="w-4 h-4" />}
              variant="default"
            />

            {/* 5. Occupancy Rate */}
            <StatsCard
              title="Taux d'occupation"
              value={`${monthOccupancy.rate.toFixed(0)}%`}
              subtitle={`${format(selectedMonth, 'MMMM yyyy', { locale: fr })}`}
              icon={<Percent className="w-4 h-4" />}
              variant="default"
            />

            {/* 6. Average Nightly Rate */}
            <StatsCard
              title="Prix moyen/nuit"
              value={formatAmount(averageNightPrice.EUR, averageNightPrice.FCFA)}
              icon={<DollarSign className="w-4 h-4" />}
              variant="default"
            />
          </div>
        ) : isAdmin ? (
          /* Admin mode: 8 KPI cards - 4 per row on desktop */
          <>
            {/* First row - 4 cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* 1. Income (Revenue) */}
              <StatsCard
                title={`Revenus ${format(selectedMonth, 'MMMM', { locale: fr })}`}
                value={formatAmount(selectedMonthRevenue.EUR, selectedMonthRevenue.FCFA)}
                icon={<TrendingUp className="w-4 h-4" />}
                change={revenueChange}
                changeLabel="vs mois dernier"
                variant="success"
              />

              {/* 2. Expenses */}
              <StatsCard
                title={`Dépenses ${format(selectedMonth, 'MMMM', { locale: fr })}`}
                value={formatAmount(selectedMonthExpenses.EUR, selectedMonthExpenses.FCFA)}
                icon={<DollarSign className="w-4 h-4" />}
                variant="default"
              />

              {/* 3. Profit */}
              <StatsCard
                title="Bénéfice net"
                value={formatAmount(
                  selectedMonthRevenue.EUR - selectedMonthExpenses.EUR,
                  selectedMonthRevenue.FCFA - selectedMonthExpenses.FCFA
                )}
                icon={<TrendingUp className="w-4 h-4" />}
                variant={selectedMonthRevenue.EUR - selectedMonthExpenses.EUR > 0 ? 'success' : 'danger'}
              />

              {/* 4. Average night price */}
              <StatsCard
                title="Prix moyen/nuit"
                value={formatAmount(averageNightPrice.EUR, averageNightPrice.FCFA)}
                icon={<DollarSign className="w-4 h-4" />}
                variant="default"
              />
            </div>

            {/* Second row - 4 cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* 5. Nights booked */}
              <StatsCard
                title="Nuits réservées"
                value={nightsBooked}
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

              {/* 7. Solde Mobile Money */}
              <StatsCard
                title="Solde Mobile Money"
                value={formatAmount(balance?.balanceEUR || 0, balance?.balanceFCFA || 0)}
                icon={<PiggyBank className="w-4 h-4" />}
                variant={isLowBalance ? 'danger' : 'default'}
                subtitle={isLowBalance ? '⚠️ Solde bas' : undefined}
              />

              {/* 8. Tasks */}
              <StatsCard
                title="Tâches en attente"
                value={(taskCounts?.todo || 0) + (taskCounts?.inProgress || 0)}
                icon={<CheckSquare className="w-4 h-4" />}
                variant={taskCounts && (taskCounts.todo + taskCounts.inProgress) > 5 ? 'warning' : 'default'}
              />
            </div>
          </>
        ) : (
          /* Staff mode: 6 KPI cards - 3 per row on desktop, 2 per row on mobile */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {/* 1. Revenue */}
            <StatsCard
              title={`Revenus ${format(selectedMonth, 'MMMM', { locale: fr })}`}
              value={formatAmount(selectedMonthRevenue.EUR, selectedMonthRevenue.FCFA)}
              icon={<TrendingUp className="w-4 h-4" />}
              variant="success"
            />

            {/* 2. Expenses */}
            <StatsCard
              title={`Dépenses ${format(selectedMonth, 'MMMM', { locale: fr })}`}
              value={formatAmount(selectedMonthExpenses.EUR, selectedMonthExpenses.FCFA)}
              icon={<DollarSign className="w-4 h-4" />}
              variant="default"
            />

            {/* 3. Solde Mobile Money */}
            <StatsCard
              title="Solde Mobile Money"
              value={formatAmount(balance?.balanceEUR || 0, balance?.balanceFCFA || 0)}
              icon={<PiggyBank className="w-4 h-4" />}
              variant="default"
            />

            {/* 4. Nights booked */}
            <StatsCard
              title="Nuits réservées"
              value={nightsBooked}
              icon={<Calendar className="w-4 h-4" />}
              variant="default"
            />

            {/* 5. Tasks */}
            <StatsCard
              title="Tâches en attente"
              value={(taskCounts?.todo || 0) + (taskCounts?.inProgress || 0)}
              icon={<CheckSquare className="w-4 h-4" />}
              variant={taskCounts && (taskCounts.todo + taskCounts.inProgress) > 5 ? 'warning' : 'default'}
            />

            {/* 6. Unresolved Requests */}
            <StatsCard
              title="Demandes non résolues"
              value={unresolvedRequestCount || 0}
              icon={<MessageSquare className="w-4 h-4" />}
              variant={unresolvedRequestCount && unresolvedRequestCount > 0 ? 'warning' : 'default'}
            />
          </div>
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
              onDateClick={handleDateClick}
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
                  onDateClick={handleDateClick}
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

      {/* New Booking Form Modal */}
      {showBookingForm && (
        <Modal
          isOpen={showBookingForm}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedCheckInDate(null);
          }}
          title="Nouvelle réservation"
          size="lg"
        >
          <BookingForm
            onSubmit={handleCreateBooking}
            onCancel={() => {
              setShowBookingForm(false);
              setSelectedCheckInDate(null);
            }}
            initialData={undefined}
            defaultCheckInDate={selectedCheckInDate ? format(selectedCheckInDate, 'yyyy-MM-dd') : undefined}
            isLoading={createBooking.isPending}
          />
        </Modal>
      )}

    </div>
  );
};

export default Dashboard;

