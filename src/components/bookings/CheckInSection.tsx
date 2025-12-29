import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Calendar,
  CreditCard,
  CheckCircle,
  FileText,
  Pen,
  X,
  Image,
  ChevronDown,
  ChevronUp,
  PartyPopper,
  ClipboardCheck,
  Pencil,
  ClipboardList,
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';
import SignatureCanvas from '../ui/SignatureCanvas';
import { useProcessCheckIn } from '../../hooks/useCheckIn';
import type { Booking, CheckInFormData, Customer } from '../../types';
import { ID_TYPES } from '../../types';

interface CheckInSectionProps {
  booking: Booking;
  customer?: Customer | null;
  onCheckInComplete: () => void;
  showFormDirectly?: boolean;
}

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

const getIdTypeLabel = (type: string) => {
  return ID_TYPES.find(t => t.value === type)?.label || type;
};

const CheckInSection: React.FC<CheckInSectionProps> = ({
  booking,
  customer,
  onCheckInComplete,
  showFormDirectly = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(showFormDirectly);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState<CheckInFormData>({
    guestName: customer?.name || booking.guestName,
    email: customer?.email || booking.guestEmail || '',
    phone: customer?.phone || booking.guestPhone || '',
    nationality: customer?.nationality || '',
    countryOfResidence: customer?.countryOfResidence || '',
    address: customer?.address || '',
    dateOfBirth: customer?.dateOfBirth 
      ? new Date(customer.dateOfBirth).toISOString().split('T')[0] 
      : '',
    idType: customer?.idType || 'passport',
    idNumber: customer?.idNumber || '',
    checkInNotes: booking.checkInNotes || '',
  });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(customer?.idDocumentUrl || null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(customer?.signatureUrl || null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processCheckIn = useProcessCheckIn(booking.id);

  // Reset state when booking changes
  useEffect(() => {
    setShowDetails(false);
    setIsEditing(false);
    setShowForm(false);
    setShowSuccess(false);
    setFormData({
      guestName: customer?.name || booking.guestName,
      email: customer?.email || booking.guestEmail || '',
      phone: customer?.phone || booking.guestPhone || '',
      nationality: customer?.nationality || '',
      countryOfResidence: customer?.countryOfResidence || '',
      address: customer?.address || '',
      dateOfBirth: customer?.dateOfBirth 
        ? new Date(customer.dateOfBirth).toISOString().split('T')[0] 
        : '',
      idType: customer?.idType || 'passport',
      idNumber: customer?.idNumber || '',
      checkInNotes: booking.checkInNotes || '',
    });
    setIdFile(null);
    setIdPreview(customer?.idDocumentUrl || null);
    setSignatureDataUrl(customer?.signatureUrl || null);
  }, [booking.id]);

  const handleInputChange = (field: keyof CheckInFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.guestName || !formData.nationality || !formData.idType || !formData.idNumber) {
      return;
    }

    await processCheckIn.mutateAsync({
      checkInData: formData,
      idFile,
      signatureDataUrl,
    });

    setShowSuccess(true);
    setIsEditing(false);
    
    // Hide success message and notify parent after 2 seconds
    setTimeout(() => {
      setShowSuccess(false);
      onCheckInComplete();
    }, 2500);
  };

  const isCheckedIn = booking.status === 'checked_in' || booking.status === 'checked_out';
  const hasCustomerData = !!customer;

  // Show success animation
  if (showSuccess) {
    return (
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-8 text-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <PartyPopper className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Check-in réussi !</h3>
            <p className="text-emerald-100">Le client a été enregistré avec succès</p>
          </div>
        </div>
      </div>
    );
  }

  // For confirmed bookings - show button first
  if (!isCheckedIn && !showForm) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-blue-800">Effectuer le check-in</h3>
              <p className="text-sm text-blue-600">Enregistrer les informations du client</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-blue-500 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  // If already checked in, show compact summary (collapsed state)
  if (isCheckedIn && hasCustomerData && !showDetails) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-800">Check-in effectué</h3>
              <p className="text-sm text-emerald-600">{customer.name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-sm font-medium"
          >
            Voir les détails
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        
        {/* Quick info row */}
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-emerald-200">
          {customer.nationality && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-700">
              <Globe className="w-4 h-4" />
              <span>{getCountryLabel(customer.nationality)}</span>
            </div>
          )}
          {customer.idNumber && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CreditCard className="w-4 h-4" />
              <span>{customer.idNumber}</span>
            </div>
          )}
          {customer.signatureUrl && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-700">
              <Pen className="w-4 h-4" />
              <span>Signature enregistrée</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If already checked in and showing details - show read-only view
  if (isCheckedIn && hasCustomerData && showDetails && !isEditing) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-emerald-800">Informations du check-in</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-emerald-700"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Modifier
            </Button>
            <button
              onClick={() => setShowDetails(false)}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-sm"
            >
              Réduire
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Read-only details grid */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Nom complet</p>
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                {customer.name}
              </p>
            </div>
            {customer.email && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {customer.email}
                </p>
              </div>
            )}
            {customer.phone && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {customer.phone}
                </p>
              </div>
            )}
            {customer.dateOfBirth && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Date de naissance</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(customer.dateOfBirth).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
            {customer.nationality && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Nationalité</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  {getCountryLabel(customer.nationality)}
                </p>
              </div>
            )}
            {customer.countryOfResidence && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Pays de résidence</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  {getCountryLabel(customer.countryOfResidence)}
                </p>
              </div>
            )}
            {customer.address && (
              <div className="bg-white rounded-lg p-3 md:col-span-2">
                <p className="text-xs text-gray-500 mb-1">Adresse</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {customer.address}
                </p>
              </div>
            )}
            {customer.idType && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Type de pièce d'identité</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  {getIdTypeLabel(customer.idType)}
                </p>
              </div>
            )}
            {customer.idNumber && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Numéro de pièce d'identité</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  {customer.idNumber}
                </p>
              </div>
            )}
          </div>

          {/* ID Document and Signature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customer.idDocumentUrl && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Pièce d'identité</p>
                <img
                  src={customer.idDocumentUrl}
                  alt="ID Document"
                  className="max-h-32 rounded-lg border border-gray-200"
                />
              </div>
            )}
            {customer.signatureUrl && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Signature</p>
                <img
                  src={customer.signatureUrl}
                  alt="Signature"
                  className="max-h-24 rounded-lg border border-gray-200 bg-white"
                />
              </div>
            )}
          </div>

          {/* Apartment Condition Notes */}
          {booking.checkInNotes && (
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                État de l'appartement / Notes
              </p>
              <p className="text-gray-900 whitespace-pre-wrap">{booking.checkInNotes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Check-in form (for new check-ins or editing)
  return (
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {isEditing ? 'Modifier les informations' : 'Formulaire de check-in'}
        </h3>
        {(showForm || isEditing) && (
          <button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
              } else {
                setShowForm(false);
              }
            }}
            className="text-blue-700 hover:text-blue-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Nom complet"
            value={formData.guestName}
            onChange={(e) => handleInputChange('guestName', e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />
          <Input
            label="Téléphone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Date de naissance"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
        </div>

        {/* Location Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Nationalité"
            options={COUNTRIES}
            value={formData.nationality}
            onChange={(value) => handleInputChange('nationality', value)}
            required
          />
          <Select
            label="Pays de résidence"
            options={COUNTRIES}
            value={formData.countryOfResidence || ''}
            onChange={(value) => handleInputChange('countryOfResidence', value)}
          />
        </div>

        <Input
          label="Adresse"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          leftIcon={<MapPin className="w-4 h-4" />}
          placeholder="Adresse complète"
        />

        {/* ID Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Type de pièce d'identité"
            options={ID_TYPES}
            value={formData.idType}
            onChange={(value) => handleInputChange('idType', value)}
            required
          />
          <Input
            label="Numéro de pièce d'identité"
            value={formData.idNumber}
            onChange={(e) => handleInputChange('idNumber', e.target.value)}
            leftIcon={<CreditCard className="w-4 h-4" />}
            required
          />
        </div>

        {/* ID Document Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo de la pièce d'identité
          </label>
          {idPreview ? (
            <div className="relative inline-block">
              <img
                src={idPreview}
                alt="ID Document"
                className="max-h-40 rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => {
                  setIdFile(null);
                  setIdPreview(null);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 cursor-pointer"
            >
              <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                Cliquez pour télécharger la pièce d'identité
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG ou PDF (max 5MB)
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleIdFileChange}
            className="hidden"
          />
        </div>

        {/* Signature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Pen className="w-4 h-4" />
            Signature du client
          </label>
          <SignatureCanvas
            onSignatureChange={setSignatureDataUrl}
            initialSignature={signatureDataUrl || undefined}
          />
        </div>

        {/* Apartment Condition Notes */}
        <div>
          <TextArea
            label="État de l'appartement / Notes"
            value={formData.checkInNotes || ''}
            onChange={(e) => handleInputChange('checkInNotes', e.target.value)}
            placeholder="Notez l'état de l'appartement à l'arrivée du client. Signalez tout dommage existant ou autre remarque importante..."
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <ClipboardList className="w-3 h-3" />
            Ces notes seront conservées pour référence lors du check-out
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-blue-200">
          <button
            onClick={handleSubmit}
            disabled={
              !formData.guestName ||
              !formData.nationality ||
              !formData.idType ||
              !formData.idNumber ||
              processCheckIn.isPending
            }
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200 flex items-center gap-2"
          >
            {processCheckIn.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>{isEditing ? 'Mettre à jour' : 'Valider le check-in'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckInSection;
