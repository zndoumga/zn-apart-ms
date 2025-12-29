// Core types for the Airbnb Property Management System

export type UserMode = 'staff' | 'admin';
export type Currency = 'EUR' | 'FCFA';

// Re-export ToastData from store
export type { ToastData } from '../components/ui/Toast';

// Property types
export type PropertyStatus = 'active' | 'inactive' | 'maintenance';

export interface Property {
  id: string;
  name: string;
  address: string;
  description?: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  basePriceEUR: number;
  basePriceFCFA: number;
  cleaningFeeEUR: number;
  cleaningFeeFCFA: number;
  // Rent (separate from investment)
  rentPriceEUR?: number;
  rentPriceFCFA?: number;
  // Investment fields
  purchasePriceEUR?: number;
  purchasePriceFCFA?: number;
  travauxEUR?: number;
  travauxFCFA?: number;
  meublesEUR?: number;
  meublesFCFA?: number;
  equipementEUR?: number;
  equipementFCFA?: number;
  status: PropertyStatus;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyFormData {
  name: string;
  address: string;
  description?: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  basePriceEUR: number;
  basePriceFCFA: number;
  cleaningFeeEUR?: number;
  cleaningFeeFCFA?: number;
  // Rent (separate from investment)
  rentPriceEUR?: number;
  rentPriceFCFA?: number;
  // Investment fields
  purchasePriceEUR?: number;
  purchasePriceFCFA?: number;
  travauxEUR?: number;
  travauxFCFA?: number;
  meublesEUR?: number;
  meublesFCFA?: number;
  equipementEUR?: number;
  equipementFCFA?: number;
  status: PropertyStatus;
}

// Booking types
export type BookingSource = 'airbnb' | 'booking' | 'direct' | 'other';
export type BookingStatus = 'inquiry' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface BookingComment {
  id: string;
  bookingId: string;
  content: string;
  author: UserMode;
  createdAt: Date;
}

export interface Booking {
  id: string;
  propertyId: string;
  customerId?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPriceEUR: number;
  totalPriceFCFA: number;
  commissionEUR: number;
  commissionFCFA: number;
  cleaningFeeEUR: number;
  cleaningFeeFCFA: number;
  status: BookingStatus;
  source: BookingSource;
  notes?: string;
  checkInNotes?: string;
  paymentStatus: PaymentStatus;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingFormData {
  propertyId: string;
  customerId?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string | Date;
  checkOut: string | Date;
  guests: number;
  totalPriceEUR: number;
  totalPriceFCFA: number;
  commissionEUR?: number;
  commissionFCFA?: number;
  cleaningFeeEUR?: number;
  cleaningFeeFCFA?: number;
  status?: BookingStatus;
  source: BookingSource;
  notes?: string;
  paymentStatus?: PaymentStatus;
}

// Expense types
export type ExpenseCategory =
  | 'cleaning'
  | 'maintenance'
  | 'utilities'
  | 'supplies'
  | 'consumables'
  | 'laundry'
  | 'canal_sat'
  | 'wages'
  | 'taxes'
  | 'rent'
  | 'common_areas'
  | 'marketing'
  | 'furnishings'
  | 'security'
  | 'transport'
  | 'mobile_data'
  | 'cleaning_material'
  | 'other';

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Expense {
  id: string;
  propertyId?: string;
  category: ExpenseCategory;
  description: string;
  amountEUR: number;
  amountFCFA: number;
  date: Date;
  vendor?: string;
  receiptUrl?: string;
  notes?: string;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseFormData {
  propertyId?: string;
  category: ExpenseCategory;
  description: string;
  amountEUR: number;
  amountFCFA: number;
  date: string | Date;
  vendor?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  paidFromMobileMoney?: boolean;
}

// Recurring Expense Template
export interface RecurringExpense {
  id: string;
  propertyId?: string;
  category: ExpenseCategory;
  vendor?: string;
  description: string;
  amountEUR: number;
  amountFCFA: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringExpenseFormData {
  propertyId?: string;
  category: ExpenseCategory;
  vendor?: string;
  description: string;
  amountEUR: number;
  amountFCFA: number;
}

// Customer types
export type IDType = 'passport' | 'national_id' | 'drivers_license' | 'other';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  nationality?: string;
  countryOfResidence?: string;
  address?: string;
  dateOfBirth?: Date;
  idType?: IDType;
  idNumber?: string;
  idDocumentUrl?: string;
  signatureUrl?: string;
  preferredLanguage: string;
  notes?: string;
  totalBookings: number;
  totalSpentEUR: number;
  totalSpentFCFA: number;
  averageRating?: number;
  isVIP: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  nationality?: string;
  countryOfResidence?: string;
  address?: string;
  dateOfBirth?: string;
  idType?: IDType;
  idNumber?: string;
  idDocumentUrl?: string;
  signatureUrl?: string;
  preferredLanguage?: string;
  notes?: string;
  tags?: string[];
}

export interface CheckInFormData {
  guestName: string;
  email?: string;
  phone?: string;
  nationality: string;
  countryOfResidence?: string;
  address?: string;
  dateOfBirth?: string;
  idType: IDType;
  idNumber: string;
  idDocumentUrl?: string;
  signatureUrl?: string;
  checkInNotes?: string;
}

// Task types
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskAssignee = 'staff' | 'admin' | 'cleaning' | 'maintenance';

export interface Task {
  id: string;
  propertyId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: TaskAssignee;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFormData {
  propertyId?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  assignedTo?: TaskAssignee;
  dueDate?: string | Date;
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  author: UserMode;
  createdAt: Date;
}

export interface CustomerComment {
  id: string;
  customerId: string;
  content: string;
  author: UserMode;
  createdAt: Date;
}

// Request types
export type RequestCategory = 'money' | 'purchase' | 'maintenance' | 'question' | 'other';
export type RequestPriority = 'normal' | 'urgent';
export type RequestStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

export interface RequestComment {
  id: string;
  content: string;
  author: UserMode;
  createdAt: Date;
}

export interface StaffRequest {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  submittedBy: UserMode;
  resolvedBy?: UserMode;
  resolvedAt?: Date;
  comments: RequestComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestFormData {
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
}

// Mobile Money types
export type TransactionType = 'deposit' | 'withdrawal';

export interface MobileMoneyTransaction {
  id: string;
  type: TransactionType;
  amountEUR: number;
  amountFCFA: number;
  description: string;
  reference?: string;
  date: Date;
  createdAt: Date;
}

export interface TransferFormData {
  type: TransactionType;
  amountEUR: number;
  amountFCFA: number;
  description: string;
  reference?: string;
  date: string | Date;
}

// Maintenance types
export type MaintenanceCategory = 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'cleaning' | 'other';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface MaintenanceEntry {
  id: string;
  propertyId: string;
  category: MaintenanceCategory;
  description: string;
  date: Date;
  costEUR: number;
  costFCFA: number;
  provider?: string;
  status: MaintenanceStatus;
  beforePhotos: string[];
  afterPhotos: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceFormData {
  propertyId: string;
  category: MaintenanceCategory;
  description: string;
  date: string | Date;
  costEUR?: number;
  costFCFA?: number;
  provider?: string;
  status?: MaintenanceStatus;
  notes?: string;
}

// Audit Log types
export type AuditAction = 'create' | 'update' | 'delete';
export type AuditEntity =
  | 'property'
  | 'booking'
  | 'expense'
  | 'customer'
  | 'task'
  | 'request'
  | 'mobile_money'
  | 'maintenance'
  | 'settings';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  performedBy: UserMode;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  createdAt: Date;
}

// Settings types
export interface Settings {
  exchangeRate: number;
  lowBalanceThreshold: number;
  defaultCurrency: Currency;
  adminPasswordHash: string;
  updatedAt: Date;
}

// Dashboard types
export interface DashboardStats {
  occupancyRate: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
  revenueChange: number;
  mobileMoneyBalance: number;
  pendingTasks: number;
  unresolvedRequests: number;
  totalExpenses: number;
  netProfit: number;
}

// Filter types
export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

// Dropdown options
export const BOOKING_SOURCES: { value: BookingSource; label: string }[] = [
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'booking', label: 'Booking.com' },
  { value: 'direct', label: 'Direct' },
  { value: 'other', label: 'Autre' },
];

export const ID_TYPES: { value: IDType; label: string }[] = [
  { value: 'passport', label: 'Passeport' },
  { value: 'national_id', label: 'Carte d\'identité' },
  { value: 'drivers_license', label: 'Permis de conduire' },
  { value: 'other', label: 'Autre' },
];

export const BOOKING_STATUSES: { value: BookingStatus; label: string }[] = [
  { value: 'inquiry', label: 'Demande' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'checked_in', label: 'Check-in' },
  { value: 'checked_out', label: 'Check-out' },
  { value: 'cancelled', label: 'Annulée' },
];

// Statuses available when creating/editing a booking (check-in/out are set automatically)
export const BOOKING_FORM_STATUSES: { value: BookingStatus; label: string }[] = [
  { value: 'inquiry', label: 'Demande' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'cancelled', label: 'Annulée' },
];

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'rent', label: 'Loyer' },
  { value: 'utilities', label: 'Charges (Eau, Électricité, Internet)' },
  { value: 'canal_sat', label: 'Canal+' },
  { value: 'common_areas', label: 'Parties communes' },
  { value: 'cleaning', label: 'Nettoyage' },
  { value: 'laundry', label: 'Blanchisserie' },
  { value: 'consumables', label: 'Consommables (Savon, Huile, etc.)' },
  { value: 'cleaning_material', label: 'Matériel de nettoyage' },
  { value: 'supplies', label: 'Fournitures' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'wages', label: 'Salaires' },
  { value: 'taxes', label: 'Taxes & Impôts' },
  { value: 'transport', label: 'Transport' },
  { value: 'mobile_data', label: 'Données mobiles' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'furnishings', label: 'Mobilier' },
  { value: 'security', label: 'Sécurité' },
  { value: 'other', label: 'Autre' },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'Haute' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'low', label: 'Basse' },
];

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminée' },
];

export const REQUEST_CATEGORIES: { value: RequestCategory; label: string }[] = [
  { value: 'money', label: 'Demande d\'argent' },
  { value: 'purchase', label: 'Achat' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Autre' },
];

export const REQUEST_PRIORITIES: { value: RequestPriority; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
];

export const MAINTENANCE_CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: 'plumbing', label: 'Plomberie' },
  { value: 'electrical', label: 'Électricité' },
  { value: 'hvac', label: 'Climatisation' },
  { value: 'appliance', label: 'Électroménager' },
  { value: 'structural', label: 'Structure' },
  { value: 'cleaning', label: 'Nettoyage' },
  { value: 'other', label: 'Autre' },
];

export const MAINTENANCE_STATUSES: { value: MaintenanceStatus; label: string }[] = [
  { value: 'scheduled', label: 'Planifiée' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' },
];

export const PROPERTY_STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'En maintenance' },
];

export const AMENITIES: string[] = [
  'WiFi',
  'Climatisation',
  'Cuisine équipée',
  'TV',
  'Machine à laver',
  'Sèche-linge',
  'Parking',
  'Piscine',
  'Jardin',
  'Balcon',
  'Terrasse',
  'Ascenseur',
  'Générateur',
  'Eau chaude',
  'Sécurité 24h',
  'Espace de travail',
];
