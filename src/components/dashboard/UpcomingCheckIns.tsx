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
    return property?.name || 'Propriété inconnue';
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
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Link>
        }
      >
        <h3 className="text-lg font-semibold text-gray-900">Arrivées à venir</h3>
        <p className="text-sm text-gray-500">3 prochaines réservations</p>
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
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 flex flex-col items-center justify-center">
                  <span className="text-xs text-primary-600 font-medium">
                    {formatDateShort(booking.checkIn).split(' ')[1]}
                  </span>
                  <span className="text-lg font-bold text-primary-700">
                    {formatDateShort(booking.checkIn).split(' ')[0]}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {booking.guestName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {getPropertyName(booking.propertyId)}
                  </p>
                </div>
                
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Users className="w-3 h-3" />
                    <span>{booking.guests}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
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

