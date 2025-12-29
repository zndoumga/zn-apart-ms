import React, { useState } from 'react';
import { Save, Lock, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { useSettings, useUpdateSettings, useChangeAdminPassword } from '../hooks/useSettings';
import { useToast } from '../store/useAppStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Settings: React.FC = () => {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const changePassword = useChangeAdminPassword();
  const { error } = useToast();

  const [showPasswordForm, setShowPasswordForm] = useState(false);

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
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  const handleSaveSettings = async (data: {
    exchangeRate: number;
    lowBalanceThreshold: number;
  }) => {
    await updateSettings.mutateAsync(data);
  };

  const handleChangePassword = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (data.newPassword !== data.confirmPassword) {
      error('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    const result = await changePassword.mutateAsync({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    if (result) {
      setShowPasswordForm(false);
      resetPassword();
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
        <CardBody>
          {!showPasswordForm ? (
            <div>
              <p className="text-gray-600 mb-4">
                Le mot de passe admin protège l'accès au mode administrateur.
              </p>
              <Button
                variant="secondary"
                onClick={() => setShowPasswordForm(true)}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Changer le mot de passe
              </Button>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit(handleChangePassword)} className="space-y-4">
              <Input
                label="Mot de passe actuel"
                type="password"
                error={passwordErrors.currentPassword?.message}
                {...registerPassword('currentPassword', {
                  required: 'Mot de passe actuel requis',
                })}
              />
              <Input
                label="Nouveau mot de passe"
                type="password"
                error={passwordErrors.newPassword?.message}
                {...registerPassword('newPassword', {
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
                error={passwordErrors.confirmPassword?.message}
                {...registerPassword('confirmPassword', {
                  required: 'Confirmation requise',
                  validate: (value) =>
                    value === newPassword || 'Les mots de passe ne correspondent pas',
                })}
              />

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowPasswordForm(false);
                    resetPassword();
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" isLoading={changePassword.isPending}>
                  Changer le mot de passe
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      {/* Info card */}
      <Card className="bg-primary-50 border-primary-200">
        <CardBody>
          <h3 className="font-medium text-primary-900 mb-2">
            À propos de ZN Apart MS
          </h3>
          <p className="text-sm text-primary-700">
            Application de gestion de propriétés Airbnb. Développée pour la gestion
            à distance de propriétés au Cameroun depuis la France.
          </p>
          <p className="text-xs text-primary-600 mt-2">Version 1.0.0</p>
        </CardBody>
      </Card>
    </div>
  );
};

export default Settings;

