import React, { useState } from 'react';
import { 
  Home, 
  MapPin, 
  Bed, 
  Users, 
  DollarSign,
  Building2,
  Pencil,
  Trash2,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ImageLightbox from '../ui/ImageLightbox';
import type { Property, PropertyStatus } from '../../types';
import { useCurrency } from '../../store/useAppStore';

interface PropertyDetailsModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}

const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  property,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isAdmin,
}) => {
  const { formatAmount } = useCurrency();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!property) return null;

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleNext = () => {
    if (property.photos && property.photos.length > 0) {
      setLightboxIndex((prev) => (prev + 1) % property.photos.length);
    }
  };

  const handlePrevious = () => {
    if (property.photos && property.photos.length > 0) {
      setLightboxIndex((prev) => (prev - 1 + property.photos.length) % property.photos.length);
    }
  };

  const getStatusBadge = (status: PropertyStatus) => {
    const variants: Record<PropertyStatus, 'success' | 'gray' | 'warning'> = {
      active: 'success',
      inactive: 'gray',
      maintenance: 'warning',
    };
    const labels: Record<PropertyStatus, string> = {
      active: 'Actif',
      inactive: 'Inactif',
      maintenance: 'Maintenance',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const totalInvestment = (property.purchasePriceEUR || 0) + 
    (property.travauxEUR || 0) + 
    (property.meublesEUR || 0) + 
    (property.equipementEUR || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      footer={
        <div className="flex gap-3 justify-end pt-4 border-t">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={onDelete}
              className="text-danger-600 border-danger-300 hover:bg-danger-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          )}
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
      }
    >
      <div className="space-y-6">
        {/* Header with name and status */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{property.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{property.address}</span>
            </div>
          </div>
          {getStatusBadge(property.status)}
        </div>

        {/* Photo Gallery */}
        {property.photos && property.photos.length > 0 ? (
          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {property.photos.map((photo, index) => (
                <div 
                  key={index} 
                  className="relative aspect-video overflow-hidden rounded-lg cursor-pointer group"
                  onClick={() => handleImageClick(index)}
                >
                  <img
                    src={photo}
                    alt={`${property.name} - Photo ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-16 h-16 text-gray-300" />
            <span className="ml-3 text-gray-400">Aucune photo</span>
          </div>
        )}

        {/* Image Lightbox */}
        {property.photos && property.photos.length > 0 && (
          <ImageLightbox
            images={property.photos}
            currentIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )}

        {/* Description */}
        {property.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{property.description}</p>
          </div>
        )}

        {/* Property Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Bed className="w-4 h-4" />
              <span className="text-xs font-medium">Chambres</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{property.bedrooms}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Home className="w-4 h-4" />
              <span className="text-xs font-medium">Salles de bain</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{property.bathrooms}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Invités max</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{property.maxGuests}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Prix/nuit</span>
            </div>
            <p className="text-lg font-bold text-primary-600">
              {formatAmount(property.basePriceEUR, property.basePriceFCFA)}
            </p>
          </div>
        </div>

        {/* Investment Information */}
        {(property.purchasePriceEUR || property.travauxEUR || property.meublesEUR || property.equipementEUR) && totalInvestment > 0 ? (
          <div className="border-t pt-4">
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Total investissement</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatAmount(totalInvestment, totalInvestment * 656)}
              </p>
            </div>
            <div className="space-y-1.5 text-xs text-gray-500">
              {property.purchasePriceEUR && property.purchasePriceEUR > 0 && (
                <div className="flex justify-between items-center">
                  <span>Prix d'achat</span>
                  <span>
                    {formatAmount(property.purchasePriceEUR, property.purchasePriceFCFA || 0)}
                  </span>
                </div>
              )}
              {property.travauxEUR && property.travauxEUR > 0 && (
                <div className="flex justify-between items-center">
                  <span>Travaux</span>
                  <span>
                    {formatAmount(property.travauxEUR, property.travauxFCFA || 0)}
                  </span>
                </div>
              )}
              {property.meublesEUR && property.meublesEUR > 0 && (
                <div className="flex justify-between items-center">
                  <span>Meubles</span>
                  <span>
                    {formatAmount(property.meublesEUR, property.meublesFCFA || 0)}
                  </span>
                </div>
              )}
              {property.equipementEUR && property.equipementEUR > 0 && (
                <div className="flex justify-between items-center">
                  <span>Équipement</span>
                  <span>
                    {formatAmount(property.equipementEUR, property.equipementFCFA || 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border-t pt-4">
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Total investissement</p>
              <p className="text-2xl font-bold text-gray-400">
                {formatAmount(0, 0)}
              </p>
            </div>
            <p className="text-xs text-gray-400 italic">Aucun investissement enregistré</p>
          </div>
        )}

        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Équipements</h3>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity, index) => (
                <Badge key={index} variant="gray" className="text-xs">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PropertyDetailsModal;

