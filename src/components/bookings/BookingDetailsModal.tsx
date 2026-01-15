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
  FileText,
  Clock,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import CheckInSection from './CheckInSection';
import Select from '../ui/Select';
import InvoicePreviewModal from '../invoices/InvoicePreviewModal';
import type { Booking, BookingStatus, Property, BookingComment, Customer, PaymentStatus } from '../../types';
import { formatDate } from '../../utils/dates';
import { useBookingComments, useAddBookingComment, useDeleteBookingComment } from '../../hooks/useBookingComments';
import { useUpdateBooking } from '../../hooks/useBookings';
import { useUndoCheckIn } from '../../hooks/useCheckIn';
import { getCustomer } from '../../services/customerService';
import { generateInvoicePDF, findExistingInvoice } from '../../services/invoiceService';
import { useProperties } from '../../hooks/useProperties';
import { useToast } from '../../store/useAppStore';
import { differenceInDays, format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PAYMENT_STATUSES } from '../../types';

interface BookingDetailsModalProps {
  booking: Booking | null;
  property?: Property;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(booking?.paymentStatus || 'pending');
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<{
    invoiceNumber: string;
    pdfUrl: string;
    booking: Booking;
    customer?: Customer;
  } | null>(null);
  
  const { data: comments, isLoading: commentsLoading } = useBookingComments(booking?.id);
  const addComment = useAddBookingComment(booking?.id || '');
  const deleteComment = useDeleteBookingComment(booking?.id || '');
  const updateBooking = useUpdateBooking();
  const undoCheckIn = useUndoCheckIn(booking?.id || '');
  const { data: properties } = useProperties();
  const { addToast } = useToast();

  // Update payment status when booking changes
  useEffect(() => {
    if (booking?.paymentStatus) {
      setPaymentStatus(booking.paymentStatus);
    }
  }, [booking?.paymentStatus]);

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

  const handleUndoCheckIn = async () => {
    if (!booking) return;
    
    if (window.confirm('Êtes-vous sûr de vouloir annuler le check-in ? Le statut de la réservation sera réinitialisé à "Confirmé".')) {
      try {
        await undoCheckIn.mutateAsync();
        // The query invalidation in the hook will automatically refresh the booking data
        // The parent component should refetch and update the booking prop
      } catch (error) {
        // Error is already handled by the hook
        console.error('Error undoing check-in:', error);
      }
    }
  };

  const canShowCheckIn = booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'checked_out';
  const canGenerateInvoice = 
    booking.status === 'checked_in' || 
    booking.status === 'checked_out' || 
    booking.paymentStatus === 'paid';

  const handleGenerateInvoice = async () => {
    if (!properties || !booking) return;
    
    const property = properties.find(p => p.id === booking.propertyId);
    if (!property) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Propriété introuvable pour cette réservation.',
      });
      return;
    }

    setGeneratingInvoice(true);
    
    try {
      // Always check for existing invoice first - use it if found
      const existingInvoice = await findExistingInvoice(booking);
      
      if (existingInvoice) {
        // Use existing invoice - don't create a new one
        setInvoicePreview({
          invoiceNumber: existingInvoice.invoiceNumber,
          pdfUrl: existingInvoice.pdfUrl,
          booking,
          customer: customer || undefined,
        });
        
        addToast({
          type: 'success',
          title: 'Facture chargée',
          message: `Facture ${existingInvoice.invoiceNumber} chargée.`,
        });
      } else {
        // Only generate new invoice if none exists
        const { invoiceNumber, pdfUrl } = await generateInvoicePDF(booking, property, customer || undefined);
        
        setInvoicePreview({
          invoiceNumber,
          pdfUrl,
          booking,
          customer: customer || undefined,
        });

        addToast({
          type: 'success',
          title: 'Facture générée',
          message: `La facture ${invoiceNumber} a été générée avec succès.`,
        });
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de générer la facture. Veuillez réessayer.',
      });
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!invoicePreview) return;
    
    const link = document.createElement('a');
    link.href = invoicePreview.pdfUrl;
    link.download = `${invoicePreview.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addToast({
      type: 'success',
      title: 'Téléchargement',
      message: 'La facture a été téléchargée.',
    });
  };

  const handleSendEmail = async (email: string) => {
    if (!invoicePreview) return;
    
    const subject = encodeURIComponent(`Facture ${invoicePreview.invoiceNumber} - ZN Enterprises`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint la facture ${invoicePreview.invoiceNumber} pour votre réservation.\n\nCordialement,\nZN Enterprises`
    );
    
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
    
    addToast({
      type: 'success',
      title: 'Email',
      message: 'L\'application email s\'ouvre avec la facture.',
    });
  };

  const handleSendWhatsApp = (phone: string) => {
    if (!invoicePreview) return;
    
    const cleanPhone = phone.replace(/[\s\+\-\(\)]/g, '');
    const message = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver votre facture ${invoicePreview.invoiceNumber} :\n${invoicePreview.pdfUrl}\n\nCordialement,\nZN Enterprises`
    );
    
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(whatsappLink, '_blank');
    
    addToast({
      type: 'success',
      title: 'WhatsApp',
      message: 'WhatsApp s\'ouvre avec le message.',
    });
  };

  const footerContent = (
    <div className="flex justify-between items-center">
      <div className="flex gap-2">
        {canGenerateInvoice && (
          <Button
            variant="primary"
            onClick={handleGenerateInvoice}
            isLoading={generatingInvoice}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Facture
          </Button>
        )}
        {isAdmin && onDelete && (
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
        {onEdit && (
          <Button onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
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
            <div className="flex items-center gap-2">
              <Select
                options={PAYMENT_STATUSES}
                value={paymentStatus}
                onChange={(value) => {
                  const newStatus = value as PaymentStatus;
                  setPaymentStatus(newStatus);
                  if (booking) {
                    updateBooking.mutate({
                      id: booking.id,
                      data: { paymentStatus: newStatus },
                    });
                  }
                }}
                className="min-w-[120px]"
              />
            </div>
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
                {booking.checkedInAt && (
                  <p className="text-xs text-primary-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Check-in: {format(new Date(booking.checkedInAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
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
          <div>
            <CheckInSection
              booking={booking}
              customer={customer}
              onCheckInComplete={handleCheckInComplete}
            />
            {/* Undo Check-in Button - Only show if checked in and user is admin */}
            {isAdmin && booking.status === 'checked_in' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleUndoCheckIn}
                  isLoading={undoCheckIn.isPending}
                  className="w-full text-warning-600 border-warning-300 hover:bg-warning-50 hover:border-warning-400"
                >
                  Annuler le check-in
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Réinitialise le statut de la réservation à "Confirmé"
                </p>
              </div>
            )}
          </div>
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

    {/* Invoice Preview Modal */}
    {invoicePreview && (
      <InvoicePreviewModal
        isOpen={!!invoicePreview}
        onClose={() => setInvoicePreview(null)}
        invoiceNumber={invoicePreview.invoiceNumber}
        pdfUrl={invoicePreview.pdfUrl}
        booking={invoicePreview.booking}
        customer={invoicePreview.customer}
        onDownload={handleDownloadInvoice}
        onSendEmail={handleSendEmail}
        onSendWhatsApp={handleSendWhatsApp}
      />
    )}
    </>
  );
};

export default BookingDetailsModal;
