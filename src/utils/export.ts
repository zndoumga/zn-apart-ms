import type { Booking, Expense, Customer, MaintenanceEntry } from '../types';
import { formatDate } from './dates';
import * as XLSX from 'xlsx';

export type ExportFormat = 'csv' | 'xlsx';

/**
 * Convert data to CSV format
 */
function convertToCSV(data: Record<string, unknown>[], headers: string[]): string {
  const headerRow = headers.join(',');
  
  const rows = data.map((item) =>
    headers
      .map((header) => {
        const value = item[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string') {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }
        return String(value ?? '');
      })
      .join(',')
  );
  
  return [headerRow, ...rows].join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Download data in specified format (CSV or Excel)
 */
function downloadData(
  data: Record<string, unknown>[],
  baseFilename: string,
  format: ExportFormat
): void {
  const headers = Object.keys(data[0] || {});
  
  if (format === 'csv') {
    const csv = convertToCSV(data, headers);
    downloadCSV(csv, `${baseFilename}.csv`);
  } else {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${baseFilename}.xlsx`);
  }
}

/**
 * Export bookings to CSV or Excel
 */
export function exportBookings(
  bookings: Booking[],
  propertyNames: Record<string, string>,
  format: ExportFormat = 'csv'
): void {
  const data = bookings.map((b) => ({
    'Date réservation': formatDate(b.createdAt),
    'Appartement': propertyNames[b.propertyId] || b.propertyId,
    'Nom du client': b.guestName,
    'Arrivée': formatDate(b.checkIn),
    'Départ': formatDate(b.checkOut),
    'Nombre de nuits': Math.ceil(
      (b.checkOut.getTime() - b.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    ),
    'Nombre d\'invités': b.guests,
    'Total (EUR)': b.totalPriceEUR.toFixed(2),
    'Total (FCFA)': b.totalPriceFCFA,
    'Source': b.source,
    'Statut': b.status,
    'Notes': b.notes || '',
  }));
  
  const baseFilename = `reservations_${formatDate(new Date(), 'yyyy-MM-dd')}`;
  downloadData(data, baseFilename, format);
}

// Keep old function name for backward compatibility
export const exportBookingsToCSV = (
  bookings: Booking[],
  propertyNames: Record<string, string>
) => exportBookings(bookings, propertyNames, 'csv');

/**
 * Export expenses to CSV or Excel
 */
export function exportExpenses(
  expenses: Expense[],
  propertyNames: Record<string, string>,
  format: ExportFormat = 'csv'
): void {
  const data = expenses.map((e) => ({
    'Date effective': formatDate(e.date),
    'Appartement': e.propertyId ? propertyNames[e.propertyId] || e.propertyId : 'Général',
    'Catégorie': getCategoryLabel(e.category),
    'Fournisseur': e.vendor || '',
    'Description': e.description,
    'Montant (EUR)': e.amountEUR.toFixed(2),
    'Montant (FCFA)': e.amountFCFA,
    'Date enregistrement': formatDate(e.createdAt),
  }));
  
  const baseFilename = `depenses_${formatDate(new Date(), 'yyyy-MM-dd')}`;
  downloadData(data, baseFilename, format);
}

// Keep old function name for backward compatibility
export const exportExpensesToCSV = (
  expenses: Expense[],
  propertyNames: Record<string, string>
) => exportExpenses(expenses, propertyNames, 'csv');

/**
 * Export customers to CSV
 */
export function exportCustomersToCSV(
  customers: Customer[],
  stats: Record<string, { bookings: number; revenue: number }>
): void {
  const data = customers.map((c) => ({
    'Nom': c.name,
    'Email': c.email || '',
    'Téléphone': c.phone || '',
    'Nationalité': c.nationality || '',
    'VIP': c.isVIP ? 'Oui' : 'Non',
    'Total réservations': stats[c.id]?.bookings || c.totalBookings || 0,
    'Revenu total (EUR)': (stats[c.id]?.revenue || c.totalSpentEUR || 0).toFixed(2),
    'Notes': c.notes || '',
    'Date de création': formatDate(c.createdAt),
  }));
  
  const headers = Object.keys(data[0] || {});
  const csv = convertToCSV(data, headers);
  
  const filename = `clients_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export maintenance log to CSV
 */
export function exportMaintenanceToCSV(
  entries: MaintenanceEntry[],
  propertyNames: Record<string, string>
): void {
  const data = entries.map((e) => ({
    'Date': formatDate(e.date),
    'Appartement': propertyNames[e.propertyId] || e.propertyId,
    'Catégorie': getMaintenanceCategoryLabel(e.category),
    'Description': e.description,
    'Coût (EUR)': e.costEUR.toFixed(2),
    'Coût (FCFA)': e.costFCFA,
    'Statut': e.status,
    'Prestataire': e.provider || '',
    'Notes': e.notes || '',
  }));
  
  const headers = Object.keys(data[0] || {});
  const csv = convertToCSV(data, headers);
  
  const filename = `maintenance_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export financial report to CSV
 */
export function exportFinancialReportToCSV(
  monthlyData: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    occupancy: number;
  }[]
): void {
  const data = monthlyData.map((m) => ({
    'Mois': m.month,
    'Revenus (EUR)': m.revenue.toFixed(2),
    'Dépenses (EUR)': m.expenses.toFixed(2),
    'Bénéfice net (EUR)': m.profit.toFixed(2),
    'Taux d\'occupation (%)': m.occupancy.toFixed(1),
  }));
  
  const headers = Object.keys(data[0] || {});
  const csv = convertToCSV(data, headers);
  
  const filename = `rapport_financier_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
  downloadCSV(csv, filename);
}

// Helper functions for labels
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    rent: 'Loyer',
    utilities: 'Charges',
    canal_sat: 'Canal+',
    common_areas: 'Parties communes',
    cleaning: 'Nettoyage',
    laundry: 'Blanchisserie',
    consumables: 'Consommables',
    supplies: 'Fournitures',
    maintenance: 'Maintenance',
    wages: 'Salaires',
    taxes: 'Taxes & Impôts',
    marketing: 'Marketing',
    furnishings: 'Mobilier',
    security: 'Sécurité',
    other: 'Autre',
  };
  return labels[category] || category;
}

function getMaintenanceCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    plumbing: 'Plomberie',
    electrical: 'Électricité',
    hvac: 'Climatisation',
    appliance: 'Électroménager',
    structural: 'Structure',
    cleaning: 'Nettoyage',
    other: 'Autre',
  };
  return labels[category] || category;
}
