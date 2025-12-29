import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  startOfDay,
  differenceInDays,
  isWithinInterval,
  max,
  min,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { useBookingsForCalendar } from '../../hooks/useBookings';
import { useProperties } from '../../hooks/useProperties';
import type { Booking } from '../../types';
import Button from '../ui/Button';

interface BookingCalendarProps {
  onBookingClick?: (booking: Booking) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

// Use dark blue color matching the sidebar (primary-600)
const PROPERTY_COLORS = [
  { bg: 'bg-primary-600', hover: 'hover:bg-primary-700', text: 'text-white' },
  { bg: 'bg-primary-600', hover: 'hover:bg-primary-700', text: 'text-white' },
  { bg: 'bg-primary-600', hover: 'hover:bg-primary-700', text: 'text-white' },
  { bg: 'bg-primary-600', hover: 'hover:bg-primary-700', text: 'text-white' },
  { bg: 'bg-primary-600', hover: 'hover:bg-primary-700', text: 'text-white' },
  { bg: 'bg-primary-600', hover: 'hover:bg-primary-700', text: 'text-white' },
  { bg: 'bg-primary-600', hover: 'hover:bg-primary-700', text: 'text-white' },
  { bg: 'bg-primary-600', hover: 'hover:bg-primary-700', text: 'text-white' },
];

const BookingCalendar: React.FC<BookingCalendarProps> = ({ 
  onBookingClick, 
  currentDate: externalCurrentDate,
  onDateChange 
}) => {
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());
  const [propertyFilter, setPropertyFilter] = useState<string>('');

  // Use external date if provided, otherwise use internal state
  const currentDate = externalCurrentDate || internalCurrentDate;
  
  const setCurrentDate = (date: Date) => {
    if (onDateChange) {
      onDateChange(date);
    } else {
      setInternalCurrentDate(date);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: fr });
  const calendarEnd = endOfWeek(monthEnd, { locale: fr });

  const { data: allBookings } = useBookingsForCalendar(calendarStart, calendarEnd);
  const { data: properties } = useProperties();

  // Filter bookings by property
  const bookings = useMemo(() => {
    if (!propertyFilter) return allBookings;
    return allBookings?.filter(b => b.propertyId === propertyFilter);
  }, [allBookings, propertyFilter]);

  // Create property color map
  const propertyColors = useMemo(() => {
    const colorMap: Record<string, (typeof PROPERTY_COLORS)[0]> = {};
    properties?.forEach((property, index) => {
      colorMap[property.id] = PROPERTY_COLORS[index % PROPERTY_COLORS.length];
    });
    return colorMap;
  }, [properties]);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Get bookings that overlap with a specific week
  const getBookingsForWeek = (weekStart: Date, weekEnd: Date) => {
    return bookings?.filter((booking) => {
      const checkIn = startOfDay(new Date(booking.checkIn));
      const checkOut = startOfDay(new Date(booking.checkOut));
      
      // Booking overlaps with week if it starts before week ends AND ends after week starts
      return checkIn <= weekEnd && checkOut > weekStart;
    }) || [];
  };

  // Calculate booking bar position and width within a week
  const getBookingBarStyle = (booking: Booking, weekStart: Date, weekEnd: Date) => {
    const checkIn = startOfDay(new Date(booking.checkIn));
    const checkOut = startOfDay(new Date(booking.checkOut));
    
    // Clamp to week boundaries
    const barStart = max([checkIn, weekStart]);
    const barEnd = min([checkOut, startOfDay(new Date(weekEnd.getTime() + 86400000))]); // Include last day
    
    const startCol = differenceInDays(barStart, weekStart);
    const duration = differenceInDays(barEnd, barStart);
    
    // Calculate left position and width as percentages
    const left = (startCol / 7) * 100;
    const width = (duration / 7) * 100;
    
    const isStart = isSameDay(checkIn, barStart);
    const isEnd = isSameDay(checkOut, barEnd) || differenceInDays(checkOut, barEnd) <= 0;
    
    return { left, width, isStart, isEnd };
  };

  // Group overlapping bookings into rows to prevent overlap
  const arrangeBookingsInRows = (weekBookings: Booking[], weekStart: Date, weekEnd: Date) => {
    const rows: Booking[][] = [];
    
    const sortedBookings = [...weekBookings].sort((a, b) => {
      const aStart = new Date(a.checkIn).getTime();
      const bStart = new Date(b.checkIn).getTime();
      return aStart - bStart;
    });
    
    for (const booking of sortedBookings) {
      const checkIn = startOfDay(new Date(booking.checkIn));
      const checkOut = startOfDay(new Date(booking.checkOut));
      
      // Find a row where this booking fits
      let placed = false;
      for (const row of rows) {
        const lastBookingInRow = row[row.length - 1];
        const lastCheckOut = startOfDay(new Date(lastBookingInRow.checkOut));
        
        // If this booking starts after the last one ends, it fits in this row
        if (checkIn >= lastCheckOut) {
          row.push(booking);
          placed = true;
          break;
        }
      }
      
      // If no row fits, create a new row
      if (!placed) {
        rows.push([booking]);
      }
    }
    
    return rows;
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="flex items-center gap-3">
          {/* Property filter dropdown */}
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
            >
              <option value="">Tous les appartements</option>
              {properties?.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Aujourd'hui
          </Button>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      {properties && properties.length > 0 && (
        <div className="flex flex-wrap gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50">
          {properties.slice(0, 8).map((property) => (
            <div key={property.id} className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-3 h-3 rounded-full',
                  propertyColors[property.id]?.bg || 'bg-gray-400'
                )}
              />
              <span className="text-xs text-gray-600">{property.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid - by weeks */}
      <div>
        {weeks.map((week, weekIndex) => {
          const weekStart = week[0];
          const weekEnd = week[6];
          const weekBookings = getBookingsForWeek(weekStart, weekEnd);
          const bookingRows = arrangeBookingsInRows(weekBookings, weekStart, weekEnd);
          
          return (
            <div key={weekIndex} className="relative">
              {/* Day numbers row */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {week.map((day, dayIndex) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isDayToday = isToday(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={clsx(
                        'min-h-[100px] p-2 border-r border-gray-100',
                        !isCurrentMonth && 'bg-gray-50',
                        dayIndex === 6 && 'border-r-0'
                      )}
                    >
                      <div
                        className={clsx(
                          'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                          isDayToday && 'bg-primary-600 text-white',
                          !isDayToday && isCurrentMonth && 'text-gray-900',
                          !isCurrentMonth && 'text-gray-400'
                        )}
                      >
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Booking bars overlay */}
              <div className="absolute left-0 right-0 top-10 px-1 space-y-1">
                {bookingRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="relative h-6">
                    {row.map((booking) => {
                      const { left, width, isStart, isEnd } = getBookingBarStyle(booking, weekStart, weekEnd);
                      const colors = propertyColors[booking.propertyId];
                      
                      return (
                        <div
                          key={booking.id}
                          className={clsx(
                            'absolute h-6 flex items-center cursor-pointer transition-opacity',
                            colors?.bg || 'bg-primary-600',
                            colors?.hover || 'hover:bg-primary-700',
                            colors?.text || 'text-white',
                            isStart && 'rounded-l-full pl-2',
                            isEnd && 'rounded-r-full pr-2',
                            !isStart && 'pl-1',
                            !isEnd && 'pr-1'
                          )}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                          }}
                          onClick={() => onBookingClick?.(booking)}
                          title={`${booking.guestName} - ${format(new Date(booking.checkIn), 'dd/MM')} au ${format(new Date(booking.checkOut), 'dd/MM')}`}
                        >
                          {isStart && (
                            <span className="text-xs font-medium truncate">
                              {booking.guestName}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingCalendar;
