import React, { useState } from 'react';
import { Save, Lock, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { useSettings, useUpdateSettings, useChangeAdminPassword, useChangeInvestorPassword, useChangeStaffPassword } from '../hooks/useSettings';
import { useToast } from '../store/useAppStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Settings: React.FC = () => {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const changeAdminPassword = useChangeAdminPassword();
  const changeInvestorPassword = useChangeInvestorPassword();
  const changeStaffPassword = useChangeStaffPassword();
  const { error } = useToast();

  const [showAdminPasswordForm, setShowAdminPasswordForm] = useState(false);
  const [showInvestorPasswordForm, setShowInvestorPasswordForm] = useState(false);
  const [showStaffPasswordForm, setShowStaffPasswordForm] = useState(false);

  const {
    register: registerSettings,
    handleSubmit: handleSettingsSubmit,
    formState: { isDirty: settingsDirty },
  } = useForm({
    values: settings
      ? {
          exchangeRate: settings.exchangeRate,
          lowBalanceThreshold: settings.lowBalanceThreshold,
        }
      : undefined,
  });

  const {
    register: registerAdminPassword,
    handleSubmit: handleAdminPasswordSubmit,
    reset: resetAdminPassword,
    watch: watchAdminPassword,
    formState: { errors: adminPasswordErrors },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const {
    register: registerInvestorPassword,
    handleSubmit: handleInvestorPasswordSubmit,
    reset: resetInvestorPassword,
    watch: watchInvestorPassword,
    formState: { errors: investorPasswordErrors },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const {
    register: registerStaffPassword,
    handleSubmit: handleStaffPasswordSubmit,
    reset: resetStaffPassword,
    watch: watchStaffPassword,
    formState: { errors: staffPasswordErrors },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newAdminPassword = watchAdminPassword('newPassword');
  const newInvestorPassword = watchInvestorPassword('newPassword');
  const newStaffPassword = watchStaffPassword('newPassword');

  const handleSaveSettings = async (data: {
    exchangeRate: number;
    lowBalanceThreshold: number;
  }) => {
    await updateSettings.mutateAsync(data);
  };

  const handleChangeAdminPassword = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (data.newPassword !== data.confirmPassword) {
      error('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    const result = await changeAdminPassword.mutateAsync({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    if (result) {
      setShowAdminPasswordForm(false);
      resetAdminPassword();
    }
  };

  const handleChangeInvestorPassword = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (data.newPassword !== data.confirmPassword) {
      error('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    const result = await changeInvestorPassword.mutateAsync({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    if (result) {
      setShowInvestorPasswordForm(false);
      resetInvestorPassword();
    }
  };

  const handleChangeStaffPassword = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (data.newPassword !== data.confirmPassword) {
      error('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    const result = await changeStaffPassword.mutateAsync({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    if (result) {
      setShowStaffPasswordForm(false);
      resetStaffPassword();
    }
  };

  if (isLoading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600 mt-1">Configurez l'application</p>
      </div>

      {/* Currency settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Devises</h2>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSettingsSubmit(handleSaveSettings)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Taux de change (1 EUR =)"
                type="number"
                step={0.001}
                helperText="Taux EUR vers FCFA"
                {...registerSettings('exchangeRate', { valueAsNumber: true })}
              />
              <Input
                label="Seuil alerte solde bas (EUR)"
                type="number"
                step={1}
                helperText="Alerte si le solde Mobile Money descend en dessous"
                {...registerSettings('lowBalanceThreshold', { valueAsNumber: true })}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!settingsDirty}
                isLoading={updateSettings.isPending}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Enregistrer
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Password settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Sécurité</h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Admin Password */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900">Mot de passe Admin</h3>
                <p className="text-sm text-gray-600">
                  Protège l'accès au mode administrateur
                </p>
              </div>
              {!showAdminPasswordForm && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAdminPasswordForm(true)}
                  leftIcon={<Lock className="w-4 h-4" />}
                >
                  Modifier
                </Button>
              )}
            </div>
            {showAdminPasswordForm && (
              <form onSubmit={handleAdminPasswordSubmit(handleChangeAdminPassword)} className="space-y-4">
                <Input
                  label="Mot de passe actuel"
                  type="password"
                  error={adminPasswordErrors.currentPassword?.message}
                  {...registerAdminPassword('currentPassword', {
                    required: 'Mot de passe actuel requis',
                  })}
                />
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  error={adminPasswordErrors.newPassword?.message}
                  {...registerAdminPassword('newPassword', {
                    required: 'Nouveau mot de passe requis',
                    minLength: {
                      value: 4,
                      message: 'Minimum 4 caractères',
                    },
                  })}
                />
                <Input
                  label="Confirmer le mot de passe"
                  type="password"
                  error={adminPasswordErrors.confirmPassword?.message}
                  {...registerAdminPassword('confirmPassword', {
                    required: 'Confirmation requise',
                    validate: (value) =>
                      value === newAdminPassword || 'Les mots de passe ne correspondent pas',
                  })}
                />

                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowAdminPasswordForm(false);
                      resetAdminPassword();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" isLoading={changeAdminPassword.isPending}>
                    Changer le mot de passe
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Investor Password */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900">Mot de passe Investisseur</h3>
                <p className="text-sm text-gray-600">
                  Protège l'accès au mode investisseur (lecture seule)
                </p>
              </div>
              {!showInvestorPasswordForm && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowInvestorPasswordForm(true)}
                  leftIcon={<Lock className="w-4 h-4" />}
                >
                  Modifier
                </Button>
              )}
            </div>
            {showInvestorPasswordForm && (
              <form onSubmit={handleInvestorPasswordSubmit(handleChangeInvestorPassword)} className="space-y-4">
                <Input
                  label="Mot de passe actuel"
                  type="password"
                  error={investorPasswordErrors.currentPassword?.message}
                  {...registerInvestorPassword('currentPassword', {
                    required: 'Mot de passe actuel requis',
                  })}
                />
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  error={investorPasswordErrors.newPassword?.message}
                  {...registerInvestorPassword('newPassword', {
                    required: 'Nouveau mot de passe requis',
                    minLength: {
                      value: 4,
                      message: 'Minimum 4 caractères',
                    },
                  })}
                />
                <Input
                  label="Confirmer le mot de passe"
                  type="password"
                  error={investorPasswordErrors.confirmPassword?.message}
                  {...registerInvestorPassword('confirmPassword', {
                    required: 'Confirmation requise',
                    validate: (value) =>
                      value === newInvestorPassword || 'Les mots de passe ne correspondent pas',
                  })}
                />

                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowInvestorPasswordForm(false);
                      resetInvestorPassword();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" isLoading={changeInvestorPassword.isPending}>
                    Changer le mot de passe
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Staff Password */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900">Mot de passe Staff</h3>
                <p className="text-sm text-gray-600">
                  Protège l'accès au mode staff
                </p>
              </div>
              {!showStaffPasswordForm && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowStaffPasswordForm(true)}
                  leftIcon={<Lock className="w-4 h-4" />}
                >
                  Modifier
                </Button>
              )}
            </div>
            {showStaffPasswordForm && (
              <form onSubmit={handleStaffPasswordSubmit(handleChangeStaffPassword)} className="space-y-4">
                <Input
                  label="Mot de passe actuel"
                  type="password"
                  error={staffPasswordErrors.currentPassword?.message}
                  {...registerStaffPassword('currentPassword', {
                    required: 'Mot de passe actuel requis',
                  })}
                />
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  error={staffPasswordErrors.newPassword?.message}
                  {...registerStaffPassword('newPassword', {
                    required: 'Nouveau mot de passe requis',
                    minLength: {
                      value: 4,
                      message: 'Minimum 4 caractères',
                    },
                  })}
                />
                <Input
                  label="Confirmer le mot de passe"
                  type="password"
                  error={staffPasswordErrors.confirmPassword?.message}
                  {...registerStaffPassword('confirmPassword', {
                    required: 'Confirmation requise',
                    validate: (value) =>
                      value === newStaffPassword || 'Les mots de passe ne correspondent pas',
                  })}
                />

                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowStaffPasswordForm(false);
                      resetStaffPassword();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" isLoading={changeStaffPassword.isPending}>
                    Changer le mot de passe
                  </Button>
                </div>
              </form>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Info card */}
      <Card className="bg-primary-50 border-primary-200">
        <CardBody>
          <h3 className="font-medium text-primary-900 mb-2">
            À propos de ZN Apart MS
          </h3>
          <p className="text-sm text-primary-700">
            Application de gestion d'appartements Airbnb. Développée pour la gestion
            à distance d'appartements au Cameroun depuis la France.
          </p>
          <p className="text-xs text-primary-600 mt-2">Version 1.0.0</p>
        </CardBody>
      </Card>
    </div>
  );
};

export default Settings;

