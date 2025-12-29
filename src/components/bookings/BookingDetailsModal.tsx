import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Home, 
  Users, 
  MessageSquare,
  Pencil,
  Trash2,
  Send,
  MessageCircle,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import CheckInSection from './CheckInSection';
import type { Booking, BookingStatus, Property, BookingComment, Customer } from '../../types';
import { formatDate } from '../../utils/dates';
import { useBookingComments, useAddBookingComment, useDeleteBookingComment } from '../../hooks/useBookingComments';
import { getCustomer } from '../../hooks/useCheckIn';
import { differenceInDays, format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingDetailsModalProps {
  booking: Booking | null;
  property?: Property;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
  formatAmount: (eur: number, fcfa: number) => string;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  property,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isAdmin,
  formatAmount,
}) => {
  const [newComment, setNewComment] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  
  const { data: comments, isLoading: commentsLoading } = useBookingComments(booking?.id);
  const addComment = useAddBookingComment(booking?.id || '');
  const deleteComment = useDeleteBookingComment(booking?.id || '');

  // Fetch customer data if booking has customerId
  useEffect(() => {
    async function fetchCustomer() {
      if (booking?.customerId) {
        try {
          const customerData = await getCustomer(booking.customerId);
          setCustomer(customerData);
        } catch (err) {
          console.error('Error fetching customer:', err);
        }
      } else {
        setCustomer(null);
      }
    }
    
    if (isOpen && booking) {
      fetchCustomer();
    }
  }, [booking?.customerId, booking?.id, isOpen]);

  if (!booking) return null;

  const stayDuration = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));

  const getStatusBadge = (status: BookingStatus) => {
    const variants: Record<BookingStatus, 'success' | 'primary' | 'gray' | 'danger' | 'warning'> = {
      inquiry: 'warning',
      confirmed: 'primary',
      checked_in: 'success',
      checked_out: 'gray',
      cancelled: 'danger',
    };
    const labels: Record<BookingStatus, string> = {
      inquiry: 'Demande en cours',
      confirmed: 'Confirmé',
      checked_in: 'Check-in effectué',
      checked_out: 'Check-out effectué',
      cancelled: 'Annulé',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'gray'> = {
      paid: 'success',
      partial: 'warning',
      pending: 'gray',
    };
    const labels: Record<string, string> = {
      paid: 'Payé',
      partial: 'Partiel',
      pending: 'En attente',
    };
    return <Badge variant={variants[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      airbnb: 'Airbnb',
      booking: 'Booking.com',
      direct: 'Réservation directe',
      other: 'Autre',
    };
    return labels[source] || source;
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment.mutateAsync(newComment.trim());
    setNewComment('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleCheckInComplete = () => {
    // Refetch customer data after check-in
    if (booking?.customerId) {
      getCustomer(booking.customerId).then(setCustomer);
    }
  };

  const canShowCheckIn = booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'checked_out';

  const footerContent = (
    <div className="flex justify-between items-center">
      <div>
        {isAdmin && (
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
        <Button onClick={onEdit}>
          <Pencil className="w-4 h-4 mr-2" />
          Modifier
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Détails de la réservation"
      size="lg"
      footer={footerContent}
    >
      <div className="space-y-6">
        {/* Header with status */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            {getStatusBadge(booking.status)}
            {getPaymentBadge(booking.paymentStatus)}
          </div>
          <span className="text-sm text-gray-500">
            Créé le {format(new Date(booking.createdAt), 'dd/MM/yyyy')}
          </span>
        </div>

        {/* Guest info */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Client</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-semibold text-gray-900">{booking.guestName}</span>
            </div>
            {booking.guestEmail && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <a href={`mailto:${booking.guestEmail}`} className="text-primary-600 hover:underline">
                  {booking.guestEmail}
                </a>
              </div>
            )}
            {booking.guestPhone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <a href={`tel:${booking.guestPhone}`} className="text-primary-600 hover:underline">
                  {booking.guestPhone}
                </a>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">{booking.guests} invité(s)</span>
            </div>
          </div>
        </div>

        {/* Property & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Appartement</h3>
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-900">{property?.name || 'N/A'}</span>
            </div>
            {property?.address && (
              <p className="text-sm text-gray-500 mt-1 ml-8">{property.address}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Séjour</h3>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                </p>
                <p className="text-sm text-gray-500">{stayDuration} nuit(s)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial details */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Détails financiers</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total</span>
              <div className="text-right">
                <span className="text-xl font-bold text-gray-900">
                  {formatAmount(booking.totalPriceEUR, booking.totalPriceFCFA)}
                </span>
                {stayDuration > 0 && (
                  <p className="text-xs text-gray-400">
                    {formatAmount(
                      Math.round(booking.totalPriceEUR / stayDuration),
                      Math.round(booking.totalPriceFCFA / stayDuration)
                    )}/nuit
                  </p>
                )}
              </div>
            </div>
            {booking.commissionEUR > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Commission</span>
                <span className="text-gray-700">
                  {formatAmount(booking.commissionEUR, booking.commissionFCFA)}
                </span>
              </div>
            )}
            {booking.cleaningFeeEUR > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Frais de ménage</span>
                <span className="text-gray-700">
                  {formatAmount(booking.cleaningFeeEUR, booking.cleaningFeeFCFA)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm pt-2 border-t">
              <span className="text-gray-500">Source</span>
              <span className="text-gray-700">{getSourceLabel(booking.source)}</span>
            </div>
          </div>
        </div>

        {/* Check-in Section */}
        {canShowCheckIn && (
          <CheckInSection
            booking={booking}
            customer={customer}
            onCheckInComplete={handleCheckInComplete}
          />
        )}

        {/* Notes */}
        {booking.notes && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Notes
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Commentaires
            {comments && comments.length > 0 && (
              <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">
                {comments.length}
              </span>
            )}
          </h3>

          {/* Comments list */}
          <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
            {commentsLoading ? (
              <p className="text-sm text-gray-500 text-center py-2">Chargement...</p>
            ) : comments && comments.length > 0 ? (
              comments.map((comment: BookingComment) => (
                <div
                  key={comment.id}
                  className="bg-white rounded-lg p-3 border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          comment.author === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {comment.author === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(comment.createdAt), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteComment.mutate(comment.id)}
                        className="text-gray-400 hover:text-danger-600 p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">Aucun commentaire</p>
            )}
          </div>

          {/* Add comment input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ajouter un commentaire..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim() || addComment.isPending}
              isLoading={addComment.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BookingDetailsModal;
