import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useMode } from '../../store/useAppStore';

interface ModeToggleProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { switchToAdmin } = useMode();
  const navigate = useNavigate();

  // Default password - in production, this would come from Firestore settings
  const ADMIN_PASSWORD = 'admin123';

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate async check
    await new Promise((resolve) => setTimeout(resolve, 500));

    const success = switchToAdmin(password, ADMIN_PASSWORD);
    
    if (success) {
      onClose();
      navigate('/dashboard');
    } else {
      setError('Mot de passe incorrect');
    }

    setIsLoading(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Accès Administrateur"
      description="Entrez le mot de passe pour accéder au mode admin"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <Input
          label="Mot de passe Admin"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="Entrez le mot de passe"
          error={error}
          autoFocus
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
        />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="flex-1"
          >
            Déverrouiller
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500">
          Le mode admin donne accès à toutes les fonctionnalités de gestion.
        </p>
      </form>
    </Modal>
  );
};

export default ModeToggle;

