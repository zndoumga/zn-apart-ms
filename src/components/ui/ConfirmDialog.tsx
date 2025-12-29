import React from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
  isLoading = false,
}) => {
  const icons = {
    danger: <Trash2 className="w-6 h-6 text-danger-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-warning-600" />,
    info: <Info className="w-6 h-6 text-primary-600" />,
  };

  const backgrounds = {
    danger: 'bg-danger-100',
    warning: 'bg-warning-100',
    info: 'bg-primary-100',
  };

  const buttonVariants = {
    danger: 'danger',
    warning: 'warning',
    info: 'primary',
  } as const;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-12 h-12 rounded-full ${backgrounds[variant]} flex items-center justify-center mb-4`}
        >
          {icons[variant]}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariants[variant]}
            onClick={onConfirm}
            className="flex-1"
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;

