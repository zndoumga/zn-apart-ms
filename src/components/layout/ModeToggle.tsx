import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Shield, TrendingUp, User, ArrowLeft } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useMode } from '../../store/useAppStore';
import { useSettings } from '../../hooks/useSettings';

interface ModeToggleProps {
  isOpen: boolean;
  onClose: () => void;
  blocking?: boolean; // If true, modal cannot be closed without authentication
}

type SelectedMode = 'admin' | 'investor' | 'staff' | null;

const ModeToggle: React.FC<ModeToggleProps> = ({ isOpen, onClose, blocking = false }) => {
  const [selectedMode, setSelectedMode] = useState<SelectedMode>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { switchToAdmin, switchToInvestor, switchToStaff } = useMode();
  const { data: settings } = useSettings();
  const navigate = useNavigate();

  // Get passwords from settings, fallback to defaults if not loaded yet
  const ADMIN_PASSWORD = settings?.adminPasswordHash || 'admin123';
  const INVESTOR_PASSWORD = settings?.investorPasswordHash || 'invest-2025';
  const STAFF_PASSWORD = settings?.staffPasswordHash || 'Bins2026';

  useEffect(() => {
    if (isOpen) {
      setSelectedMode(null);
      setPassword('');
      setError('');
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleModeSelect = (mode: SelectedMode) => {
    setSelectedMode(mode);
    setPassword('');
    setError('');
    setShowPassword(false);
  };

  const handleBack = () => {
    setSelectedMode(null);
    setPassword('');
    setError('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 300));

    let success = false;
    
    if (selectedMode === 'admin') {
      success = switchToAdmin(password, ADMIN_PASSWORD);
    } else if (selectedMode === 'investor') {
      success = switchToInvestor(password, INVESTOR_PASSWORD);
    } else if (selectedMode === 'staff') {
      success = switchToStaff(password, STAFF_PASSWORD);
    }
    
    if (success) {
      // Mode is now persisted and initialized - no need for password next time
      onClose();
      navigate('/dashboard');
    } else {
      setError('Mot de passe incorrect');
    }

    setIsLoading(false);
  };

  const getModeInfo = () => {
    switch (selectedMode) {
      case 'admin':
        return {
          icon: Shield,
          title: 'Mode Administrateur',
          description: 'Accès complet',
          color: 'primary',
          bgColor: 'bg-primary-100',
          iconColor: 'text-primary-600',
        };
      case 'investor':
        return {
          icon: TrendingUp,
          title: 'Mode Investisseur',
          description: 'Lecture seule',
          color: 'amber',
          bgColor: 'bg-amber-100',
          iconColor: 'text-amber-700',
        };
      case 'staff':
        return {
          icon: User,
          title: 'Mode Staff',
          description: 'Accès limité',
          color: 'emerald',
          bgColor: 'bg-emerald-100',
          iconColor: 'text-emerald-700',
        };
      default:
        return null;
    }
  };

  const modeInfo = getModeInfo();
  const ModeIcon = modeInfo?.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedMode ? 'Entrer le mot de passe' : blocking ? 'Sélectionner un mode d\'accès' : 'Changer de mode'}
      size="sm"
      blocking={blocking}
      showCloseButton={!blocking}
    >
      {!selectedMode ? (
        // Mode selection view
        <div className="space-y-3">
          {/* Admin Option */}
          <button
            onClick={() => handleModeSelect('admin')}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary-300 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">Admin</h3>
            </div>
          </button>

          {/* Investor Option - Highlighted */}
          <button
            onClick={() => handleModeSelect('investor')}
            className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 ring-1 ring-amber-300">
              <TrendingUp className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">Investisseur</h3>
            </div>
          </button>

          {/* Staff Option - Highlighted */}
          <button
            onClick={() => handleModeSelect('staff')}
            className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 ring-1 ring-emerald-300">
              <User className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">Staff</h3>
            </div>
          </button>

          {!blocking && (
            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="w-full text-sm py-2"
                size="sm"
              >
                Annuler
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Password entry view
        <div className="space-y-4">
          {/* Mode header */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
            {ModeIcon && (
              <div className={`w-10 h-10 rounded-lg ${modeInfo.bgColor} flex items-center justify-center flex-shrink-0`}>
                <ModeIcon className={`w-5 h-5 ${modeInfo.iconColor}`} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">{modeInfo?.title}</h3>
              <p className="text-xs text-gray-500">{modeInfo?.description}</p>
            </div>
          </div>

          {/* Password form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label=""
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Entrez le mot de passe"
              error={error}
              className="text-sm"
              autoFocus
              leftIcon={<Lock className="w-3.5 h-3.5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              }
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
                className="flex-1 text-sm py-2"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Retour
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className={`flex-1 text-sm py-2 ${
                  selectedMode === 'investor'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : selectedMode === 'staff'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : ''
                }`}
                size="sm"
              >
                Accéder
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
};

export default ModeToggle;
