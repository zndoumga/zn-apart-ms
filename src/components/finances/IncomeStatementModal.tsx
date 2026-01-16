import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Download, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import { generateIncomeStatementData, generateIncomeStatementHTML, type PeriodType, type ComparisonType } from '../../services/incomeStatementService';
import type { Booking, Expense, Property } from '../../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface IncomeStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  expenses: Expense[];
  properties: Property[];
  selectedProperty?: string;
  currency: 'EUR' | 'FCFA';
}

const IncomeStatementModal: React.FC<IncomeStatementModalProps> = ({
  isOpen,
  onClose,
  bookings,
  expenses,
  properties,
  selectedProperty,
  currency,
}) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [periodType, setPeriodType] = useState<PeriodType>('quarter');
  const [comparisonType, setComparisonType] = useState<ComparisonType>('lastYear');
  const [isGenerating, setIsGenerating] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [periodTypeForPDF, setPeriodTypeForPDF] = useState<PeriodType>('quarter');
  const [selectedPeriodIndices, setSelectedPeriodIndices] = useState<number[]>([]);
  const [selectedPeriodIndicesForPDF, setSelectedPeriodIndicesForPDF] = useState<number[]>([]);

  // Generate years list (current year and 5 years back)
  const yearOptions = Array.from({ length: 6 }, (_, i) => {
    const y = currentYear - i;
    return { value: y.toString(), label: y.toString() };
  });

  const periodOptions = [
    { value: 'month', label: 'Mensuel' },
    { value: 'quarter', label: 'Trimestriel' },
    { value: 'year', label: 'Annuel' },
  ];

  const comparisonOptions = [
    { value: 'none', label: 'Aucune' },
    { value: 'lastYear', label: 'Année précédente' },
  ];


  // Generate period options based on period type
  const periodOptionsList = useMemo(() => {
    if (periodType === 'year') {
      return [];
    } else if (periodType === 'quarter') {
      return Array.from({ length: 4 }, (_, i) => ({
        index: i,
        label: `Q${i + 1}`,
      }));
    } else if (periodType === 'month') {
      return Array.from({ length: 12 }, (_, i) => {
        const monthDate = new Date(year, i, 1);
        return {
          index: i,
          label: format(monthDate, 'MMM', { locale: fr }),
        };
      });
    }
    return [];
  }, [periodType, year]);

  // Initialize selected periods when period type changes
  useEffect(() => {
    if (periodType === 'year') {
      setSelectedPeriodIndices([]);
    } else {
      // Select all periods by default
      setSelectedPeriodIndices(periodOptionsList.map(p => p.index));
    }
  }, [periodType, periodOptionsList]);

  const handlePeriodToggle = (index: number) => {
    setSelectedPeriodIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPeriodIndices.length === periodOptionsList.length) {
      setSelectedPeriodIndices([]);
    } else {
      setSelectedPeriodIndices(periodOptionsList.map(p => p.index));
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setError(null);
    setHtmlContent('');
    
    try {
      // Validate inputs
      if (!bookings || bookings.length === 0) {
        throw new Error('Aucune réservation trouvée pour cette période');
      }
      if (!expenses) {
        throw new Error('Aucune dépense trouvée');
      }
      if (!properties || properties.length === 0) {
        throw new Error('Aucune propriété trouvée');
      }

      // Validate period selection
      if (periodType !== 'year' && selectedPeriodIndices.length === 0) {
        throw new Error('Veuillez sélectionner au moins une période');
      }

      // Only pass selectedPeriodIndices if not all periods are selected (for year type, always pass undefined)
      const periodsToUse = periodType === 'year' || selectedPeriodIndices.length === periodOptionsList.length
        ? undefined
        : selectedPeriodIndices;

      const data = generateIncomeStatementData(
        bookings,
        expenses,
        properties,
        year,
        periodType,
        comparisonType,
        selectedProperty,
        periodsToUse
      );
      const html = generateIncomeStatementHTML(data, year, periodType, comparisonType, currency);
      setHtmlContent(html);
      // Store period type and selected indices to determine landscape mode for PDF
      setPeriodTypeForPDF(periodType);
      setSelectedPeriodIndicesForPDF(selectedPeriodIndices);
    } catch (error) {
      console.error('Error generating income statement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération de l\'état des résultats';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!htmlContent) return;

    try {
      // Determine if we need landscape mode (more than 5 data columns, excluding Account column)
      // Count: period columns + Total + comparison columns (Account column is not counted)
      let numDataColumns = 0;
      if (periodTypeForPDF === 'month') {
        // If specific months are selected, count those; otherwise assume all 12
        const numPeriods = selectedPeriodIndicesForPDF.length > 0 ? selectedPeriodIndicesForPDF.length : 12;
        numDataColumns = numPeriods + 1 + (comparisonType === 'lastYear' ? numPeriods : 0);
      } else if (periodTypeForPDF === 'quarter') {
        // If specific quarters are selected, count those; otherwise assume all 4
        const numPeriods = selectedPeriodIndicesForPDF.length > 0 ? selectedPeriodIndicesForPDF.length : 4;
        numDataColumns = numPeriods + 1 + (comparisonType === 'lastYear' ? numPeriods : 0);
      } else if (periodTypeForPDF === 'year') {
        numDataColumns = 1 + 1 + (comparisonType === 'lastYear' ? 1 : 0);
      }
      const useLandscape = numDataColumns > 5; // Only use landscape when MORE than 5 data columns
      
      // Create a temporary container for the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      // Adjust width for landscape mode
      tempDiv.style.width = useLandscape ? '1400px' : '980px';
      document.body.appendChild(tempDiv);

      // Convert to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Remove temporary element
      document.body.removeChild(tempDiv);
      
      // Create PDF with appropriate orientation and margins
      const orientation = useLandscape ? 'l' : 'p'; // 'l' for landscape, 'p' for portrait
      const pdf = new jsPDF(orientation, 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Adjust margins based on orientation
      const margin = useLandscape ? 10 : 20; // Smaller margins for landscape
      const pageWidth = useLandscape ? 297 : 210; // A4 landscape width is 297mm
      const pageHeight = useLandscape ? 210 : 297; // A4 landscape height is 210mm
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - (margin * 2));

      while (heightLeft >= 0) {
        position = margin;
        pdf.addPage(orientation);
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - (margin * 2));
      }

      // Download PDF
      const filename = `income_statement_${year}_${periodType}_${new Date().getTime()}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error downloading income statement:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Générer un état des résultats"
      size="xl"
    >
      <div className="space-y-6">
        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Année
            </label>
            <Select
              options={yearOptions}
              value={year.toString()}
              onChange={(value) => setYear(parseInt(value, 10))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Période
            </label>
            <Select
              options={periodOptions}
              value={periodType}
              onChange={(value) => setPeriodType(value as PeriodType)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comparaison
            </label>
            <Select
              options={comparisonOptions}
              value={comparisonType}
              onChange={(value) => setComparisonType(value as ComparisonType)}
            />
          </div>
        </div>

        {/* Period Selection (only for quarter and month types) */}
        {periodType !== 'year' && periodOptionsList.length > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Sélectionner les périodes
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {selectedPeriodIndices.length === periodOptionsList.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {periodOptionsList.map((period) => (
                <Checkbox
                  key={period.index}
                  label={period.label}
                  checked={selectedPeriodIndices.includes(period.index)}
                  onChange={() => handlePeriodToggle(period.index)}
                />
              ))}
            </div>
            {selectedPeriodIndices.length === 0 && (
              <p className="mt-2 text-sm text-amber-600">
                Veuillez sélectionner au moins une période
              </p>
            )}
          </div>
        )}

        {/* Generate button */}
        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            isLoading={isGenerating}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Générer l'aperçu
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Preview */}
        {htmlContent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Aperçu</h3>
              <Button
                onClick={handleDownload}
                variant="primary"
                leftIcon={<Download className="w-4 h-4" />}
              >
                Télécharger PDF
              </Button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <iframe
                srcDoc={htmlContent}
                className="w-full"
                style={{ height: '600px', border: 'none' }}
                title="Income Statement Preview"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default IncomeStatementModal;

