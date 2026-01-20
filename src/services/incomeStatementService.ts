import type { Booking, Expense, Property } from '../types';
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
  subYears,
  addMonths,
  addQuarters,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  calculateTotalRevenue,
  calculateTotalExpenses,
  calculateNightsBooked,
  calculateAverageNightPrice,
  calculateOccupancyRate,
} from '../utils/calculations';

export type PeriodType = 'month' | 'quarter' | 'year';
export type ComparisonType = 'none' | 'lastYear';

export interface IncomeStatementPeriod {
  label: string;
  startDate: Date;
  endDate: Date;
}

export interface IncomeStatementData {
  periods: IncomeStatementPeriod[];
  kpis: {
    nightsBooked: number[];
    avgNightPrice: number[];
    occupancyRate: number[];
  };
  revenue: {
    accommodation: number[];
    total: number[];
  };
  fixedCosts: {
    rent: number[];
    commonAreas: number[];
    internet: number[];
    total: number[];
  };
  grossProfit: number[];
  operationalCosts: {
    utilities: number[];
    utilitiesInternet: number[];
    utilitiesElectricity: number[];
    utilitiesWater: number[];
    canal_sat: number[];
    cleaning: number[];
    laundry: number[];
    consumables: number[];
    supplies: number[];
    maintenance: number[];
    wages: number[];
    taxes: number[];
    transport: number[];
    mobile_data: number[];
    marketing: number[];
    furnishings: number[];
    security: number[];
    other: number[];
    categoriesToInclude: Array<{key: string, values: number[]}>;
    total: number[];
  };
  netIncome: number[];
  // Comparison data (if enabled)
  comparison?: {
    periods: IncomeStatementPeriod[];
    revenue: { total: number[] };
    fixedCosts: { total: number[] };
    grossProfit: number[];
    operationalCosts: { total: number[] };
    netIncome: number[];
  };
  // YTD data
  ytd?: {
    revenue: { total: number };
    fixedCosts: { total: number };
    grossProfit: number;
    operationalCosts: { total: number };
    netIncome: number;
  };
}

/**
 * Generate income statement data based on period type and year
 */
export function generateIncomeStatementData(
  bookings: Booking[],
  expenses: Expense[],
  properties: Property[],
  year: number,
  periodType: PeriodType,
  comparisonType: ComparisonType,
  selectedProperty?: string,
  selectedPeriodIndices?: number[]
): IncomeStatementData {
  // Filter bookings and expenses by property if selected
  const filteredBookings = selectedProperty
    ? bookings.filter(b => b.propertyId === selectedProperty)
    : bookings;
  const filteredExpenses = selectedProperty
    ? expenses.filter(e => e.propertyId === selectedProperty)
    : expenses;
  const filteredProperties = selectedProperty
    ? properties.filter(p => p.id === selectedProperty)
    : properties;

  // Generate periods based on type and selected indices
  const periods = generatePeriods(year, periodType, selectedPeriodIndices);
  
  // Calculate data for each period
  const kpis = {
    nightsBooked: periods.map(p => calculateNightsBooked(filteredBookings, p.startDate, p.endDate)),
    avgNightPrice: periods.map(p => {
      const revenue = calculateTotalRevenue(filteredBookings, p.startDate, p.endDate);
      const nights = calculateNightsBooked(filteredBookings, p.startDate, p.endDate);
      return nights > 0 ? revenue.FCFA / nights : 0;
    }),
    occupancyRate: periods.map(p => 
      calculateOccupancyRate(filteredBookings, filteredProperties, p.startDate, p.endDate)
    ),
  };

  // Revenue
  const revenue = {
    accommodation: periods.map(p => 
      calculateTotalRevenue(filteredBookings, p.startDate, p.endDate).FCFA
    ),
    otherIncome: periods.map(() => 0), // TODO: Track other income separately
    total: periods.map(p => 
      calculateTotalRevenue(filteredBookings, p.startDate, p.endDate).FCFA
    ),
  };

  // Fixed costs
  const rentCosts = periods.map(p => 
    getExpensesByCategory(filteredExpenses, 'rent', p.startDate, p.endDate)
  );
  const commonAreasCosts = periods.map(p => 
    getExpensesByCategory(filteredExpenses, 'common_areas', p.startDate, p.endDate)
  );
  const internetCosts = periods.map(p => 
    getExpensesByCategory(filteredExpenses, 'utilities', p.startDate, p.endDate, 'Internet')
  );
  const fixedCosts = {
    rent: rentCosts,
    commonAreas: commonAreasCosts,
    internet: internetCosts,
    total: periods.map((p, i) => rentCosts[i] + commonAreasCosts[i] + internetCosts[i]),
  };

  // Gross profit
  const grossProfit = periods.map((p, i) => revenue.total[i] - fixedCosts.total[i]);

  // Operational costs - use exact expense categories
  // Get all expenses by category for each period, ensuring uncategorized expenses go to "other"
  const allExpensesByPeriod = periods.map(p => getAllExpensesByCategory(filteredExpenses, p.startDate, p.endDate));
  
  // Utilities breakdown (Internet moved to fixed costs)
  const utilitiesElectricity = periods.map(p => getExpensesByCategory(filteredExpenses, 'utilities', p.startDate, p.endDate, 'ENEO'));
  const utilitiesWater = periods.map(p => getExpensesByCategory(filteredExpenses, 'utilities', p.startDate, p.endDate, 'camwater'));
  const utilities = periods.map((p, i) => utilitiesElectricity[i] + utilitiesWater[i]);
  
  // Merge cleaning and cleaning_material
  const cleaning = periods.map((p, i) => 
    (allExpensesByPeriod[i].cleaning || 0) + (allExpensesByPeriod[i].cleaning_material || 0)
  );
  
  const canal_sat = periods.map((p, i) => allExpensesByPeriod[i].canal_sat || 0);
  const laundry = periods.map((p, i) => allExpensesByPeriod[i].laundry || 0);
  const consumables = periods.map((p, i) => allExpensesByPeriod[i].consumables || 0);
  const supplies = periods.map((p, i) => allExpensesByPeriod[i].supplies || 0);
  const maintenance = periods.map((p, i) => allExpensesByPeriod[i].maintenance || 0);
  const wages = periods.map((p, i) => allExpensesByPeriod[i].wages || 0);
  const taxes = periods.map((p, i) => allExpensesByPeriod[i].taxes || 0);
  const transport = periods.map((p, i) => allExpensesByPeriod[i].transport || 0);
  const mobile_data = periods.map((p, i) => allExpensesByPeriod[i].mobile_data || 0);
  const marketing = periods.map((p, i) => allExpensesByPeriod[i].marketing || 0);
  const furnishings = periods.map((p, i) => allExpensesByPeriod[i].furnishings || 0);
  const security = periods.map((p, i) => allExpensesByPeriod[i].security || 0);
  const other = periods.map((p, i) => allExpensesByPeriod[i].other || 0);
  
  // Check which categories have all zeros - exclude them
  const hasNonZero = (arr: number[]) => arr.some(v => v !== 0);
  const categoriesToInclude: Array<{key: string, values: number[]}> = [];
  
  if (hasNonZero(utilities)) categoriesToInclude.push({key: 'utilities', values: utilities});
  if (hasNonZero(canal_sat)) categoriesToInclude.push({key: 'canal_sat', values: canal_sat});
  if (hasNonZero(cleaning)) categoriesToInclude.push({key: 'cleaning', values: cleaning});
  if (hasNonZero(laundry)) categoriesToInclude.push({key: 'laundry', values: laundry});
  if (hasNonZero(consumables)) categoriesToInclude.push({key: 'consumables', values: consumables});
  if (hasNonZero(supplies)) categoriesToInclude.push({key: 'supplies', values: supplies});
  if (hasNonZero(maintenance)) categoriesToInclude.push({key: 'maintenance', values: maintenance});
  if (hasNonZero(wages)) categoriesToInclude.push({key: 'wages', values: wages});
  if (hasNonZero(taxes)) categoriesToInclude.push({key: 'taxes', values: taxes});
  if (hasNonZero(transport)) categoriesToInclude.push({key: 'transport', values: transport});
  if (hasNonZero(mobile_data)) categoriesToInclude.push({key: 'mobile_data', values: mobile_data});
  if (hasNonZero(marketing)) categoriesToInclude.push({key: 'marketing', values: marketing});
  if (hasNonZero(furnishings)) categoriesToInclude.push({key: 'furnishings', values: furnishings});
  if (hasNonZero(security)) categoriesToInclude.push({key: 'security', values: security});
  if (hasNonZero(other)) categoriesToInclude.push({key: 'other', values: other});
  
  // Now construct the object with total
  const operationalCosts = {
    utilities,
    utilitiesElectricity,
    utilitiesWater,
    canal_sat,
    cleaning,
    laundry,
    consumables,
    supplies,
    maintenance,
    wages,
    taxes,
    transport,
    mobile_data,
    marketing,
    furnishings,
    security,
    other,
    categoriesToInclude,
    total: periods.map((p, i) => {
      return utilities[i] +
             canal_sat[i] +
             cleaning[i] +
             laundry[i] +
             consumables[i] +
             supplies[i] +
             maintenance[i] +
             wages[i] +
             taxes[i] +
             transport[i] +
             mobile_data[i] +
             marketing[i] +
             furnishings[i] +
             security[i] +
             other[i];
    }),
  };

  // Net income = Revenue - All Expenses
  // Use sum of all categories (fixed + operational) to ensure totals match
  // This ensures all expenses are accounted for in the breakdown
  const netIncome = periods.map((p, i) => {
    const periodRevenue = revenue.total[i];
    const periodFixedCosts = fixedCosts.total[i];
    const periodOperationalCosts = operationalCosts.total[i];
    // Verify the sum matches total expenses
    const periodTotalExpenses = calculateTotalExpenses(filteredExpenses, p.startDate, p.endDate).FCFA;
    const periodCategorizedExpenses = periodFixedCosts + periodOperationalCosts;
    // If there's a discrepancy, add it to "other" to ensure totals match
    const discrepancy = periodTotalExpenses - periodCategorizedExpenses;
    if (Math.abs(discrepancy) > 1) { // Allow 1 FCFA rounding difference
      // Add discrepancy to other category
      other[i] = other[i] + discrepancy;
      operationalCosts.total[i] = operationalCosts.total[i] + discrepancy;
    }
    return periodRevenue - periodFixedCosts - operationalCosts.total[i];
  });

  // Comparison data (last year)
  let comparison: IncomeStatementData['comparison'] | undefined;
  if (comparisonType === 'lastYear') {
    const lastYearPeriods = generatePeriods(year - 1, periodType, selectedPeriodIndices);
    // Calculate comparison data first
    const comparisonRevenue = lastYearPeriods.map(p => 
      calculateTotalRevenue(filteredBookings, p.startDate, p.endDate).FCFA
    );
    const comparisonFixedCosts = lastYearPeriods.map(p => {
      const periodExpenses = getAllExpensesByCategory(filteredExpenses, p.startDate, p.endDate);
      const internetCost = getExpensesByCategory(filteredExpenses, 'utilities', p.startDate, p.endDate, 'Internet');
      return (periodExpenses.rent || 0) + (periodExpenses.common_areas || 0) + internetCost;
    });
    const comparisonOperationalCosts = lastYearPeriods.map(p => {
      const periodExpenses = getAllExpensesByCategory(filteredExpenses, p.startDate, p.endDate);
      // Sum all operational categories (excluding fixed costs: rent, common_areas, and internet)
      const internetCost = getExpensesByCategory(filteredExpenses, 'utilities', p.startDate, p.endDate, 'Internet');
      const utilitiesWithoutInternet = (periodExpenses.utilities || 0) - internetCost;
      return utilitiesWithoutInternet +
             (periodExpenses.canal_sat || 0) +
             (periodExpenses.cleaning || 0) +
             (periodExpenses.cleaning_material || 0) +
             (periodExpenses.laundry || 0) +
             (periodExpenses.consumables || 0) +
             (periodExpenses.supplies || 0) +
             (periodExpenses.maintenance || 0) +
             (periodExpenses.wages || 0) +
             (periodExpenses.taxes || 0) +
             (periodExpenses.transport || 0) +
             (periodExpenses.mobile_data || 0) +
             (periodExpenses.marketing || 0) +
             (periodExpenses.furnishings || 0) +
             (periodExpenses.security || 0) +
             (periodExpenses.other || 0);
    });
    const comparisonGrossProfit = comparisonRevenue.map((rev, i) => rev - comparisonFixedCosts[i]);
    const comparisonNetIncome = comparisonRevenue.map((rev, i) => 
      rev - comparisonFixedCosts[i] - comparisonOperationalCosts[i]
    );
    
    comparison = {
      periods: lastYearPeriods,
      revenue: {
        total: comparisonRevenue,
      },
      fixedCosts: {
        total: comparisonFixedCosts,
      },
      grossProfit: comparisonGrossProfit,
      operationalCosts: {
        total: comparisonOperationalCosts,
      },
      netIncome: comparisonNetIncome,
    };
  }

  // YTD data - always calculate, even if there are no bookings/expenses
  const ytdStart = startOfYear(new Date(year, 0, 1));
  const ytdEnd = new Date(); // Today
  let ytd;
  try {
    const ytdRevenue = calculateTotalRevenue(filteredBookings, ytdStart, ytdEnd);
    const ytdExpenses = getAllExpensesByCategory(filteredExpenses, ytdStart, ytdEnd);
    const ytdTotalExpensesResult = calculateTotalExpenses(filteredExpenses, ytdStart, ytdEnd);
    
    const ytdInternetCost = getExpensesByCategory(filteredExpenses, 'utilities', ytdStart, ytdEnd, 'Internet');
    ytd = {
      revenue: {
        total: (ytdRevenue && typeof ytdRevenue === 'object' && 'FCFA' in ytdRevenue) ? ytdRevenue.FCFA : 0,
      },
      fixedCosts: {
        total: (ytdExpenses.rent || 0) + (ytdExpenses.common_areas || 0) + ytdInternetCost,
      },
      grossProfit: 0, // Will calculate below
      operationalCosts: {
        total: (ytdExpenses.utilities || 0) - ytdInternetCost + // Subtract internet from utilities
               (ytdExpenses.canal_sat || 0) +
               (ytdExpenses.cleaning || 0) +
               (ytdExpenses.cleaning_material || 0) +
               (ytdExpenses.laundry || 0) +
               (ytdExpenses.consumables || 0) +
               (ytdExpenses.supplies || 0) +
               (ytdExpenses.maintenance || 0) +
               (ytdExpenses.wages || 0) +
               (ytdExpenses.taxes || 0) +
               (ytdExpenses.transport || 0) +
               (ytdExpenses.mobile_data || 0) +
               (ytdExpenses.marketing || 0) +
               (ytdExpenses.furnishings || 0) +
               (ytdExpenses.security || 0) +
               (ytdExpenses.other || 0),
      },
      netIncome: 0, // Will calculate below
    };
    ytd.grossProfit = ytd.revenue.total - ytd.fixedCosts.total;
    // Net income = Revenue - All Expenses (Fixed + Operational)
    // Verify totals match and adjust "other" if needed
    const ytdTotalExpenses = (ytdTotalExpensesResult && typeof ytdTotalExpensesResult === 'object' && 'FCFA' in ytdTotalExpensesResult) 
      ? ytdTotalExpensesResult.FCFA 
      : 0;
    const ytdCategorizedExpenses = ytd.fixedCosts.total + ytd.operationalCosts.total;
    const ytdDiscrepancy = ytdTotalExpenses - ytdCategorizedExpenses;
    if (Math.abs(ytdDiscrepancy) > 1) {
      // Add discrepancy to operational costs total (which includes "other")
      ytd.operationalCosts.total = ytd.operationalCosts.total + ytdDiscrepancy;
    }
    ytd.netIncome = ytd.revenue.total - ytd.fixedCosts.total - ytd.operationalCosts.total;
  } catch (error) {
    // If YTD calculation fails, return zero values
    console.error('Error calculating YTD:', error);
    ytd = {
      revenue: { total: 0 },
      fixedCosts: { total: 0 },
      grossProfit: 0,
      operationalCosts: { total: 0 },
      netIncome: 0,
    };
  }

  return {
    periods,
    kpis,
    revenue,
    fixedCosts,
    grossProfit,
    operationalCosts,
    netIncome,
    comparison,
    ytd,
  };
}

/**
 * Generate periods based on type
 */
function generatePeriods(year: number, periodType: PeriodType, selectedIndices?: number[]): IncomeStatementPeriod[] {
  const periods: IncomeStatementPeriod[] = [];

  if (periodType === 'year') {
    periods.push({
      label: year.toString(),
      startDate: startOfYear(new Date(year, 0, 1)),
      endDate: endOfYear(new Date(year, 11, 31)),
    });
  } else if (periodType === 'quarter') {
    for (let q = 0; q < 4; q++) {
      // If selectedIndices is provided, only include selected quarters
      if (selectedIndices && !selectedIndices.includes(q)) {
        continue;
      }
      const quarterStart = startOfQuarter(new Date(year, q * 3, 1));
      const quarterEnd = endOfQuarter(new Date(year, q * 3, 1));
      periods.push({
        label: `Q${q + 1}`,
        startDate: quarterStart,
        endDate: quarterEnd,
      });
    }
  } else if (periodType === 'month') {
    for (let m = 0; m < 12; m++) {
      // If selectedIndices is provided, only include selected months
      if (selectedIndices && !selectedIndices.includes(m)) {
        continue;
      }
      const monthStart = startOfMonth(new Date(year, m, 1));
      const monthEnd = endOfMonth(new Date(year, m, 1));
      periods.push({
        label: format(monthStart, 'MMM', { locale: fr }),
        startDate: monthStart,
        endDate: monthEnd,
      });
    }
  }

  return periods;
}

/**
 * Get expenses by category for a date range
 * For utilities category, if looking for water, check vendor for "camwater"
 */
function getExpensesByCategory(
  expenses: Expense[],
  category: string,
  startDate: Date,
  endDate: Date,
  vendorOrDescriptionFilter?: string
): number {
  if (!expenses || expenses.length === 0) {
    return 0;
  }
  
  return expenses
    .filter(e => {
      if (!e || !e.date) return false;
      const expenseDate = new Date(e.date);
      const matchesCategory = e.category === category;
      const matchesDate = expenseDate >= startDate && expenseDate <= endDate;
      // For utilities breakdown, check vendor or description
      const matchesFilter = vendorOrDescriptionFilter 
        ? ((e.vendor || '').toLowerCase().includes(vendorOrDescriptionFilter.toLowerCase()) ||
           (e.description || '').toLowerCase().includes(vendorOrDescriptionFilter.toLowerCase()))
        : true;
      return matchesCategory && matchesDate && matchesFilter;
    })
    .reduce((sum, e) => sum + (e.amountFCFA || 0), 0);
}

/**
 * Get all expenses for a period and ensure uncategorized expenses go to "other"
 */
function getAllExpensesByCategory(
  expenses: Expense[],
  startDate: Date,
  endDate: Date
): Record<string, number> {
  if (!expenses || expenses.length === 0) {
    return {};
  }
  
  const validCategories = ['rent', 'utilities', 'canal_sat', 'common_areas', 'cleaning', 'laundry', 
    'consumables', 'cleaning_material', 'supplies', 'maintenance', 'wages', 'taxes', 'transport', 
    'mobile_data', 'marketing', 'furnishings', 'security', 'other'];
  
  const result: Record<string, number> = {
    rent: 0,
    utilities: 0,
    canal_sat: 0,
    common_areas: 0,
    cleaning: 0,
    cleaning_material: 0,
    laundry: 0,
    consumables: 0,
    supplies: 0,
    maintenance: 0,
    wages: 0,
    taxes: 0,
    transport: 0,
    mobile_data: 0,
    marketing: 0,
    furnishings: 0,
    security: 0,
    other: 0,
  };
  
  expenses.forEach(e => {
    if (!e || !e.date) return;
    const expenseDate = new Date(e.date);
    if (expenseDate < startDate || expenseDate > endDate) return;
    
    const amount = e.amountFCFA || 0;
    const category = e.category || '';
    
    // If category is valid, add to that category
    if (validCategories.includes(category)) {
      if (category === 'cleaning' || category === 'cleaning_material') {
        // These will be merged later, but track separately for now
        result[category] = (result[category] || 0) + amount;
      } else {
        result[category] = (result[category] || 0) + amount;
      }
    } else {
      // Uncategorized or invalid category goes to "other"
      result.other = (result.other || 0) + amount;
    }
  });
  
  return result;
}

/**
 * Generate HTML for income statement
 */
/**
 * Round FCFA to nearest 500
 */
function roundFCFAToNearest500(amount: number): number {
  return Math.round(amount / 500) * 500;
}

/**
 * Format amount with thousand separator
 */
function formatAmountWithSeparator(amount: number, currency: 'EUR' | 'FCFA'): string {
  if (currency === 'FCFA') {
    const rounded = roundFCFAToNearest500(amount);
    return rounded.toLocaleString('fr-FR').replace(/\s/g, '.');
  } else {
    return Math.round(amount).toLocaleString('fr-FR').replace(/\s/g, '.');
  }
}

/**
 * Get category label from EXPENSE_CATEGORIES
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    rent: 'Loyer',
    utilities: 'Charges (Eau, Électricité, Internet)',
    canal_sat: 'Canal+',
    common_areas: 'Parties communes',
    cleaning: 'Matériel de nettoyage',
    laundry: 'Blanchisserie',
    consumables: 'Consommables (Savon, Huile, etc.)',
    cleaning_material: 'Matériel de nettoyage',
    supplies: 'Fournitures',
    maintenance: 'Maintenance',
    wages: 'Conciergerie',
    taxes: 'Taxes & Impôts',
    transport: 'Transport',
    mobile_data: 'Données mobiles',
    marketing: 'Marketing',
    furnishings: 'Mobilier',
    security: 'Sécurité',
    other: 'Autre',
  };
  return labels[category] || category;
}

export function generateIncomeStatementHTML(
  data: IncomeStatementData,
  year: number,
  periodType: PeriodType,
  comparisonType: ComparisonType,
  currency: 'EUR' | 'FCFA' = 'FCFA'
): string {
  const currencyLabel = currency === 'FCFA' ? 'XAF' : 'EUR';
  const periodLabel = periodType === 'quarter' ? 'Trimestriel' : periodType === 'month' ? 'Mensuel' : 'Annuel';
  const comparisonLabel = comparisonType === 'lastYear' ? ' (Comparaison avec l\'année précédente)' : '';
  
  
  const formatAmount = (amount: number): string => {
    return formatAmountWithSeparator(amount, currency);
  };

  // Calculate the actual date range from selected periods
  const periodStartDate = data.periods.length > 0 
    ? data.periods.reduce((earliest, p) => p.startDate < earliest ? p.startDate : earliest, data.periods[0].startDate)
    : startOfYear(new Date(year, 0, 1));
  const periodEndDate = data.periods.length > 0
    ? data.periods.reduce((latest, p) => p.endDate > latest ? p.endDate : latest, data.periods[0].endDate)
    : endOfYear(new Date(year, 11, 31));
  
  // Format the date range in French
  const dateRange = `${format(periodStartDate, 'd MMMM', { locale: fr })} – ${format(periodEndDate, 'd MMMM yyyy', { locale: fr })} • Devise: ${currencyLabel}`;

  const periodHeaders = data.periods.map(p => `<th>${p.label}</th>`).join('');
  const totalHeader = '<th>Total</th>';
  const comparisonHeaders = comparisonType === 'lastYear' 
    ? data.comparison!.periods.map(p => `<th>${p.label} LY</th>`).join('')
    : '';
  
  const allHeaders = `<th>Account</th>${periodHeaders}${totalHeader}${comparisonHeaders}`;
  const colspan = data.periods.length + 1 + (comparisonType === 'lastYear' ? data.comparison!.periods.length : 0);
  
  // Determine if we need landscape mode (more than 5 data columns, excluding Account column)
  // Count: period columns + Total + comparison columns (Account column is not counted)
  const numDataColumns = data.periods.length + 1 + (comparisonType === 'lastYear' ? (data.comparison?.periods.length || 0) : 0);
  const useLandscape = numDataColumns > 5; // Only use landscape when MORE than 5 data columns

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>État des résultats - ZN&P Apartments</title>
  <style>
    :root{
      --text-main:#333333;
      --text-light:#666666;
      --border-color:#e0e0e0;
      --bg-hover:#f9f9f9;
      --black:#000;
      --neg:#b00020;
    }
    body{
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      color:var(--text-main);
      background:#fff;
      margin:0;
      padding:${useLandscape ? '15px' : '20px'};
      display:flex;
      justify-content:center;
    }
    .report-container{ width:100%; max-width:980px; }
    header{ text-align:center; margin-bottom:${useLandscape ? '15px' : '30px'}; }
    h1{ font-weight:400; font-size:${useLandscape ? '20px' : '26px'}; margin:0 0 8px; letter-spacing:.5px; }
    .report-type{ font-weight:700; font-size:${useLandscape ? '14px' : '18px'}; margin-bottom:6px; }
    .report-date{ color:var(--text-light); font-size:${useLandscape ? '12px' : '15px'}; }

    table{ width:100%; border-collapse:collapse; font-size:${useLandscape ? '9px' : '14px'}; }
    thead tr:first-child th{
      border-top:1.5px solid var(--black);
      padding-top:18px;
    }
    th{
      text-align:right;
      font-weight:700;
      padding:${useLandscape ? '6px 4px' : '12px 8px'};
      text-transform:uppercase;
      font-size:${useLandscape ? '9px' : '13px'};
      letter-spacing:1px;
      color:var(--text-light);
    }
    th:first-child{ text-align:left; width:${useLandscape ? '25%' : '40%'}; }

    td{
      padding:${useLandscape ? '4px 3px' : '10px 8px'};
      border-bottom:.5px solid transparent;
      vertical-align:top;
      font-size:${useLandscape ? '9px' : '14px'};
    }
    td:not(:first-child){
      text-align:right;
      width:${useLandscape ? 'auto' : '12%'};
      font-variant-numeric:tabular-nums;
    }
    tr:hover td{ background:var(--bg-hover); }

    .group-row td{
      font-weight:700;
      color:var(--text-light);
      padding-top:18px;
      text-transform:capitalize;
      letter-spacing:.2px;
    }
    .parent-row td:first-child{ padding-left:${useLandscape ? '12px' : '18px'}; }
    .child-row td:first-child{ padding-left:${useLandscape ? '24px' : '38px'}; color:var(--text-light); font-size:${useLandscape ? '9px' : '14px'}; }

    .kpi-row td{
      color:var(--text-main);
      font-size:${useLandscape ? '9px' : '14px'};
      padding-top:${useLandscape ? '4px' : '6px'};
      padding-bottom:${useLandscape ? '4px' : '6px'};
    }
    .kpi-row td:first-child{
      font-weight:600;
      color:var(--text-main);
      padding-left:18px;
    }

    .subtotal-row td{
      font-weight:800;
      border-top:1px solid var(--border-color);
      padding-top:${useLandscape ? '6px' : '10px'};
      background-color:#f5f5f5;
    }
    .total-row td{
      font-weight:800;
      border-top:1px solid var(--border-color);
      border-bottom:2px solid var(--black);
      padding:${useLandscape ? '8px 4px' : '12px 6px'};
      letter-spacing:.2px;
      background-color:#f5f5f5;
    }
    .neg{ color:var(--neg); }

    .note{
      margin-top:${useLandscape ? '12px' : '18px'};
      font-size:${useLandscape ? '10px' : '12px'};
      color:var(--text-light);
      line-height:1.5;
      border-top:1px solid var(--border-color);
      padding-top:${useLandscape ? '10px' : '14px'};
    }

    @media print{
      body{ padding:0; }
      .report-container{ max-width:none; }
      tr:hover td{ background:transparent; }
    }
    
    ${useLandscape ? `
    /* Landscape mode adjustments */
    body{ padding:15px; }
    .report-container{ max-width:100%; }
    header{ margin-bottom:15px; }
    table{ font-size:9px; }
    th{ padding:5px 3px; font-size:8px; }
    td{ padding:3px 2px; }
    .child-row td:first-child{ padding-left:20px; font-size:8px; }
    .kpi-row td{ font-size:9px; padding-top:3px; padding-bottom:3px; color:var(--text-main); }
    .kpi-row td:first-child{ color:var(--text-main); }
    .group-row td{ padding-top:10px; }
    ` : ''}
  </style>
</head>
<body>
  <div class="report-container">
    <header>
      <h1>ZN&P Apartments</h1>
      <div class="report-type">État des résultats (${periodLabel}${comparisonLabel})</div>
      <div class="report-date">${dateRange}</div>
    </header>

    <table>
      <thead>
        <tr>
          ${allHeaders}
        </tr>
      </thead>
      <tbody>`;

  // KPIs
  html += `
        <tr class="group-row">
          <td colspan="${colspan}">Indicateurs opérationnels (non-comptables)</td>
        </tr>`;
  
  const totalNights = data.kpis.nightsBooked.reduce((a, b) => a + b, 0);
  const avgNightPriceCells = data.kpis.nightsBooked.map((nights, i) => 
    nights > 0 ? formatAmount(data.kpis.avgNightPrice[i]) : '—'
  ).join('</td><td>');
  const avgOccupancy = data.kpis.occupancyRate.reduce((a, b) => a + b, 0) / data.kpis.occupancyRate.length;
  // Calculate overall average night price
  const totalRevenue = data.revenue.total.reduce((a, b) => a + b, 0);
  const overallAvgNightPrice = totalNights > 0 ? totalRevenue / totalNights : 0;
  
  html += `
        <tr class="kpi-row parent-row">
          <td>Nuits réservées</td>
          <td>${data.kpis.nightsBooked.join('</td><td>')}</td>
          <td>${totalNights}</td>
          ${comparisonType === 'lastYear' ? '<td>—</td><td>—</td><td>—</td><td>—</td>' : ''}
        </tr>
        <tr class="kpi-row parent-row">
          <td>Prix moyen par nuit (${currencyLabel})</td>
          <td>${avgNightPriceCells}</td>
          <td>${totalNights > 0 ? formatAmount(overallAvgNightPrice) : '—'}</td>
          ${comparisonType === 'lastYear' ? '<td>—</td><td>—</td><td>—</td><td>—</td>' : ''}
        </tr>
        <tr class="kpi-row parent-row">
          <td>Taux d'occupation</td>
          <td>${data.kpis.occupancyRate.map(r => `${Math.round(r)}%`).join('</td><td>')}</td>
          <td>${Math.round(avgOccupancy)}%</td>
          ${comparisonType === 'lastYear' ? '<td>—</td><td>—</td><td>—</td><td>—</td>' : ''}
        </tr>`;

  // Revenue (totalRevenue already calculated above)
  html += `
        <tr class="group-row">
          <td colspan="${colspan}">Revenus</td>
        </tr>
        <tr class="subtotal-row">
          <td>Revenus d'hébergement</td>
          <td>${data.revenue.accommodation.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(totalRevenue)}</td>
          ${comparisonType === 'lastYear' 
            ? `<td>${data.comparison!.revenue.total.map(formatAmount).join('</td><td>')}</td><td>${formatAmount(data.comparison!.revenue.total.reduce((a, b) => a + b, 0))}</td>` 
            : ''}
        </tr>`;

  // Fixed Costs
  const totalFixedCosts = data.fixedCosts.total.reduce((a, b) => a + b, 0);
  html += `
        <tr class="group-row">
          <td colspan="${colspan}">Coûts fixes</td>
        </tr>
        <tr class="parent-row">
          <td>${getCategoryLabel('rent')}</td>
          <td>${data.fixedCosts.rent.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(data.fixedCosts.rent.reduce((a, b) => a + b, 0))}</td>
          ${comparisonType === 'lastYear' ? '<td>—</td><td>—</td><td>—</td><td>—</td>' : ''}
        </tr>
        <tr class="parent-row">
          <td>${getCategoryLabel('common_areas')}</td>
          <td>${data.fixedCosts.commonAreas.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(data.fixedCosts.commonAreas.reduce((a, b) => a + b, 0))}</td>
          ${comparisonType === 'lastYear' ? '<td>—</td><td>—</td><td>—</td><td>—</td>' : ''}
        </tr>
        <tr class="parent-row">
          <td>Internet</td>
          <td>${data.fixedCosts.internet.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(data.fixedCosts.internet.reduce((a, b) => a + b, 0))}</td>
          ${comparisonType === 'lastYear' ? '<td>—</td><td>—</td><td>—</td><td>—</td>' : ''}
        </tr>
        <tr class="subtotal-row">
          <td>Total Coûts Fixes</td>
          <td>${data.fixedCosts.total.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(totalFixedCosts)}</td>
          ${comparisonType === 'lastYear' 
            ? `<td>${data.comparison!.fixedCosts.total.map(formatAmount).join('</td><td>')}</td><td>${formatAmount(data.comparison!.fixedCosts.total.reduce((a, b) => a + b, 0))}</td>` 
            : ''}
        </tr>`;

  // Gross Profit
  const totalGrossProfit = data.grossProfit.reduce((a, b) => a + b, 0);
  html += `
        <tr class="total-row">
          <td>BÉNÉFICE BRUT</td>
          <td>${data.grossProfit.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(totalGrossProfit)}</td>
          ${comparisonType === 'lastYear' 
            ? `<td>${data.comparison!.grossProfit.map(formatAmount).join('</td><td>')}</td><td>${formatAmount(data.comparison!.grossProfit.reduce((a, b) => a + b, 0))}</td>` 
            : ''}
        </tr>`;

  // Operational Costs
  const totalOperationalCosts = data.operationalCosts.total.reduce((a, b) => a + b, 0);
  html += `
        <tr class="group-row">
          <td colspan="${colspan}">Coûts opérationnels</td>
        </tr>`;
  
  // Utilities with breakdown (Internet moved to fixed costs)
  if (data.operationalCosts.categoriesToInclude.some(c => c.key === 'utilities')) {
    html += `
        <tr class="parent-row">
          <td>${getCategoryLabel('utilities')}</td>
          <td>${data.operationalCosts.utilities.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(data.operationalCosts.utilities.reduce((a, b) => a + b, 0))}</td>
          ${comparisonType === 'lastYear' ? '<td>—</td><td>—</td><td>—</td><td>—</td>' : ''}
        </tr>
        <tr class="child-row">
          <td>Électricité (ENEO)</td>
          <td>${data.operationalCosts.utilitiesElectricity.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(data.operationalCosts.utilitiesElectricity.reduce((a, b) => a + b, 0))}</td>
          ${comparisonType === 'lastYear' ? '<td>—</td><td>—</td><td>—</td><td>—</td>' : ''}
        </tr>
        <tr class="child-row">
          <td>Eau (Camwater)</td>
          <td>${data.operationalCosts.utilitiesWater.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(data.operationalCosts.utilitiesWater.reduce((a, b) => a + b, 0))}</td>
          ${comparisonType === 'lastYear' ? '<td>—</td><td>—</td><td>—</td><td>—</td>' : ''}
        </tr>`;
  }
  
  // Other categories (only include non-zero ones)
  data.operationalCosts.categoriesToInclude.forEach(cat => {
    if (cat.key === 'utilities') return; // Already handled above
    
    const categoryLabel = getCategoryLabel(cat.key);
    html += `
        <tr class="parent-row">
          <td>${categoryLabel}</td>
          <td>${cat.values.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(cat.values.reduce((a, b) => a + b, 0))}</td>
          ${comparisonType === 'lastYear' ? '<td>—</td><td>—</td><td>—</td><td>—</td>' : ''}
        </tr>`;
  });
  
  html += `
        <tr class="subtotal-row">
          <td>Total Coûts Opérationnels</td>
          <td>${data.operationalCosts.total.map(formatAmount).join('</td><td>')}</td>
          <td>${formatAmount(totalOperationalCosts)}</td>
          ${comparisonType === 'lastYear' 
            ? `<td>${data.comparison!.operationalCosts.total.map(formatAmount).join('</td><td>')}</td><td>${formatAmount(data.comparison!.operationalCosts.total.reduce((a, b) => a + b, 0))}</td>` 
            : ''}
        </tr>`;

  // Net Income
  const totalNetIncome = data.netIncome.reduce((a, b) => a + b, 0);
  const netIncomeClass = totalNetIncome < 0 ? ' class="neg"' : '';
  html += `
        <tr class="total-row">
          <td>RÉSULTAT NET</td>
          <td${netIncomeClass}>${data.netIncome.map(n => n < 0 ? `<span class="neg">${formatAmount(n)}</span>` : formatAmount(n)).join('</td><td>')}</td>
          <td${netIncomeClass}>${totalNetIncome < 0 ? `<span class="neg">${formatAmount(totalNetIncome)}</span>` : formatAmount(totalNetIncome)}</td>
          ${comparisonType === 'lastYear' 
            ? `<td>${data.comparison!.netIncome.map(n => n < 0 ? `<span class="neg">${formatAmount(n)}</span>` : formatAmount(n)).join('</td><td>')}</td><td>${data.comparison!.netIncome.reduce((a, b) => a + b, 0) < 0 ? `<span class="neg">${formatAmount(data.comparison!.netIncome.reduce((a, b) => a + b, 0))}</span>` : formatAmount(data.comparison!.netIncome.reduce((a, b) => a + b, 0))}</td>` 
            : ''}
        </tr>`;

  html += `
      </tbody>
    </table>
  </div>
</body>
</html>`;

  // Add landscape class to body if needed
  if (useLandscape) {
    html = html.replace('<body>', '<body class="landscape-mode">');
  }

  return html;
}

