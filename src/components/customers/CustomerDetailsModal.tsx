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
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import TextArea from '../ui/TextArea';
import CurrencyToggle from '../ui/CurrencyToggle';
import { Card, CardBody } from '../ui/Card';
import type { Customer, CustomerComment, Booking } from '../../types';
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
  const { currency, setCurrency, formatAmount: formatCurrencyAmount } = useCurrency();
  
  const { data: comments, isLoading: commentsLoading } = useCustomerComments(customerId || undefined);
  const addComment = useAddCustomerComment(customerId || '');
  const deleteComment = useDeleteCustomerComment(customerId || '');
  const { data: allBookings } = useBookings();
  const { data: properties } = useProperties();

  // Get bookings for this customer
  const customerBookings = React.useMemo(() => {
    if (!allBookings || !customerId) return [];
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

  if (!customer) return null;

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
        {isAdmin && (
          <Button onClick={onEdit}>
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{customer.name}</h2>
            <div className="flex items-center gap-2">
              {getStatusBadge(customer)}
              {customer.tags && customer.tags.length > 0 && (
                <div className="flex gap-1">
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
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardBody className="text-center py-4">
              <p className="text-2xl font-bold text-primary-600">
                {customerStats?.totalBookings ?? customer.totalBookings ?? 0}
              </p>
              <p className="text-sm text-gray-500">Réservations</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-4">
              <p className="text-2xl font-bold text-success-600">
                {formatCurrencyAmount(
                  customerStats?.totalRevenue ?? customer.totalSpentEUR ?? 0,
                  (customerStats?.totalRevenue ?? customer.totalSpentEUR ?? 0) * 656
                )}
              </p>
              <p className="text-sm text-gray-500">Revenu total</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-4">
              <p className="text-2xl font-bold text-gray-900">
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
              <p className="text-sm text-gray-500">Moyenne/réservation</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-4">
              <p className="text-2xl font-bold text-gray-900">
                {customerStats?.avgStayDuration 
                  ? customerStats.avgStayDuration.toFixed(1)
                  : customer.averageRating 
                  ? customer.averageRating.toFixed(1) 
                  : '-'
                }
              </p>
              <p className="text-sm text-gray-500">
                {customerStats?.avgStayDuration ? 'Nuits moyennes' : 'Note moyenne'}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            Informations de contact
          </h3>
          <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-start gap-2 text-sm col-span-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-gray-700">{customer.address}</span>
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
          </div>
        </div>

        {/* Notes */}
        {customer.notes && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Notes
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          </div>
        )}

        {/* Reservations List */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Historique des réservations ({customerBookings.length})
          </h3>
          {customerBookings.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {customerBookings.map((booking: Booking) => {
                const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));
                return (
                  <Card key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <CardBody className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Home className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {getPropertyName(booking.propertyId)}
                            </span>
                            {getBookingStatusBadge(booking.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 ml-6 flex-wrap">
                            <span>
                              {format(new Date(booking.checkIn), 'dd MMM yyyy', { locale: fr })} - {format(new Date(booking.checkOut), 'dd MMM yyyy', { locale: fr })}
                            </span>
                            <span>{nights} nuit(s)</span>
                            <span className="font-medium text-gray-900">
                              {formatAmount(booking.totalPriceEUR, booking.totalPriceFCFA)}
                            </span>
                            <Badge variant="gray" size="sm">
                              {getSourceLabel(booking.source)}
                            </Badge>
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
            <MessageSquare className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Commentaires</h3>
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
          <div className="flex gap-2">
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
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CustomerDetailsModal;

