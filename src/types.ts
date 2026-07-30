export type InvoiceType = 'efatura' | 'earsiv';

export type PricingModelType = 'standart' | 'toleransli' | 'kademeli' | 'yillik';

export interface StandartConfig {
  baseCount: number;
  baseFee: number;
  extraPerPerson: number;
}

export interface ToleransliConfig {
  baseCount: number;
  baseFee: number;
  extraPerPerson: number;
  tolerancePercent: number; // e.g., 10 for 10%
}

export interface KademeRange {
  min: number;
  max: number; // Use very high number for infinity
  fee: number;
}

export interface KademeliConfig {
  ranges: KademeRange[];
}

export interface YillikConfig {
  annualFee: number;
}

export interface PricingModel {
  type: PricingModelType;
  standartConfig?: StandartConfig;
  toleransliConfig?: ToleransliConfig;
  kademeliConfig?: KademeliConfig;
  yillikConfig?: YillikConfig;
}

export interface Firm {
  id: string;
  name: string;
  isVatIncluded: boolean; // true: KDV dahil, false: KDV hariç
  invoiceType: InvoiceType;
  taxNumber?: string; // required if earsiv
  address?: string; // required if earsiv
  pricingModel: PricingModel;
  healthDataFee?: number; // Pre-configured health data from secretary
  employeeCount?: number; // Last entered employee count
  parentFirmId?: string; // Link to parent (Merkez) firm if this is a Branch (Şube)
  serviceType?: 'both' | 'expert_only' | 'doctor_only'; // Service type split configuration
  hazardClass?: 'AZ TEHLİKELİ' | 'TEHLİKELİ' | 'ÇOK TEHLİKELİ'; // Hazard class
  groupName?: string; // Custom group name for E-Fatura / E-Arşiv grouping
}

export interface Invoice {
  id: string;
  firmId: string;
  firmName: string;
  invoiceType: InvoiceType;
  date: string; // YYYY-MM-DD
  employeeCount: number;
  baseAmount: number; // Calculated amount from pricing model
  healthAmount: number; // Extra health charge
  totalAmount: number; // baseAmount + healthAmount (KDV logic applied)
  isVatIncluded: boolean;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid';
  specialistFee: number; // Uzman ücreti (split from employee count baseAmount)
  doctorFee: number; // Hekim ücreti (split from employee count baseAmount)
  vatRate: number; // VAT rate at the time of creation (percentage, e.g., 20)
  vatAmount: number; // Total VAT amount included or added
  isApproved: boolean;
  approvalDate?: string;
  paymentDate?: string;
}

export interface Transaction {
  id: string;
  firmId: string;
  firmName: string;
  type: 'invoice' | 'payment' | 'debt_addition';
  date: string;
  amount: number;
  description: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
}

export interface SystemSettings {
  uzmanPercentage: number; // e.g., 60 (for 60%)
  hekimPercentage: number; // e.g., 40 (for 40%)
  kdvRate: number; // e.g., 20 (for 20% default KDV)
  vatRateExpert?: number; // Advanced: Specialist VAT Rate (default to kdvRate)
  vatRateDoctor?: number; // Advanced: Doctor VAT Rate (default to kdvRate)
  vatRateHealth?: number; // Advanced: Health/Extra VAT Rate (default to kdvRate)
  simpleDebtMode?: boolean; // Advanced: simplified debt mode
  vpsServerUrl?: string; // VPS Server URL for health data sync
  vpsApiKey?: string; // VPS API Secret Key for health data sync
}
