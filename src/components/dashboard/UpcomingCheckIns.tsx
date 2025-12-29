import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Badge from '../ui/Badge';
import { useUpcomingCheckIns } from '../../hooks/useBookings';
import { useProperties } from '../../hooks/useProperties';
import { useCurrency } from '../../store/useAppStore';
import { formatDateShort, calculateNights } from '../../utils/dates';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';

const UpcomingCheckIns: React.FC = () => {
  const { data: bookings, isLoading } = useUpcomingCheckIns();
  const { data: properties } = useProperties();
  const { formatAmount } = useCurrency();

  const getPropertyName = (propertyId: string) => {
    const property = properties?.find((p) => p.id === propertyId);
    return property?.name || 'Appartement inconnu';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Arrivées à venir</h3>
        </CardHeader>
        <CardBody>
          <LoadingSpinner className="py-8" />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        actions={
          <Link
            to="/bookings"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5 transition-colors"
          >
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Link>
        }
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Arrivées à venir</h3>
          <p className="text-sm text-gray-500 mt-0.5">3 prochaines réservations</p>
        </div>
      </CardHeader>
      <CardBody noPadding>
        {!bookings || bookings.length === 0 ? (
          <EmptyState
            title="Pas d'arrivées prévues"
            description="Aucune réservation à venir."
            icon={<Calendar className="w-8 h-8 text-gray-400" />}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {bookings.map((booking) => (
              <Link
                key={booking.id}
                to={`/bookings/${booking.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-indigo-50 flex flex-col items-center justify-center border border-indigo-100">
                  <span className="text-xs text-indigo-600 font-semibold">
                    {formatDateShort(booking.checkIn).split(' ')[1]}
                  </span>
                  <span className="text-lg font-bold text-indigo-700">
                    {formatDateShort(booking.checkIn).split(' ')[0]}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {booking.guestName}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {getPropertyName(booking.propertyId)}
                  </p>
                </div>
                
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{booking.guests}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {calculateNights(booking.checkIn, booking.checkOut)} nuits
                  </p>
                </div>
                
                <Badge variant="primary" size="sm">
                  {formatAmount(booking.totalPriceEUR, booking.totalPriceFCFA)}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default UpcomingCheckIns;

