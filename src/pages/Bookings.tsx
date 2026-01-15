import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Download, 
  Upload,
  Calendar, 
  Grid, 
  Pencil, 
  Trash2,
  Filter,
  CalendarRange,
  X,
  ChevronDown,
  ClipboardCheck,
  FileText,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import DatePicker from '../components/ui/DatePicker';
import { Card, CardBody } from '../components/ui/Card';
import BookingForm from '../components/bookings/BookingForm';
import BookingCalendar from '../components/bookings/BookingCalendar';
import BookingImportModal from '../components/bookings/BookingImportModal';
import BookingDetailsModal from '../components/bookings/BookingDetailsModal';
import InvoicePreviewModal from '../components/invoices/InvoicePreviewModal';
import { 
  useBookings, 
  useCreateBooking, 
  useUpdateBooking, 
  useDeleteBooking,
  useBulkCreateBookings,
} from '../hooks/useBookings';
import { useProperties } from '../hooks/useProperties';
import { useCurrency, useMode } from '../store/useAppStore';
import { formatDate } from '../utils/dates';
import { exportBookings, type ExportFormat } from '../utils/export';
import type { Booking, BookingFormData, BookingStatus, PaymentStatus, Customer } from '../types';
import { BOOKING_STATUSES, BOOKING_SOURCES } from '../types';
import { differenceInDays, format } from 'date-fns';
import { generateInvoicePDF, findExistingInvoice } from '../services/invoiceService';
import { getCustomer } from '../services/customerService';
import { useToast } from '../store/useAppStore';

type SortField = 'checkIn' | 'duration' | 'amount';
type SortDirection = 'asc' | 'desc';

const Bookings: React.FC = () => {
  const { isAdmin, isInvestor } = useMode();
  const { addToast } = useToast();
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<{
    invoiceNumber: string;
    pdfUrl: string;
    booking: Booking;
    customer?: Customer;
  } | null>(null);
  const { formatAmount } = useCurrency();

  // State
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('checkIn');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 });
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const datePickerButtonRef = useRef<HTMLButtonElement>(null);

  // Calculate popover position and close when clicking outside
  useEffect(() => {
    const updatePosition = () => {
      if (datePickerButtonRef.current && showDatePicker) {
        const rect = datePickerButtonRef.current.getBoundingClientRect();
        setDatePickerPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      }
    };

    if (showDatePicker) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking on date inputs or their calendar popup
      if (target.tagName === 'INPUT' && target.type === 'date') {
        return;
      }
      // Don't close if clicking inside the popover
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setShowDatePicker(false);
      }
    };
    
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  // URL parameters
  const [searchParams, setSearchParams] = useSearchParams();

  // Queries
  const { data: bookings, isLoading } = useBookings();
  const { data: properties } = useProperties();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const bulkCreateBookings = useBulkCreateBookings();

  // Handle URL parameters for edit/new/delete/view
  useEffect(() => {
    const editId = searchParams.get('edit');
    const newParam = searchParams.get('new');
    const deleteId = searchParams.get('delete');
    const viewId = searchParams.get('view');

    if (editId && bookings && !editingBooking) {
      const booking = bookings.find((b) => b.id === editId);
      if (booking) {
        setEditingBooking(booking);
        // Remove the edit parameter from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('edit');
        setSearchParams(newParams, { replace: true });
      }
    } else if (newParam === 'true' && !showForm) {
      setShowForm(true);
      // Remove the new parameter from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('new');
      setSearchParams(newParams, { replace: true });
    } else if (deleteId && bookings && !deletingBooking) {
      const booking = bookings.find((b) => b.id === deleteId);
      if (booking) {
        setDeletingBooking(booking);
        // Remove the delete parameter from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('delete');
        setSearchParams(newParams, { replace: true });
      }
    } else if (viewId && bookings && !viewingBooking) {
      const booking = bookings.find((b) => b.id === viewId);
      if (booking) {
        setViewingBooking(booking);
        // Remove the view parameter from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('view');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, bookings, setSearchParams, editingBooking, showForm, deletingBooking, viewingBooking]);

  // Calculate stay duration
  const getStayDuration = (booking: Booking): number => {
    return differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));
  };

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];

    let filtered = bookings.filter((booking) => {
      const matchesSearch =
        !search ||
        booking.guestName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || booking.status === statusFilter;
      const matchesProperty =
        !propertyFilter || booking.propertyId === propertyFilter;
      const matchesSource = !sourceFilter || booking.source === sourceFilter;
      
      let matchesDateRange = true;
      if (dateRangeStart || dateRangeEnd) {
        const checkInDate = new Date(booking.checkIn);
        if (dateRangeStart) {
          matchesDateRange = matchesDateRange && checkInDate >= new Date(dateRangeStart);
        }
        if (dateRangeEnd) {
          matchesDateRange = matchesDateRange && checkInDate <= new Date(dateRangeEnd);
        }
      }

      return matchesSearch && matchesStatus && matchesProperty && matchesSource && matchesDateRange;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'checkIn':
          comparison = new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
          break;
        case 'duration':
          comparison = getStayDuration(a) - getStayDuration(b);
          break;
        case 'amount':
          comparison = a.totalPriceEUR - b.totalPriceEUR;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [bookings, search, statusFilter, propertyFilter, sourceFilter, dateRangeStart, dateRangeEnd, sortField, sortDirection]);

  const getPropertyName = (propertyId: string) => {
    return properties?.find((p) => p.id === propertyId)?.name || 'Unknown';
  };

  const getProperty = (propertyId: string) => {
    return properties?.find((p) => p.id === propertyId);
  };

  const handleViewBooking = (booking: Booking) => {
    setViewingBooking(booking);
  };

  const handleEditFromDetails = () => {
    if (viewingBooking) {
      setEditingBooking(viewingBooking);
      setViewingBooking(null);
    }
  };

  const handleDeleteFromDetails = () => {
    if (viewingBooking) {
      setDeletingBooking(viewingBooking);
      setViewingBooking(null);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    const variants: Record<BookingStatus, 'success' | 'primary' | 'gray' | 'danger' | 'warning'> = {
      inquiry: 'warning',
      confirmed: 'primary',
      checked_in: 'success',
      checked_out: 'gray',
      cancelled: 'danger',
    };
    const labels: Record<BookingStatus, string> = {
      inquiry: 'Demande',
      confirmed: 'Confirmé',
      checked_in: 'Check-in',
      checked_out: 'Check-out',
      cancelled: 'Annulé',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
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

  const handleCreate = async (data: BookingFormData) => {
    await createBooking.mutateAsync(data);
    setShowForm(false);
    // Clear any URL parameters
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('new');
    setSearchParams(newParams, { replace: true });
  };

  const handleUpdate = async (data: BookingFormData) => {
    if (!editingBooking) return;
    await updateBooking.mutateAsync({ id: editingBooking.id, data });
    setEditingBooking(null);
    // Clear any URL parameters
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('edit');
    setSearchParams(newParams, { replace: true });
  };

  const handleDelete = async () => {
    if (!deletingBooking) return;
    await deleteBooking.mutateAsync(deletingBooking.id);
    setDeletingBooking(null);
  };

  const handleImport = async (bookingsData: BookingFormData[]) => {
    await bulkCreateBookings.mutateAsync(bookingsData);
    setShowImport(false);
  };

  const handleGenerateInvoice = async (booking: Booking) => {
    if (!properties) return;
    
    const property = properties.find(p => p.id === booking.propertyId);
    if (!property) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Propriété introuvable pour cette réservation.',
      });
      return;
    }

    setGeneratingInvoice(booking.id);
    
    try {
      // Fetch customer if available
      let customer: Customer | undefined = undefined;
      if (booking.customerId) {
        try {
          customer = await getCustomer(booking.customerId);
        } catch (err) {
          console.warn('Could not fetch customer:', err);
        }
      }

      // Always check for existing invoice first - use it if found
      const existingInvoice = await findExistingInvoice(booking);
      
      if (existingInvoice) {
        // Use existing invoice - don't create a new one
        setInvoicePreview({
          invoiceNumber: existingInvoice.invoiceNumber,
          pdfUrl: existingInvoice.pdfUrl,
          booking,
          customer,
        });
        
        addToast({
          type: 'success',
          title: 'Facture chargée',
          message: `Facture ${existingInvoice.invoiceNumber} chargée.`,
        });
      } else {
        // Only generate new invoice if none exists
        const { invoiceNumber, pdfUrl } = await generateInvoicePDF(booking, property, customer);
        
        // Show preview modal instead of auto-download
        setInvoicePreview({
          invoiceNumber,
          pdfUrl,
          booking,
          customer,
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
      setGeneratingInvoice(null);
    }
  };

  const handleDownloadInvoice = () => {
    if (!invoicePreview) return;
    
    // Create a temporary link to download the PDF
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
    
    // Create mailto link with subject and body
    const subject = encodeURIComponent(`Facture ${invoicePreview.invoiceNumber} - ZN Enterprises`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint la facture ${invoicePreview.invoiceNumber} pour votre réservation.\n\nCordialement,\nZN Enterprises`
    );
    
    // For now, open mailto link (in production, you might want to use an email service)
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
    
    // Format phone number (remove spaces, +, etc.)
    const cleanPhone = phone.replace(/[\s\+\-\(\)]/g, '');
    
    // Create WhatsApp link
    const message = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver votre facture ${invoicePreview.invoiceNumber} :\n${invoicePreview.pdfUrl}\n\nCordialement,\nZN Enterprises`
    );
    
    // Use WhatsApp Web API
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(whatsappLink, '_blank');
    
    addToast({
      type: 'success',
      title: 'WhatsApp',
      message: 'WhatsApp s\'ouvre avec le message.',
    });
  };

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const handleExport = (format: ExportFormat) => {
    if (!filteredBookings.length) return;
    const propertyNames: Record<string, string> = {};
    properties?.forEach((p) => {
      propertyNames[p.id] = p.name;
    });
    exportBookings(filteredBookings, propertyNames, format);
    setShowExportMenu(false);
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearDateRange = () => {
    setDateRangeStart('');
    setDateRangeEnd('');
    setShowDatePicker(false);
  };

  const getDateRangeLabel = () => {
    if (dateRangeStart && dateRangeEnd) {
      return `${format(new Date(dateRangeStart), 'dd/MM')} - ${format(new Date(dateRangeEnd), 'dd/MM')}`;
    }
    if (dateRangeStart) {
      return `Depuis ${format(new Date(dateRangeStart), 'dd/MM')}`;
    }
    if (dateRangeEnd) {
      return `Jusqu'au ${format(new Date(dateRangeEnd), 'dd/MM')}`;
    }
    return 'Date range';
  };

  const propertyOptions = [
    { value: '', label: 'Appartement' },
    ...(properties?.map((p) => ({ value: p.id, label: p.name })) || []),
  ];

  const statusOptions = [
    { value: '', label: 'Statut' },
    ...BOOKING_STATUSES,
  ];

  const sourceOptions = [
    { value: '', label: 'Canal' },
    ...BOOKING_SOURCES,
  ];

  const columns = [
    {
      key: 'guestName',
      header: 'Client',
      sortable: true,
      render: (booking: Booking) => (
        <div>
          <p className="font-medium text-gray-900">{booking.guestName}</p>
          <p className="text-xs text-gray-500">{booking.guests} invité(s)</p>
        </div>
      ),
    },
    {
      key: 'propertyId',
      header: 'Appartement',
      render: (booking: Booking) => getPropertyName(booking.propertyId),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (booking: Booking) => (
        <div className="text-sm">
          <p>{formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</p>
          <p className="text-xs text-gray-500">{getStayDuration(booking)} nuit(s)</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (booking: Booking) => (
        <span className="font-medium">
          {formatAmount(booking.totalPriceEUR, booking.totalPriceFCFA)}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (booking: Booking) => (
        <span className="capitalize text-sm">{booking.source}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (booking: Booking) => getStatusBadge(booking.status),
    },
    {
      key: 'actions',
      header: '',
      render: (booking: Booking) => {
        const canGenerateInvoice = 
          booking.status === 'checked_in' || 
          booking.status === 'checked_out' || 
          booking.paymentStatus === 'paid';
        
        return (
          <div className="flex gap-1 justify-end">
            {canGenerateInvoice && (
              <Button
                size="sm"
                variant="outline"
                className="p-2 border-blue-300 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                title="Générer facture"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateInvoice(booking);
                }}
                isLoading={generatingInvoice === booking.id}
                disabled={generatingInvoice !== null}
              >
                <FileText className="w-4 h-4" />
              </Button>
            )}
            {booking.status === 'confirmed' && (
            <Button
              size="sm"
              variant="outline"
              className="p-2 border-emerald-300 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
              title="Check-in"
              onClick={(e) => {
                e.stopPropagation();
                setViewingBooking(booking);
              }}
            >
              <ClipboardCheck className="w-4 h-4" />
            </Button>
          )}
          {!isInvestor && (
            <Button
              size="sm"
              variant="outline"
              className="p-2"
              title="Modifier"
              onClick={(e) => {
                e.stopPropagation();
                setEditingBooking(booking);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {isAdmin && !isInvestor && (
            <Button
              size="sm"
              variant="outline"
              className="p-2 border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
              title="Supprimer"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingBooking(booking);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        );
      },
    },
  ];

  const hasActiveFilters = statusFilter || sourceFilter || propertyFilter || dateRangeStart || dateRangeEnd;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-gray-600 mt-1">
            {filteredBookings.length} réservation(s)
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <div className="relative" ref={exportMenuRef}>
                <Button 
                  variant="outline" 
                  onClick={() => setShowExportMenu(!showExportMenu)} 
                  className="p-2"
                  title="Exporter"
                >
                  <Download className="w-5 h-5" />
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                    <button
                      onClick={() => handleExport('xlsx')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowImport(true)} 
                className="p-2"
                title="Importer"
              >
                <Upload className="w-5 h-5" />
              </Button>
            </>
          )}
          {!isInvestor && (
            <Button 
              onClick={() => setShowForm(true)} 
              className="p-2"
              title="Nouvelle réservation"
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Compact Filter Bar */}
      <Card className="overflow-visible">
        <CardBody className="py-3 overflow-visible">
          {/* Desktop Layout */}
          <div className="hidden md:flex flex-wrap items-center gap-3">
            {/* Filter icon + label */}
            <div className="flex items-center gap-2 text-gray-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtres</span>
            </div>

            {/* Search - compact */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" />

            {/* Status dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                statusFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <option value="">Statut</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Source dropdown */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className={`px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                sourceFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <option value="">Canal</option>
              {BOOKING_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Property dropdown - only show if more than one */}
            {properties && properties.length > 1 && (
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className={`px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 max-w-[140px] truncate ${
                  propertyFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <option value="">Appartement</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}

            {/* Date range button with popover */}
            <div className="relative">
              <button
                ref={datePickerButtonRef}
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer hover:bg-gray-50 ${
                  dateRangeStart || dateRangeEnd ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <CalendarRange className="w-4 h-4 text-gray-500" />
                <span>{getDateRangeLabel()}</span>
                {(dateRangeStart || dateRangeEnd) && (
                  <X 
                    className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" 
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDateRange();
                    }}
                  />
                )}
              </button>
              
              {showDatePicker && (
                <div 
                  ref={datePickerRef}
                  className="fixed p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] min-w-[280px]"
                  style={{ top: `${datePickerPosition.top}px`, left: `${datePickerPosition.left}px` }}
                >
                  <div className="space-y-3">
                    <div onClick={(e) => e.stopPropagation()}>
                      <label className="block text-xs text-gray-500 mb-1">Du</label>
                      <DatePicker
                        value={dateRangeStart}
                        onChange={(date) => setDateRangeStart(date)}
                        className="w-full"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <label className="block text-xs text-gray-500 mb-1">Au</label>
                      <DatePicker
                        value={dateRangeEnd}
                        onChange={(date) => setDateRangeEnd(date)}
                        className="w-full"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <button
                        onClick={clearDateRange}
                        className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                      >
                        Effacer
                      </button>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clear all filters */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setSourceFilter('');
                  setPropertyFilter('');
                  setDateRangeStart('');
                  setDateRangeEnd('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Effacer tout
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Sort buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Tri:</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => handleSortClick('checkIn')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors ${
                    sortField === 'checkIn' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Date
                  {sortField === 'checkIn' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSortClick('amount')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors border-l border-gray-200 ${
                    sortField === 'amount' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Montant
                  {sortField === 'amount' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSortClick('duration')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors border-l border-gray-200 ${
                    sortField === 'duration' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Durée
                  {sortField === 'duration' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setView('table')}
                className={`p-1.5 ${view === 'table' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="Vue tableau"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`p-1.5 border-l border-gray-200 ${view === 'calendar' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="Vue calendrier"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-2">
            {/* Row 1: Search (half width) + Status (half width) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Search - half width */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              {/* Status dropdown - half width */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-3 py-2 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 h-[38px] ${
                  statusFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <option value="">Statut</option>
                {BOOKING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Row 2: Canal, Property, Date Range, Sort, View */}
            <div className="grid grid-cols-2 gap-2">
              {/* Canal dropdown */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className={`px-3 py-2 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 h-[38px] ${
                  sourceFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <option value="">Canal</option>
                {BOOKING_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              {/* Property dropdown or Date Range - only show property if more than one */}
              {properties && properties.length > 1 ? (
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className={`px-3 py-2 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 h-[38px] ${
                    propertyFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <option value="">Appartement</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <div className="relative" ref={datePickerRef}>
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`w-full h-[38px] flex items-center justify-center gap-1.5 px-3 text-sm border rounded-lg bg-white cursor-pointer hover:bg-gray-50 ${
                      dateRangeStart || dateRangeEnd ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <CalendarRange className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-xs truncate">{getDateRangeLabel()}</span>
                    {(dateRangeStart || dateRangeEnd) && (
                      <X 
                        className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0" 
                        onClick={(e) => {
                          e.stopPropagation();
                          clearDateRange();
                        }}
                      />
                    )}
                  </button>
                  
                  {showDatePicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] isolate">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Du</label>
                          <DatePicker
                            value={dateRangeStart}
                            onChange={(date) => setDateRangeStart(date)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Au</label>
                          <DatePicker
                            value={dateRangeEnd}
                            onChange={(date) => setDateRangeEnd(date)}
                            className="w-full"
                          />
                        </div>
                        <div className="flex gap-2 pt-2 border-t">
                          <button
                            onClick={clearDateRange}
                            className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                          >
                            Effacer
                          </button>
                          <button
                            onClick={() => setShowDatePicker(false)}
                            className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                          >
                            Appliquer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row 3: Date Range (if property shown) */}
            {properties && properties.length > 1 && (
              <div className="grid grid-cols-2 gap-2">
                <div className="relative" ref={datePickerRef}>
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`w-full h-[38px] flex items-center justify-center gap-1.5 px-3 text-sm border rounded-lg bg-white cursor-pointer hover:bg-gray-50 ${
                      dateRangeStart || dateRangeEnd ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <CalendarRange className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-xs truncate">{getDateRangeLabel()}</span>
                    {(dateRangeStart || dateRangeEnd) && (
                      <X 
                        className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0" 
                        onClick={(e) => {
                          e.stopPropagation();
                          clearDateRange();
                        }}
                      />
                    )}
                  </button>
                  
                  {showDatePicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] isolate">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Du</label>
                          <DatePicker
                            value={dateRangeStart}
                            onChange={(date) => setDateRangeStart(date)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Au</label>
                          <DatePicker
                            value={dateRangeEnd}
                            onChange={(date) => setDateRangeEnd(date)}
                            className="w-full"
                          />
                        </div>
                        <div className="flex gap-2 pt-2 border-t">
                          <button
                            onClick={clearDateRange}
                            className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                          >
                            Effacer
                          </button>
                          <button
                            onClick={() => setShowDatePicker(false)}
                            className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                          >
                            Appliquer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div></div>
              </div>
            )}

            {/* Sort and View Toggle - Flexible layout */}
            <div className="flex items-center justify-between gap-2">
              {/* Sort buttons */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-gray-500 whitespace-nowrap">Tri:</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => handleSortClick('checkIn')}
                    className={`px-3 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors ${
                      sortField === 'checkIn' 
                        ? 'bg-gray-800 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Date
                    {sortField === 'checkIn' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSortClick('amount')}
                    className={`px-3 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors border-l border-gray-200 ${
                      sortField === 'amount' 
                        ? 'bg-gray-800 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Montant
                    {sortField === 'amount' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSortClick('duration')}
                    className={`px-3 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors border-l border-gray-200 ${
                      sortField === 'duration' 
                        ? 'bg-gray-800 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Durée
                    {sortField === 'duration' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* View toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setView('table')}
                  className={`p-2 ${view === 'table' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  title="Vue tableau"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('calendar')}
                  className={`p-2 border-l border-gray-200 ${view === 'calendar' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  title="Vue calendrier"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setSourceFilter('');
                  setPropertyFilter('');
                  setDateRangeStart('');
                  setDateRangeEnd('');
                }}
                className="w-full text-xs text-gray-500 hover:text-gray-700 underline text-center py-1"
              >
                Effacer tout
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Content */}
      {view === 'table' ? (
        <>
          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <Table
              columns={columns}
              data={filteredBookings}
              keyExtractor={(item) => item.id}
              isLoading={isLoading}
              emptyMessage="Aucune réservation trouvée"
              onRowClick={handleViewBooking}
            />
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucune réservation trouvée</div>
            ) : (
              filteredBookings.map((booking) => (
                <Card 
                  key={booking.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewBooking(booking)}
                >
                  <CardBody className="p-4">
                    {/* Header: Guest Name and Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          {booking.guestName}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {booking.guests} invité(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(booking.status)}
                        {booking.status === 'confirmed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="p-1.5 border-emerald-300 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Check-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingBooking(booking);
                            }}
                          >
                            <ClipboardCheck className="w-4 h-4" />
                          </Button>
                        )}
                        {!isInvestor && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="p-1.5"
                            title="Modifier"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBooking(booking);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Property */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-0.5">Appartement</p>
                      <p className="text-sm font-medium text-gray-900">
                        {getPropertyName(booking.propertyId)}
                      </p>
                    </div>

                    {/* Dates */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-0.5">Dates</p>
                      <p className="text-sm text-gray-900">
                        {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {getStayDuration(booking)} nuit(s)
                      </p>
                    </div>

                    {/* Total and Source */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Total</p>
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {formatAmount(booking.totalPriceEUR, booking.totalPriceFCFA)}
                        </p>
                        {getPaymentStatusBadge(booking.paymentStatus)}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-0.5">Source</p>
                        <p className="text-sm text-gray-900 capitalize">
                          {booking.source}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                      {(booking.status === 'checked_in' || booking.status === 'checked_out' || booking.paymentStatus === 'paid') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="p-2 border-blue-300 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Générer facture"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateInvoice(booking);
                          }}
                          isLoading={generatingInvoice === booking.id}
                          disabled={generatingInvoice !== null}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      {isAdmin && !isInvestor && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="p-2 border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Supprimer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingBooking(booking);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <BookingCalendar onBookingClick={handleViewBooking} />
      )}

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={viewingBooking}
        property={viewingBooking ? getProperty(viewingBooking.propertyId) : undefined}
        isOpen={!!viewingBooking}
        onClose={() => setViewingBooking(null)}
        onEdit={!isInvestor ? handleEditFromDetails : undefined}
        onDelete={!isInvestor ? handleDeleteFromDetails : undefined}
        isAdmin={isAdmin}
        formatAmount={formatAmount}
      />

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

      {/* Create Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nouvelle réservation"
        size="lg"
      >
        <BookingForm
          onSubmit={handleCreate}
          isLoading={createBooking.isPending}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingBooking}
        onClose={() => {
          setEditingBooking(null);
          // Clear any URL parameters
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('edit');
          setSearchParams(newParams, { replace: true });
        }}
        title="Modifier la réservation"
        size="lg"
      >
        {editingBooking && (
          <BookingForm
            onSubmit={handleUpdate}
            initialData={editingBooking}
            isLoading={updateBooking.isPending}
            onCancel={() => {
              setEditingBooking(null);
              // Clear any URL parameters
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('edit');
              setSearchParams(newParams, { replace: true });
            }}
          />
        )}
      </Modal>

      {/* Import Modal */}
      <BookingImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        properties={properties || []}
        isLoading={bulkCreateBookings.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingBooking}
        onClose={() => setDeletingBooking(null)}
        onConfirm={handleDelete}
        title="Supprimer la réservation ?"
        message={`Êtes-vous sûr de vouloir supprimer la réservation de ${deletingBooking?.guestName} ?`}
        confirmText="Supprimer"
        isLoading={deleteBooking.isPending}
      />
    </div>
  );
};

export default Bookings;
