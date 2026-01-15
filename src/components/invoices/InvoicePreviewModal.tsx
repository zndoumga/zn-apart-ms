import React, { useState } from 'react';
import { Download, Mail, MessageCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Booking, Customer } from '../../types';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  pdfUrl: string;
  booking: Booking;
  customer?: Customer;
  onDownload: () => void;
  onSendEmail: (email: string) => Promise<void>;
  onSendWhatsApp: (phone: string) => void;
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoiceNumber,
  pdfUrl,
  booking,
  customer,
  onDownload,
  onSendEmail,
  onSendWhatsApp,
}) => {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  const customerEmail = customer?.email || booking.guestEmail || '';
  const customerPhone = customer?.phone || booking.guestPhone || '';

  const hasEmail = !!customerEmail;
  const hasPhone = !!customerPhone;

  const handleEmailClick = async () => {
    if (!customerEmail) return;
    
    setIsSendingEmail(true);
    setEmailError('');
    
    try {
      await onSendEmail(customerEmail);
    } catch (error) {
      setEmailError('Erreur lors de l\'envoi de l\'email');
      console.error('Error sending email:', error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleWhatsAppClick = () => {
    if (!customerPhone) return;
    onSendWhatsApp(customerPhone);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Aperçu - Facture ${invoiceNumber}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Preview iframe */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          <iframe
            src={pdfUrl}
            className="w-full h-[600px] border-0"
            title={`Facture ${invoiceNumber}`}
          />
        </div>

        {/* Error message */}
        {emailError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {emailError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-4"
          >
            Fermer
          </Button>
          
          <Button
            variant="primary"
            onClick={onDownload}
            leftIcon={<Download className="w-4 h-4" />}
            className="px-4"
          >
            Télécharger
          </Button>

          {hasEmail && (
            <Button
              variant="primary"
              onClick={handleEmailClick}
              isLoading={isSendingEmail}
              leftIcon={<Mail className="w-4 h-4" />}
              className="px-4"
            >
              Envoyer par email
            </Button>
          )}

          {hasPhone && (
            <Button
              variant="primary"
              onClick={handleWhatsAppClick}
              leftIcon={<MessageCircle className="w-4 h-4" />}
              className="px-4 bg-green-600 hover:bg-green-700"
            >
              Envoyer par WhatsApp
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default InvoicePreviewModal;

