import React from 'react';
import { 
  Calendar, 
  FileText, 
  Home, 
  Tag,
  Receipt,
  Pencil,
  Trash2,
  ExternalLink,
  Store,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { supabase, BUCKETS } from '../../services/supabase';
import type { Expense, ExpenseCategory, Property } from '../../types';
import { formatDate } from '../../utils/dates';
import { EXPENSE_CATEGORIES } from '../../types';

interface ExpenseDetailsModalProps {
  expense: Expense | null;
  property?: Property;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
  formatAmount: (eur: number, fcfa: number) => string;
}

const ExpenseDetailsModal: React.FC<ExpenseDetailsModalProps> = ({
  expense,
  property,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isAdmin,
  formatAmount,
}) => {
  if (!expense) return null;

  const [receiptUrl, setReceiptUrl] = React.useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = React.useState(false);

  // Helper to extract file path from URL
  const extractFilePath = (url: string): string | null => {
    try {
      // Extract path from standard Supabase URL format
      const publicPathMatch = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+?)(?:\?|$)/);
      if (publicPathMatch && publicPathMatch[1]) {
        return publicPathMatch[1];
      }
      
      // Try to extract from bucket name pattern
      const bucketPattern = new RegExp(`/${BUCKETS.EXPENSE_RECEIPTS}/(.+?)(?:\\?|$)`);
      const match = url.match(bucketPattern);
      if (match && match[1]) {
        return match[1];
      }
      
      // If it's not a full URL, assume it's just the path
      if (!url.startsWith('http')) {
        return url.split('?')[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting file path:', error);
      return null;
    }
  };

  // Load receipt URL with fallback to signed URL
  React.useEffect(() => {
    if (!expense.receiptUrl) {
      setReceiptUrl(null);
      return;
    }

    const loadReceiptUrl = async () => {
      setIsLoadingUrl(true);
      try {
        // First, try to use the stored URL as-is
        const filePath = extractFilePath(expense.receiptUrl);
        
        if (filePath) {
          // Try to get a signed URL as fallback (works even if bucket is not public)
          const { data: signedData, error: signedError } = await supabase.storage
            .from(BUCKETS.EXPENSE_RECEIPTS)
            .createSignedUrl(filePath, 3600); // 1 hour expiry
          
          if (!signedError && signedData) {
            setReceiptUrl(signedData.signedUrl);
          } else {
            // Fallback to public URL
            const { data: publicData } = supabase.storage
              .from(BUCKETS.EXPENSE_RECEIPTS)
              .getPublicUrl(filePath);
            setReceiptUrl(publicData.publicUrl);
          }
        } else {
          // If we can't extract path, use original URL
          setReceiptUrl(expense.receiptUrl);
        }
      } catch (error) {
        console.error('Error loading receipt URL:', error);
        setReceiptUrl(expense.receiptUrl); // Fallback to original
      } finally {
        setIsLoadingUrl(false);
      }
    };

    loadReceiptUrl();
  }, [expense.receiptUrl]);

  const getCategoryLabel = (category: ExpenseCategory) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getCategoryBadgeVariant = (category: ExpenseCategory): 'primary' | 'success' | 'warning' | 'danger' | 'gray' => {
    const variants: Partial<Record<ExpenseCategory, 'primary' | 'success' | 'warning' | 'danger' | 'gray'>> = {
      rent: 'danger',
      utilities: 'gray',
      canal_sat: 'primary',
      common_areas: 'warning',
      cleaning: 'primary',
      laundry: 'primary',
      consumables: 'success',
      supplies: 'success',
      maintenance: 'warning',
      wages: 'primary',
      taxes: 'danger',
    };
    return variants[category] || 'gray';
  };

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
      title="Détails de la dépense"
      size="md"
      footer={footerContent}
    >
      <div className="space-y-6">
        {/* Prominent Category Header */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6 border-2 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-primary-600 uppercase tracking-wide mb-2">
                Catégorie
              </p>
              <Badge variant={getCategoryBadgeVariant(expense.category)} size="md" className="text-base px-4 py-2">
                {getCategoryLabel(expense.category)}
              </Badge>
            </div>
            <Tag className="w-8 h-8 text-primary-400" />
          </div>
        </div>

        {/* Vendor - Always visible and prominent */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <Store className="w-4 h-4" />
            Fournisseur
          </h3>
          <p className="font-semibold text-lg text-gray-900">
            {expense.vendor || <span className="text-gray-400 italic">Non spécifié</span>}
          </p>
        </div>

        {/* Description */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Description
          </h3>
          <p className="font-medium text-gray-900">{expense.description}</p>
        </div>

        {/* Date & Property */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date effective
            </h3>
            <p className="font-medium text-gray-900">{formatDate(expense.date)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Enregistré le {formatDate(expense.createdAt)}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <Home className="w-4 h-4" />
              Propriété
            </h3>
            <p className="font-medium text-gray-900">
              {property?.name || (expense.propertyId ? 'Unknown' : 'Général')}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-danger-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-danger-600 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Montant
          </h3>
          <p className="text-2xl font-bold text-danger-700">
            -{formatAmount(expense.amountEUR, expense.amountFCFA)}
          </p>
        </div>

        {/* Receipt */}
        {expense.receiptUrl && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Reçu / Justificatif
            </h3>
            {isLoadingUrl ? (
              <div className="text-sm text-gray-500">Chargement...</div>
            ) : receiptUrl ? (
              <div className="space-y-3">
                {receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) && (
                  <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={receiptUrl}
                      alt="Receipt"
                      className="max-h-48 rounded-lg border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                      onError={(e) => {
                        // Hide image if it fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </a>
                )}
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ouvrir le fichier
                </a>
              </div>
            ) : (
              <div className="text-sm text-danger-600">Erreur lors du chargement du fichier</div>
            )}
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{expense.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExpenseDetailsModal;

