import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Card, CardBody } from '../ui/Card';
import Badge from '../ui/Badge';
import type { ExpenseFormData, ExpenseCategory, Property } from '../../types';
import { EXPENSE_CATEGORIES } from '../../types';

interface ExpenseImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (expenses: ExpenseFormData[]) => Promise<void>;
  properties: Property[];
  isLoading?: boolean;
}

interface ParsedRow {
  rowNumber: number;
  data: Partial<ExpenseFormData>;
  errors: string[];
  isValid: boolean;
}

const EXPECTED_COLUMNS = [
  'property_name',
  'date_effective',
  'category',
  'vendor',
  'description',
  'amount_eur',
  'notes',
];

const ExpenseImportModal: React.FC<ExpenseImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  properties,
  isLoading = false,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const propertyMap = new Map(properties.map((p) => [p.name.toLowerCase(), p]));

  const validateCategory = (category: string): ExpenseCategory | null => {
    const normalized = category?.toLowerCase().trim();
    const found = EXPENSE_CATEGORIES.find(
      (c) => c.value === normalized || c.label.toLowerCase() === normalized
    );
    return found ? (found.value as ExpenseCategory) : null;
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Try parsing various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try DD/MM/YYYY format
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    
    return null;
  };

  const validateRow = useCallback(
    (row: Record<string, unknown>, rowIndex: number): ParsedRow => {
      const errors: string[] = [];
      const data: Partial<ExpenseFormData> = {};

      // Property name (optional - can be general expense)
      const propertyName = String(row.property_name || '').trim();
      if (propertyName && propertyName.toLowerCase() !== 'général' && propertyName.toLowerCase() !== 'general') {
        const property = propertyMap.get(propertyName.toLowerCase());
        if (!property) {
          errors.push(`Propriété "${propertyName}" non trouvée`);
        } else {
          data.propertyId = property.id;
        }
      }

      // Date effective (required)
      const date = parseDate(String(row.date_effective || row.date || ''));
      if (!date) {
        errors.push('Date effective invalide');
      } else {
        data.date = date;
      }

      // Category (required)
      const category = validateCategory(String(row.category || ''));
      if (!category) {
        errors.push('Catégorie invalide');
      } else {
        data.category = category;
      }

      // Description (required)
      const description = String(row.description || '').trim();
      if (!description) {
        errors.push('Description requise');
      } else {
        data.description = description;
      }

      // Amount EUR (required)
      const amountEUR = parseFloat(String(row.amount_eur || '0'));
      if (isNaN(amountEUR) || amountEUR <= 0) {
        errors.push('Montant EUR invalide');
      } else {
        data.amountEUR = amountEUR;
        // Calculate FCFA (approximate conversion rate)
        data.amountFCFA = Math.round(amountEUR * 655.957);
      }

      // Vendor (optional)
      const vendor = String(row.vendor || '').trim();
      if (vendor) {
        data.vendor = vendor;
      }

      // Notes (optional)
      const notes = String(row.notes || '').trim();
      if (notes) {
        data.notes = notes;
      }

      return {
        rowNumber: rowIndex + 2, // +2 for header row and 1-based index
        data,
        errors,
        isValid: errors.length === 0,
      };
    },
    [propertyMap]
  );

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setParseError(null);
      setParsedRows([]);

      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: '',
          raw: false,
        });

        if (jsonData.length === 0) {
          setParseError('Le fichier est vide ou ne contient pas de données valides.');
          return;
        }

        // Validate and parse rows
        const rows = jsonData.map((row, index) => validateRow(row, index));
        setParsedRows(rows);
      } catch (err) {
        console.error('Error parsing file:', err);
        setParseError('Erreur lors de la lecture du fichier. Vérifiez le format.');
      }
    },
    [validateRow]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleImport = async () => {
    const validExpenses = parsedRows
      .filter((row) => row.isValid)
      .map((row) => row.data as ExpenseFormData);

    if (validExpenses.length === 0) {
      setParseError('Aucune dépense valide à importer.');
      return;
    }

    setImporting(true);
    try {
      await onImport(validExpenses);
      handleClose();
    } catch (err) {
      console.error('Import error:', err);
      setParseError('Erreur lors de l\'import. Veuillez réessayer.');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    onClose();
  };

  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    // Create sample data with property names
    const sampleData = [
      {
        property_name: properties[0]?.name || 'Général',
        date_effective: '2024-01-15',
        category: 'cleaning',
        vendor: 'Service Nettoyage Pro',
        description: 'Nettoyage mensuel',
        amount_eur: 50,
        notes: 'Nettoyage complet',
      },
      {
        property_name: 'Général',
        date_effective: '2024-01-20',
        category: 'utilities',
        vendor: 'ENEO',
        description: 'Facture électricité janvier',
        amount_eur: 120,
        notes: '',
      },
    ];

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // property_name
      { wch: 12 }, // date_effective
      { wch: 15 }, // category
      { wch: 20 }, // vendor
      { wch: 30 }, // description
      { wch: 12 }, // amount_eur
      { wch: 30 }, // notes
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dépenses');

    // Download in chosen format
    if (format === 'csv') {
      XLSX.writeFile(workbook, 'template_depenses.csv', { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, 'template_depenses.xlsx');
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={handleClose} disabled={importing || isLoading}>
        Annuler
      </Button>
      <Button
        onClick={handleImport}
        disabled={validCount === 0 || importing || isLoading}
        isLoading={importing || isLoading}
      >
        Importer {validCount} dépense{validCount > 1 ? 's' : ''}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importer des dépenses"
      size="xl"
      footer={footerContent}
    >
      <div className="space-y-6">
        {/* File upload area */}
        {!file && (
          <>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('expense-file-input')?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Glissez un fichier ici ou cliquez pour sélectionner
              </p>
              <p className="text-sm text-gray-500">
                Formats acceptés: CSV, Excel (.xlsx, .xls)
              </p>
              <input
                id="expense-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Template info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 mb-2">
                        Format attendu (colonnes)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {EXPECTED_COLUMNS.map((col) => (
                          <Badge key={col} variant="primary">
                            {col}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        * date_effective, category, description et amount_eur sont obligatoires
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Catégories: {EXPENSE_CATEGORIES.map(c => c.value).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <p className="text-xs text-blue-600 font-medium">Télécharger le template</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTemplate('xlsx')}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTemplate('csv')}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </>
        )}

        {/* File selected */}
        {file && (
          <>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-primary-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setParsedRows([]);
                  setParseError(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Parse error */}
            {parseError && (
              <Card className="bg-red-50 border-red-200">
                <CardBody>
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <p>{parseError}</p>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Results summary */}
            {parsedRows.length > 0 && (
              <>
                <div className="flex gap-4">
                  <Card className="flex-1 bg-green-50 border-green-200">
                    <CardBody className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-700">{validCount}</p>
                        <p className="text-sm text-green-600">Valides</p>
                      </div>
                    </CardBody>
                  </Card>
                  <Card className="flex-1 bg-red-50 border-red-200">
                    <CardBody className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
                        <p className="text-sm text-red-600">Erreurs</p>
                      </div>
                    </CardBody>
                  </Card>
                </div>

                {/* Preview table */}
                <div className="max-h-64 overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Montant</th>
                        <th className="px-3 py-2 text-left">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.slice(0, 20).map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={row.isValid ? '' : 'bg-red-50'}
                        >
                          <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                          <td className="px-3 py-2">{row.data.description || '-'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.data.date || '-'}
                          </td>
                          <td className="px-3 py-2">
                            {row.data.amountEUR ? `€${row.data.amountEUR}` : '-'}
                          </td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <Badge variant="success">Valide</Badge>
                            ) : (
                              <div>
                                <Badge variant="danger">Erreur</Badge>
                                <p className="text-xs text-red-600 mt-1">
                                  {row.errors.join(', ')}
                                </p>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 20 && (
                    <p className="text-center py-2 text-sm text-gray-500">
                      ... et {parsedRows.length - 20} autres lignes
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default ExpenseImportModal;

