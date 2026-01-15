import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  User,
  Calendar,
  Clock,
  Tag,
  FileText,
  MessageSquare,
  Send,
  Pencil,
  Trash2,
  Home,
  Languages,
  Radio,
  Users,
  ExternalLink,
  X,
  CreditCard,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import TextArea from '../ui/TextArea';
import CurrencyToggle from '../ui/CurrencyToggle';
import { Card, CardBody } from '../ui/Card';
import type { Customer, CustomerComment, Booking, PaymentStatus } from '../../types';
import { formatDate, formatRelativeTime } from '../../utils/dates';
import { useCustomerComments, useAddCustomerComment, useDeleteCustomerComment } from '../../hooks/useCustomerComments';
import { useBookings } from '../../hooks/useBookings';
import { useProperties } from '../../hooks/useProperties';
import { useCurrency } from '../../store/useAppStore';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BOOKING_SOURCES } from '../../types';

const COUNTRIES = [
  { value: 'CM', label: 'Cameroun' },
  { value: 'FR', label: 'France' },
  { value: 'US', label: 'États-Unis' },
  { value: 'GB', label: 'Royaume-Uni' },
  { value: 'DE', label: 'Allemagne' },
  { value: 'BE', label: 'Belgique' },
  { value: 'CH', label: 'Suisse' },
  { value: 'CA', label: 'Canada' },
  { value: 'SN', label: 'Sénégal' },
  { value: 'CI', label: 'Côte d\'Ivoire' },
  { value: 'GA', label: 'Gabon' },
  { value: 'CG', label: 'Congo' },
  { value: 'CD', label: 'RD Congo' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'OTHER', label: 'Autre' },
];

const getCountryLabel = (code: string) => {
  return COUNTRIES.find(c => c.value === code)?.label || code;
};

interface CustomerDetailsModalProps {
  customerId: string | null;
  customer: Customer | null;
  customerStats?: {
    totalBookings: number;
    totalRevenue: number;
    avgStayDuration: number;
    lastStayDate: Date | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
  formatAmount: (eur: number, fcfa: number) => string;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customerId,
  customer,
  customerStats,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isAdmin,
  formatAmount,
}) => {
  const [newComment, setNewComment] = useState('');
  const [showCustomerIdModal, setShowCustomerIdModal] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null);
  const { currency, setCurrency, formatAmount: formatCurrencyAmount } = useCurrency();
  
  const { data: comments, isLoading: commentsLoading } = useCustomerComments(customerId || undefined);
  const addComment = useAddCustomerComment(customerId || '');
  const deleteComment = useDeleteCustomerComment(customerId || '');
  const { data: allBookings } = useBookings();
  const { data: properties } = useProperties();

  // Get bookings for this customer (including future bookings)
  const customerBookings = React.useMemo(() => {
    if (!allBookings || !customerId) return [];
    // Filter by customer ID only - no date filtering, includes past, present, and future bookings
    return allBookings
      .filter((b: Booking) => b.customerId === customerId)
      .sort((a: Booking, b: Booking) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }, [allBookings, customerId]);

  const getPropertyName = (propertyId: string) => {
    return properties?.find((p) => p.id === propertyId)?.name || 'Appartement inconnu';
  };

  const getSourceLabel = (source: string) => {
    return BOOKING_SOURCES.find(s => s.value === source)?.label || source;
  };

  // Calculate most common booking source
  const mostCommonSource = React.useMemo(() => {
    if (!customerBookings || customerBookings.length === 0) return null;
    const sourceCounts: Record<string, number> = {};
    customerBookings.forEach((booking: Booking) => {
      sourceCounts[booking.source] = (sourceCounts[booking.source] || 0) + 1;
    });
    const sortedSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
    return sortedSources.length > 0 ? sortedSources[0][0] : null;
  }, [customerBookings]);

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return phone;
    // If phone starts with +, add space after country code (typically 1-4 digits after +)
    if (phone.startsWith('+')) {
      // Match country code (1-4 digits) and add space after it
      return phone.replace(/^(\+\d{1,4})(\d)/, '$1 $2');
    }
    return phone;
  };

  const getStatusBadge = (customer: Customer) => {
    if (customer.isVIP) {
      return <Badge variant="success">VIP</Badge>;
    }
    if (customer.totalBookings > 2) {
      return <Badge variant="primary">Régulier</Badge>;
    }
    return <Badge variant="gray">Nouveau</Badge>;
  };

  const getBookingStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'primary' | 'gray' | 'danger' | 'warning'> = {
      inquiry: 'warning',
      confirmed: 'primary',
      checked_in: 'success',
      checked_out: 'gray',
      cancelled: 'danger',
    };
    const labels: Record<string, string> = {
      inquiry: 'Demande',
      confirmed: 'Confirmé',
      checked_in: 'Check-in',
      checked_out: 'Check-out',
      cancelled: 'Annulé',
    };
    return <Badge variant={variants[status] || 'gray'} size="sm">{labels[status] || status}</Badge>;
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const variants: Record<PaymentStatus, 'success' | 'warning' | 'gray'> = {
      paid: 'success',
      partial: 'warning',
      pending: 'gray',
    };
    const labels: Record<PaymentStatus, string> = {
      paid: 'Payé',
      partial: 'Partiel',
      pending: 'En attente',
    };
    return <Badge variant={variants[status]} size="sm">{labels[status]}</Badge>;
  };

  const handleViewBooking = (bookingId: string) => {
    // Close customer modal and navigate to booking
    onClose();
    window.location.href = `/bookings?view=${bookingId}`;
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

  // Show loading state if customer is not yet loaded
  if (!customer) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Détails du client"
        size="xl"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Chargement des informations du client...</p>
          </div>
        </div>
      </Modal>
    );
  }

  const footerContent = (
    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
      <div>
        {isAdmin && (
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 w-full sm:w-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
        <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          Fermer
        </Button>
        {isAdmin && (
          <Button onClick={onEdit} className="w-full sm:w-auto">
            <Pencil className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Détails du client"
      size="xl"
      footer={footerContent}
    >
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{customer.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(customer)}
              {customer.tags && customer.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="gray" size="sm">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <CurrencyToggle value={currency} onChange={setCurrency} size="sm" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardBody className="text-center py-3 md:py-4">
              <p className="text-xl md:text-2xl font-bold text-primary-600">
                {customerStats?.totalBookings ?? customer.totalBookings ?? 0}
              </p>
              <p className="text-xs md:text-sm text-gray-500">Réservations</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3 md:py-4">
              <p className="text-lg md:text-2xl font-bold text-success-600 break-words">
                {formatCurrencyAmount(
                  customerStats?.totalRevenue ?? customer.totalSpentEUR ?? 0,
                  (customerStats?.totalRevenue ?? customer.totalSpentEUR ?? 0) * 656
                )}
              </p>
              <p className="text-xs md:text-sm text-gray-500">Revenu total</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3 md:py-4">
              <p className="text-lg md:text-2xl font-bold text-gray-900 break-words">
                {customerStats && customerStats.totalBookings > 0
                  ? formatCurrencyAmount(
                      customerStats.totalRevenue / customerStats.totalBookings,
                      (customerStats.totalRevenue / customerStats.totalBookings) * 656
                    )
                  : customer.totalBookings > 0
                  ? formatCurrencyAmount(
                      (customer.totalSpentEUR ?? 0) / customer.totalBookings,
                      ((customer.totalSpentEUR ?? 0) / customer.totalBookings) * 656
                    )
                  : formatCurrencyAmount(0, 0)
                }
              </p>
              <p className="text-xs md:text-sm text-gray-500">Moyenne/réservation</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3 md:py-4">
              <p className="text-xl md:text-2xl font-bold text-gray-900">
                {customerStats?.avgStayDuration 
                  ? customerStats.avgStayDuration.toFixed(1)
                  : customer.averageRating 
                  ? customer.averageRating.toFixed(1) 
                  : '-'
                }
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                {customerStats?.avgStayDuration ? 'Nuits moyennes' : 'Note moyenne'}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            Informations de contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{formatPhoneNumber(customer.phone)}</span>
              </div>
            )}
            {customer.nationality ? (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">Nationalité: {getCountryLabel(customer.nationality)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500 italic">Nationalité: Non spécifiée</span>
              </div>
            )}
            {customer.countryOfResidence ? (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">Pays de résidence: {getCountryLabel(customer.countryOfResidence)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500 italic">Pays de résidence: Non spécifié</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-2 text-sm md:col-span-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 break-words">{customer.address}</span>
              </div>
            )}
            {customer.dateOfBirth && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">
                  Né(e) le: {format(new Date(customer.dateOfBirth), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
            )}
            {customer.preferredLanguage && (
              <div className="flex items-center gap-2 text-sm">
                <Languages className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">Langue: {customer.preferredLanguage === 'fr' ? 'Français' : 'English'}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Client depuis: {formatRelativeTime(customer.createdAt)}</span>
            </div>
            {mostCommonSource && (
              <div className="flex items-center gap-2 text-sm">
                <Radio className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">Canal principal: {getSourceLabel(mostCommonSource)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">ID Client:</span>
              <button
                onClick={() => setShowCustomerIdModal(true)}
                className="text-primary-600 hover:text-primary-700 hover:underline font-mono text-xs cursor-pointer"
                title="Cliquer pour agrandir"
              >
                {customer.id}
              </button>
            </div>
          </div>
        </div>

        {/* ID Documents and Signature */}
        {(customer.idDocumentUrl || customer.idDocumentBackUrl || customer.signatureUrl) && (
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              Documents d'identité
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {customer.idDocumentUrl && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Pièce d'identité (Recto)</p>
                  <img
                    src={customer.idDocumentUrl}
                    alt="ID Document Front"
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setEnlargedImage({ url: customer.idDocumentUrl!, title: 'Pièce d\'identité - Recto' })}
                  />
                </div>
              )}
              {customer.idDocumentBackUrl && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Pièce d'identité (Verso)</p>
                  <img
                    src={customer.idDocumentBackUrl}
                    alt="ID Document Back"
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setEnlargedImage({ url: customer.idDocumentBackUrl!, title: 'Pièce d\'identité - Verso' })}
                  />
                </div>
              )}
              {customer.signatureUrl && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Signature</p>
                  <img
                    src={customer.signatureUrl}
                    alt="Signature"
                    className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-white cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setEnlargedImage({ url: customer.signatureUrl!, title: 'Signature' })}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {customer.notes && (
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              Notes
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 md:p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{customer.notes}</p>
            </div>
          </div>
        )}

        {/* Reservations List */}
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            Historique des réservations ({customerBookings.length})
          </h3>
          {customerBookings.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {customerBookings.map((booking: Booking) => {
                const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));
                return (
                  <Card 
                    key={booking.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewBooking(booking.id)}
                  >
                    <CardBody className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Header: Property and Status */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Home className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-semibold text-gray-900 break-words">
                              {getPropertyName(booking.propertyId)}
                            </span>
                            {getBookingStatusBadge(booking.status)}
                            {getPaymentStatusBadge(booking.paymentStatus)}
                          </div>

                          {/* Dates and Duration */}
                          <div className="mb-2">
                            <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span className="break-words">
                                {format(new Date(booking.checkIn), 'dd MMM yyyy', { locale: fr })} - {format(new Date(booking.checkOut), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-600 ml-6 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                {nights} nuit(s)
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                {booking.guests} invité(s)
                              </span>
                            </div>
                            {booking.checkedInAt && (
                              <div className="text-xs text-primary-600 ml-6 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Check-in: {format(new Date(booking.checkedInAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                              </div>
                            )}
                          </div>

                          {/* Amount, Source, and Action */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-semibold text-gray-900 text-sm break-words">
                                {formatAmount(booking.totalPriceEUR, booking.totalPriceFCFA)}
                              </span>
                              <Badge variant="gray" size="sm" className="w-fit">
                                {getSourceLabel(booking.source)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-primary-600">
                              <span>Voir détails</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Aucune réservation pour ce client
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Commentaires</h3>
            {comments && comments.length > 0 && (
              <Badge variant="gray" size="sm">
                {comments.length}
              </Badge>
            )}
          </div>

          {/* Comments List */}
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {commentsLoading ? (
              <p className="text-sm text-gray-500">Chargement...</p>
            ) : comments && comments.length > 0 ? (
              comments.map((comment: CustomerComment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author === 'admin' ? 'Admin' : 'Staff'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteComment.mutate(comment.id)}
                        className="text-xs text-danger-600 hover:text-danger-700"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">Aucun commentaire pour le moment.</p>
            )}
          </div>

          {/* Add Comment */}
          <div className="flex flex-col sm:flex-row gap-2">
            <TextArea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ajouter un commentaire..."
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addComment.isPending}
              isLoading={addComment.isPending}
              size="sm"
              className="w-full sm:w-auto"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Customer ID Modal */}
      {showCustomerIdModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowCustomerIdModal(false)}
        >
          <div 
            className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCustomerIdModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ID Client</h3>
              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <p className="text-2xl font-mono text-gray-900 break-all select-all">
                  {customer.id}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setShowCustomerIdModal(false)}
                className="w-full"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="bg-white rounded-lg p-4 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                {enlargedImage.title}
              </h3>
              <div className="flex items-center justify-center">
                <img
                  src={enlargedImage.url}
                  alt={enlargedImage.title}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              </div>
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setEnlargedImage(null)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CustomerDetailsModal;

