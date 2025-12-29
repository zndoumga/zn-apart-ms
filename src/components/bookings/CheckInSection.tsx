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

const COUNTRY_CODES = [
  { value: '+237', label: '+237 (CM)', country: 'CM' },
  { value: '+33', label: '+33 (FR)', country: 'FR' },
  { value: '+1', label: '+1 (US/CA)', country: 'US' },
  { value: '+44', label: '+44 (GB)', country: 'GB' },
  { value: '+49', label: '+49 (DE)', country: 'DE' },
  { value: '+32', label: '+32 (BE)', country: 'BE' },
  { value: '+41', label: '+41 (CH)', country: 'CH' },
  { value: '+221', label: '+221 (SN)', country: 'SN' },
  { value: '+225', label: '+225 (CI)', country: 'CI' },
  { value: '+241', label: '+241 (GA)', country: 'GA' },
  { value: '+242', label: '+242 (CG)', country: 'CG' },
  { value: '+243', label: '+243 (CD)', country: 'CD' },
  { value: '+234', label: '+234 (NG)', country: 'NG' },
  { value: '+233', label: '+233 (GH)', country: 'GH' },
  { value: '+212', label: '+212 (MA)', country: 'MA' },
  { value: '+213', label: '+213 (DZ)', country: 'DZ' },
  { value: '+216', label: '+216 (TN)', country: 'TN' },
  { value: '+20', label: '+20 (EG)', country: 'EG' },
  { value: '+27', label: '+27 (ZA)', country: 'ZA' },
  { value: '+254', label: '+254 (KE)', country: 'KE' },
  { value: '+250', label: '+250 (RW)', country: 'RW' },
  { value: '+256', label: '+256 (UG)', country: 'UG' },
  { value: '+255', label: '+255 (TZ)', country: 'TZ' },
  { value: '+251', label: '+251 (ET)', country: 'ET' },
  { value: '+7', label: '+7 (RU)', country: 'RU' },
  { value: '+86', label: '+86 (CN)', country: 'CN' },
  { value: '+91', label: '+91 (IN)', country: 'IN' },
  { value: '+81', label: '+81 (JP)', country: 'JP' },
  { value: '+82', label: '+82 (KR)', country: 'KR' },
  { value: '+61', label: '+61 (AU)', country: 'AU' },
  { value: '+55', label: '+55 (BR)', country: 'BR' },
  { value: '+52', label: '+52 (MX)', country: 'MX' },
  { value: '+39', label: '+39 (IT)', country: 'IT' },
  { value: '+34', label: '+34 (ES)', country: 'ES' },
  { value: '+31', label: '+31 (NL)', country: 'NL' },
  { value: '+46', label: '+46 (SE)', country: 'SE' },
  { value: '+47', label: '+47 (NO)', country: 'NO' },
  { value: '+45', label: '+45 (DK)', country: 'DK' },
  { value: '+358', label: '+358 (FI)', country: 'FI' },
  { value: '+351', label: '+351 (PT)', country: 'PT' },
  { value: '+30', label: '+30 (GR)', country: 'GR' },
  { value: '+48', label: '+48 (PL)', country: 'PL' },
  { value: '+40', label: '+40 (RO)', country: 'RO' },
  { value: '+420', label: '+420 (CZ)', country: 'CZ' },
  { value: '+36', label: '+36 (HU)', country: 'HU' },
  { value: '+353', label: '+353 (IE)', country: 'IE' },
  { value: '+351', label: '+351 (PT)', country: 'PT' },
  { value: '+380', label: '+380 (UA)', country: 'UA' },
  { value: '+90', label: '+90 (TR)', country: 'TR' },
  { value: '+971', label: '+971 (AE)', country: 'AE' },
  { value: '+966', label: '+966 (SA)', country: 'SA' },
  { value: '+974', label: '+974 (QA)', country: 'QA' },
  { value: '+965', label: '+965 (KW)', country: 'KW' },
  { value: '+973', label: '+973 (BH)', country: 'BH' },
  { value: '+968', label: '+968 (OM)', country: 'OM' },
  { value: '+961', label: '+961 (LB)', country: 'LB' },
  { value: '+962', label: '+962 (JO)', country: 'JO' },
  { value: '+972', label: '+972 (IL)', country: 'IL' },
  { value: '+60', label: '+60 (MY)', country: 'MY' },
  { value: '+65', label: '+65 (SG)', country: 'SG' },
  { value: '+66', label: '+66 (TH)', country: 'TH' },
  { value: '+84', label: '+84 (VN)', country: 'VN' },
  { value: '+62', label: '+62 (ID)', country: 'ID' },
  { value: '+63', label: '+63 (PH)', country: 'PH' },
  { value: '+64', label: '+64 (NZ)', country: 'NZ' },
  { value: '+27', label: '+27 (ZA)', country: 'ZA' },
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
  const [countryCode, setCountryCode] = useState<string>('+237');
  
  // Extract country code from existing phone number if present
  useEffect(() => {
    const existingPhone = customer?.phone || booking.guestPhone || '';
    if (existingPhone) {
      // Try to find matching country code
      const matchedCode = COUNTRY_CODES.find(code => existingPhone.startsWith(code.value));
      if (matchedCode) {
        setCountryCode(matchedCode.value);
      }
    } else if (customer?.nationality) {
      // Try to match country code based on nationality
      const matchedCode = COUNTRY_CODES.find(code => code.country === customer.nationality);
      if (matchedCode) {
        setCountryCode(matchedCode.value);
      }
    }
  }, [customer, booking.guestPhone]);

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
  const [idFileFront, setIdFileFront] = useState<File | null>(null);
  const [idFileBack, setIdFileBack] = useState<File | null>(null);
  const [idPreviewFront, setIdPreviewFront] = useState<string | null>(customer?.idDocumentUrl || null);
  const [idPreviewBack, setIdPreviewBack] = useState<string | null>(customer?.idDocumentBackUrl || null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(customer?.signatureUrl || null);
  
  const fileInputFrontRef = useRef<HTMLInputElement>(null);
  const fileInputBackRef = useRef<HTMLInputElement>(null);
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
    
    // Reset country code
    const existingPhone = customer?.phone || booking.guestPhone || '';
    if (existingPhone) {
      const matchedCode = COUNTRY_CODES.find(code => existingPhone.startsWith(code.value));
      if (matchedCode) {
        setCountryCode(matchedCode.value);
      }
    } else {
      setCountryCode('+237');
    }
    setIdFileFront(null);
    setIdFileBack(null);
    setIdPreviewFront(customer?.idDocumentUrl || null);
    setIdPreviewBack(customer?.idDocumentBackUrl || null);
    setSignatureDataUrl(customer?.signatureUrl || null);
  }, [booking.id]);

  const handleInputChange = (field: keyof CheckInFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      if (side === 'front') {
        setIdFileFront(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setIdPreviewFront(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setIdFileBack(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setIdPreviewBack(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async () => {
    // Combine country code with phone number
    const phoneWithCode = formData.phone 
      ? (formData.phone.startsWith('+') ? formData.phone : `${countryCode}${formData.phone}`)
      : '';

    await processCheckIn.mutateAsync({
      checkInData: {
        ...formData,
        phone: phoneWithCode,
      },
      idFileFront,
      idFileBack,
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {customer.idDocumentUrl && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Pièce d'identité (Recto)</p>
                <img
                  src={customer.idDocumentUrl}
                  alt="ID Document Front"
                  className="max-h-32 rounded-lg border border-gray-200"
                />
              </div>
            )}
            {customer.idDocumentBackUrl && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Pièce d'identité (Verso)</p>
                <img
                  src={customer.idDocumentBackUrl}
                  alt="ID Document Back"
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
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <div className="flex gap-2">
              <div className="w-32 flex-shrink-0">
                <Select
                  options={COUNTRY_CODES}
                  value={countryCode}
                  onChange={(value) => {
                    setCountryCode(value);
                    // If phone already has a country code, remove it and update
                    if (formData.phone && formData.phone.startsWith('+')) {
                      const phoneWithoutCode = formData.phone.replace(/^\+\d{1,4}\s?/, '');
                      handleInputChange('phone', phoneWithoutCode);
                    }
                  }}
                  className="text-sm"
                />
              </div>
              <div className="flex-1">
                <Input
                  value={formData.phone.startsWith('+') 
                    ? formData.phone.replace(/^\+\d{1,4}\s?/, '') 
                    : formData.phone}
                  onChange={(e) => {
                    // Remove any existing country code from input
                    const phoneValue = e.target.value.replace(/^\+\d{1,4}\s?/, '');
                    handleInputChange('phone', phoneValue);
                  }}
                  leftIcon={<Phone className="w-4 h-4" />}
                  placeholder="6 12 34 56 78"
                />
              </div>
            </div>
          </div>
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
            value={formData.nationality || ''}
            onChange={(value) => {
              console.log('Nationality changed:', value);
              handleInputChange('nationality', value);
            }}
            placeholder="Sélectionner une nationalité"
          />
          <Select
            label="Pays de résidence"
            options={COUNTRIES}
            value={formData.countryOfResidence || ''}
            onChange={(value) => handleInputChange('countryOfResidence', value)}
            placeholder="Sélectionner un pays"
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
            value={formData.idType || 'passport'}
            onChange={(value) => {
              console.log('ID Type changed:', value);
              handleInputChange('idType', value);
            }}
          />
          <Input
            label="Numéro de pièce d'identité"
            value={formData.idNumber}
            onChange={(e) => handleInputChange('idNumber', e.target.value)}
            leftIcon={<CreditCard className="w-4 h-4" />}
          />
        </div>

        {/* ID Document Upload - Front and Back */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos de la pièce d'identité
          </label>
          
          {/* Front of ID */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Recto (Face avant)</p>
            {idPreviewFront ? (
              <div className="relative inline-block">
                <img
                  src={idPreviewFront}
                  alt="ID Document Front"
                  className="max-h-40 rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIdFileFront(null);
                    setIdPreviewFront(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputFrontRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 cursor-pointer"
              >
                <Image className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-xs text-gray-600">
                  Cliquez pour télécharger le recto
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG ou PDF (max 5MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputFrontRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleIdFileChange(e, 'front')}
              className="hidden"
            />
          </div>

          {/* Back of ID */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Verso (Face arrière)</p>
            {idPreviewBack ? (
              <div className="relative inline-block">
                <img
                  src={idPreviewBack}
                  alt="ID Document Back"
                  className="max-h-40 rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIdFileBack(null);
                    setIdPreviewBack(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputBackRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 cursor-pointer"
              >
                <Image className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-xs text-gray-600">
                  Cliquez pour télécharger le verso
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG ou PDF (max 5MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputBackRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleIdFileChange(e, 'back')}
              className="hidden"
            />
          </div>
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
            onClick={() => {
              handleSubmit();
            }}
            disabled={processCheckIn.isPending}
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
