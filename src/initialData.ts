import { 
  Firm, 
  Invoice, 
  Transaction, 
  Expense, 
  ExpenseCategory, 
  SystemSettings,
  PricingModel
} from './types';
import * as XLSX from 'xlsx';

// Pre-seeded expense categories
export const initialExpenseCategories: ExpenseCategory[] = [
  { id: '1', name: 'Ofis Kirası' },
  { id: '2', name: 'Personel Maaşları' },
  { id: '3', name: 'Elektrik, Su, Doğalgaz' },
  { id: '4', name: 'Yol ve Yemek Giderleri' },
  { id: '5', name: 'Yazılım ve Sunucu Lisansları' },
  { id: '6', name: 'Sağlık Ekipmanları ve Sarf Malzemeleri' },
  { id: '7', name: 'Pazarlama ve Reklam Giderleri' },
  { id: '8', name: 'Muhasebe ve Müşavirlik' }
];

// Pre-seeded initial expenses for 12 months of the year 2026 (or early 2026)
export const initialExpenses: Expense[] = [
  // Jan 2026
  { id: 'exp-1', categoryId: '1', categoryName: 'Ofis Kirası', date: '2026-01-05', amount: 15000, note: 'Merkez Ofis Kira Ödemesi' },
  { id: 'exp-2', categoryId: '2', categoryName: 'Personel Maaşları', date: '2026-01-28', amount: 85000, note: 'Ocak Ayı Maaşları' },
  { id: 'exp-3', categoryId: '3', categoryName: 'Elektrik, Su, Doğalgaz', date: '2026-01-15', amount: 4200, note: 'Ocak Ayı Faturalar' },
  { id: 'exp-4', categoryId: '5', categoryName: 'Yazılım ve Sunucu Lisansları', date: '2026-01-10', amount: 2500, note: 'Bulut Yedekleme' },
  
  // Feb 2026
  { id: 'exp-5', categoryId: '1', categoryName: 'Ofis Kirası', date: '2026-02-05', amount: 15000, note: 'Merkez Ofis Kira Ödemesi' },
  { id: 'exp-6', categoryId: '2', categoryName: 'Personel Maaşları', date: '2026-02-28', amount: 85000, note: 'Şubat Ayı Maaşları' },
  { id: 'exp-7', categoryId: '3', categoryName: 'Elektrik, Su, Doğalgaz', date: '2026-02-15', amount: 3900, note: 'Şubat Ayı Faturalar' },
  { id: 'exp-8', categoryId: '6', categoryName: 'Sağlık Ekipmanları ve Sarf Malzemeleri', date: '2026-02-12', amount: 8400, note: 'İlk Yardım Setleri alımı' },

  // Mar 2026
  { id: 'exp-9', categoryId: '1', categoryName: 'Ofis Kirası', date: '2026-03-05', amount: 15000, note: 'Merkez Ofis Kira Ödemesi' },
  { id: 'exp-10', categoryId: '2', categoryName: 'Personel Maaşları', date: '2026-03-28', amount: 87000, note: 'Mart Ayı Maaşları' },
  { id: 'exp-11', categoryId: '4', categoryName: 'Yol ve Yemek Giderleri', date: '2026-03-20', amount: 5600, note: 'Saha denetim yemekleri' },
  
  // Apr 2026
  { id: 'exp-12', categoryId: '1', categoryName: 'Ofis Kirası', date: '2026-04-05', amount: 15000, note: 'Merkez Ofis Kira Ödemesi' },
  { id: 'exp-13', categoryId: '2', categoryName: 'Personel Maaşları', date: '2026-04-28', amount: 87000, note: 'Nisan Ayı Maaşları' },
  { id: 'exp-14', categoryId: '7', categoryName: 'Pazarlama ve Reklam Giderleri', date: '2026-04-18', amount: 12000, note: 'Google Ads Reklamları' },

  // May 2026
  { id: 'exp-15', categoryId: '1', categoryName: 'Ofis Kirası', date: '2026-05-05', amount: 15000, note: 'Merkez Ofis Kira Ödemesi' },
  { id: 'exp-16', categoryId: '2', categoryName: 'Personel Maaşları', date: '2026-05-28', amount: 92000, note: 'Mayıs Ayı Maaşları' },
  { id: 'exp-17', categoryId: '3', categoryName: 'Elektrik, Su, Doğalgaz', date: '2026-05-15', amount: 2100, note: 'Mayıs Ayı Faturalar' },

  // Jun 2026
  { id: 'exp-18', categoryId: '1', categoryName: 'Ofis Kirası', date: '2026-06-05', amount: 15000, note: 'Merkez Ofis Kira Ödemesi' },
  { id: 'exp-19', categoryId: '2', categoryName: 'Personel Maaşları', date: '2026-06-28', amount: 92000, note: 'Haziran Ayı Maaşları' },
  { id: 'exp-20', categoryId: '5', categoryName: 'Yazılım ve Sunucu Lisansları', date: '2026-06-12', amount: 3500, note: 'E-Fatura Entegrasyon Ücreti' },
  { id: 'exp-21', categoryId: '8', categoryName: 'Muhasebe ve Müşavirlik', date: '2026-06-20', amount: 6000, note: 'Müşavirlik Hizmet Bedeli' },

  // Jul 2026 (Current Month)
  { id: 'exp-22', categoryId: '1', categoryName: 'Ofis Kirası', date: '2026-07-05', amount: 18000, note: 'Merkez Ofis Kira Ödemesi (Zamlı)' },
  { id: 'exp-23', categoryId: '4', categoryName: 'Yol ve Yemek Giderleri', date: '2026-07-02', amount: 3500, note: 'Yol ve Yemek Ödemeleri' }
];

// Pre-seeded initial firms with various pricing models
export const initialFirms: Firm[] = [
  {
    id: 'firm-1',
    name: 'Anadolu İnşaat A.Ş.',
    isVatIncluded: false, // VAT Excluded (KDV Hariç)
    invoiceType: 'efatura',
    groupName: 'Sanayi & İnşaat',
    pricingModel: {
      type: 'standart',
      standartConfig: {
        baseCount: 20,
        baseFee: 3000,
        extraPerPerson: 75
      }
    },
    healthDataFee: 450, // Calculated from secretary database
    employeeCount: 25
  },
  {
    id: 'firm-2',
    name: 'Boğaziçi Teknoloji Ltd. Şti.',
    isVatIncluded: true, // VAT Included (KDV Dahil)
    invoiceType: 'earsiv',
    groupName: 'Teknoloji Grubu',
    taxNumber: '1234567890',
    address: 'Maslak Mah. Sanayi Cad. No:12 Kat:4 Şişli/İstanbul',
    pricingModel: {
      type: 'toleransli',
      toleransliConfig: {
        baseCount: 10,
        baseFee: 1500,
        extraPerPerson: 50,
        tolerancePercent: 10 // 10% tolerance, up to 11 employees
      }
    },
    healthDataFee: 120,
    employeeCount: 12 // 12 > 11 limit (1 exceeds tolerance, extra 50 charged)
  },
  {
    id: 'firm-3',
    name: 'Çağdaş Lojistik ve Taşımacılık',
    isVatIncluded: false,
    invoiceType: 'efatura',
    groupName: 'Lojistik & Depo',
    pricingModel: {
      type: 'kademeli',
      kademeliConfig: {
        ranges: [
          { min: 1, max: 10, fee: 1000 },
          { min: 11, max: 50, fee: 2500 },
          { min: 51, max: 200, fee: 5000 }
        ]
      }
    },
    healthDataFee: 0,
    employeeCount: 45 // Fits 11-50, fee should be 2500
  },
  {
    id: 'firm-4',
    name: 'Demir Madencilik Sanayi',
    isVatIncluded: true,
    invoiceType: 'efatura',
    groupName: 'Sanayi & İnşaat',
    pricingModel: {
      type: 'yillik',
      yillikConfig: {
        annualFee: 12000
      }
    },
    healthDataFee: 0,
    employeeCount: 50
  },
  {
    id: 'firm-5',
    name: 'Ege Gıda Pazarlama',
    isVatIncluded: false,
    invoiceType: 'earsiv',
    groupName: 'Gıda & Ticaret',
    taxNumber: '9876543210',
    address: 'Bornova Sanayi Sitesi 3. Sokak No:45 İzmir',
    pricingModel: {
      type: 'standart',
      standartConfig: {
        baseCount: 5,
 baseFee: 1000,
        extraPerPerson: 40
      }
    },
    healthDataFee: 280,
    employeeCount: 8 // 8 > 5 (3 exceeds, extra 3*40=120, base 1000, total base fee = 1120)
  },
  {
    id: 'firm-6',
    name: 'Fırat Tekstil Üretim A.Ş.',
    isVatIncluded: false,
    invoiceType: 'efatura',
    groupName: 'Sanayi & İnşaat',
    pricingModel: {
      type: 'toleransli',
      toleransliConfig: {
        baseCount: 50,
        baseFee: 8000,
        extraPerPerson: 100,
        tolerancePercent: 20 // 20% of 50 = 10, limit = 60
      }
    },
    healthDataFee: 950,
    employeeCount: 55 // Within limit 60, base fee stays 8000
  },
  {
    id: 'firm-7',
    name: 'Güven Güvenlik Hizmetleri',
    isVatIncluded: true,
    invoiceType: 'earsiv',
    groupName: 'Hizmet Sektörü',
    taxNumber: '4455667788',
    address: 'Kızılay Mah. Atatürk Bulvarı No:112 Çankaya/Ankara',
    pricingModel: {
      type: 'kademeli',
      kademeliConfig: {
        ranges: [
          { min: 1, max: 20, fee: 1800 },
          { min: 21, max: 100, fee: 3500 },
          { min: 101, max: 500, fee: 8000 }
        ]
      }
    },
    healthDataFee: 350,
    employeeCount: 15 // Fits 1-20, fee = 1800
  }
];

// Seed Transactions and historical invoices for January-June 2026
// This allows rendering realistic dashboard figures & debt tracking immediately.
export const generateInitialHistory = (): { invoices: Invoice[], transactions: Transaction[] } => {
  const invoices: Invoice[] = [];
  const transactions: Transaction[] = [];

  // System settings for seed data
  const defaultKdv = 20;

  // Let's create approved and paid invoices for Jan, Feb, Mar, Apr, May, Jun 2026
  const months = [
    { name: 'Ocak', suffix: '-01', days: 31, datePrefix: '2026-01-' },
    { name: 'Şubat', suffix: '-02', days: 28, datePrefix: '2026-02-' },
    { name: 'Mart', suffix: '-03', days: 31, datePrefix: '2026-03-' },
    { name: 'Nisan', suffix: '-04', days: 30, datePrefix: '2026-04-' },
    { name: 'Mayıs', suffix: '-05', days: 31, datePrefix: '2026-05-' },
    { name: 'Haziran', suffix: '-06', days: 30, datePrefix: '2026-06-' }
  ];

  let invoiceIdCounter = 1;
  let txIdCounter = 1;

  months.forEach((m, mIndex) => {
    initialFirms.forEach((f, fIndex) => {
      // Annual contract only pays in January
      if (f.pricingModel.type === 'yillik' && mIndex > 0) return;

      // Randomly change employee count slightly for historic data
      const empOffset = (fIndex % 3) - 1; // -1, 0, or +1
      const count = Math.max(2, (f.employeeCount || 10) + empOffset);

      // Calculate base amount
      let baseAmount = 0;
      const model = f.pricingModel;
      if (model.type === 'standart' && model.standartConfig) {
        const conf = model.standartConfig;
        baseAmount = conf.baseFee + Math.max(0, count - conf.baseCount) * conf.extraPerPerson;
      } else if (model.type === 'toleransli' && model.toleransliConfig) {
        const conf = model.toleransliConfig;
        const limit = Math.floor(conf.baseCount * (1 + conf.tolerancePercent / 100));
        baseAmount = conf.baseFee + Math.max(0, count - limit) * conf.extraPerPerson;
      } else if (model.type === 'kademeli' && model.kademeliConfig) {
        const conf = model.kademeliConfig;
        const range = conf.ranges.find(r => count >= r.min && count <= r.max);
        baseAmount = range ? range.fee : (conf.ranges[0]?.fee || 1000);
      } else if (model.type === 'yillik' && model.yillikConfig) {
        baseAmount = model.yillikConfig.annualFee;
      }

      const healthFee = f.healthDataFee ? f.healthDataFee * (1 + (fIndex % 2) * 0.1) : 0;
      const roundedHealthFee = Math.round(healthFee * 100) / 100;

      // Base amount and health calculation
      let totalAmount = baseAmount + roundedHealthFee;
      let vatAmount = 0;

      if (f.isVatIncluded) {
        vatAmount = Math.round((totalAmount - (totalAmount / (1 + defaultKdv / 100))) * 100) / 100;
      } else {
        vatAmount = Math.round((totalAmount * (defaultKdv / 100)) * 100) / 100;
        totalAmount = Math.round((totalAmount + vatAmount) * 100) / 100;
      }

      const specialistFee = Math.round(baseAmount * 0.6 * 100) / 100;
      const doctorFee = Math.round(baseAmount * 0.4 * 100) / 100;

      const invDate = `${m.datePrefix}${15 + (fIndex % 10)}`;
      const isPaid = mIndex < 4 || (mIndex === 4 && fIndex % 2 === 0); // older invoices are fully paid, May is half paid, June is pending

      const invId = `inv-seed-${invoiceIdCounter++}`;
      const newInvoice: Invoice = {
        id: invId,
        firmId: f.id,
        firmName: f.name,
        invoiceType: f.invoiceType,
        date: invDate,
        employeeCount: count,
        baseAmount,
        healthAmount: roundedHealthFee,
        totalAmount,
        isVatIncluded: f.isVatIncluded,
        status: isPaid ? 'paid' : 'approved',
        specialistFee,
        doctorFee,
        vatRate: defaultKdv,
        vatAmount,
        isApproved: true,
        approvalDate: invDate,
        paymentDate: isPaid ? `${m.datePrefix}25` : undefined
      };

      invoices.push(newInvoice);

      // Create transactions
      transactions.push({
        id: `tx-seed-${txIdCounter++}`,
        firmId: f.id,
        firmName: f.name,
        type: 'invoice',
        date: invDate,
        amount: totalAmount,
        description: `${m.name} Ayı Faturası`
      });

      if (isPaid) {
        transactions.push({
          id: `tx-seed-${txIdCounter++}`,
          firmId: f.id,
          firmName: f.name,
          type: 'payment',
          date: `${m.datePrefix}25`,
          amount: totalAmount,
          description: `${m.name} Ayı Fatura Tahsilatı`
        });
      }
    });
  });

  // Add some specific outstanding debt (borç) or custom manual payments/debts
  // Let's manually create a manual transaction
  transactions.push({
    id: `tx-seed-manual-1`,
    firmId: 'firm-1',
    firmName: 'Anadolu İnşaat A.Ş.',
    type: 'debt_addition',
    date: '2026-05-10',
    amount: 1200,
    description: 'Geçmiş Dönem Devreden Bakiye Yüklemesi'
  });

  return { invoices, transactions };
};

// Pricing model evaluation engine
export const calculateInvoiceFee = (
  firm: Firm, 
  employeeCount: number, 
  extraHealth: number,
  vatRate: number,
  vatRateExpert?: number,
  vatRateDoctor?: number,
  vatRateHealth?: number,
  allFirms?: Firm[],
  allInputs?: Record<string, { employeeCount: number; healthAmount: number; extraNote: string }>
): {
  baseAmount: number;
  healthAmount: number;
  subTotal: number;
  vatAmount: number;
  totalAmount: number;
  specialistFee: number;
  doctorFee: number;
  isBranch?: boolean;
  poolDetails?: {
    totalCount: number;
    childCount: number;
  }
} => {
  // 1. If this is a branch (Şube) and we are doing a full system rollup, its individual invoice amount should be 0.
  if (allFirms && firm.parentFirmId) {
    return {
      baseAmount: 0,
      healthAmount: 0,
      subTotal: 0,
      vatAmount: 0,
      totalAmount: 0,
      specialistFee: 0,
      doctorFee: 0,
      isBranch: true
    };
  }

  // Helper to calculate standard single firm fee
  const calculateSingleFirmBase = (targetFirm: Firm, count: number): number => {
    let price = 0;
    const model = targetFirm.pricingModel;

    if (model.type === 'standart' && model.standartConfig) {
      const config = model.standartConfig;
      if (count <= config.baseCount) {
        price = config.baseFee;
      } else {
        price = config.baseFee + (count - config.baseCount) * config.extraPerPerson;
      }
    } else if (model.type === 'toleransli' && model.toleransliConfig) {
      const config = model.toleransliConfig;
      const limit = Math.floor(config.baseCount * (1 + config.tolerancePercent / 100));
      if (count <= limit) {
        price = config.baseFee;
      } else {
        price = config.baseFee + (count - limit) * config.extraPerPerson;
      }
    } else if (model.type === 'kademeli' && model.kademeliConfig) {
      const config = model.kademeliConfig;
      const range = config.ranges.find(r => count >= r.min && count <= r.max);
      if (range) {
        price = range.fee;
      } else {
        price = config.ranges[0]?.fee || 0;
      }
    } else if (model.type === 'yillik' && model.yillikConfig) {
      price = model.yillikConfig.annualFee;
    }
    return price;
  };

  // Start with parent firm calculations
  let baseAmount = calculateSingleFirmBase(firm, employeeCount);
  let healthAmount = extraHealth || 0;
  let totalPoolEmployeeCount = employeeCount;
  let childCount = 0;

  // Roll up children if we are Ana Firma
  if (allFirms) {
    const children = allFirms.filter(f => f.parentFirmId === firm.id);
    childCount = children.length;
    children.forEach(child => {
      const childInput = allInputs && allInputs[child.id] ? allInputs[child.id] : { employeeCount: child.employeeCount || child.pricingModel.standartConfig?.baseCount || 10, healthAmount: 0, extraNote: '' };
      const childBase = calculateSingleFirmBase(child, childInput.employeeCount);
      baseAmount += childBase;
      healthAmount += childInput.healthAmount || 0;
      totalPoolEmployeeCount += childInput.employeeCount;
    });
  }

  // Service Type splitting percentages
  let finalExpertRate = 60;
  let finalDoctorRate = 40;
  if (firm.serviceType === 'expert_only') {
    finalExpertRate = 100;
    finalDoctorRate = 0;
  } else if (firm.serviceType === 'doctor_only') {
    finalExpertRate = 0;
    finalDoctorRate = 100;
  }

  // VAT rates
  const vExpert = vatRateExpert !== undefined ? vatRateExpert : vatRate;
  const vDoctor = vatRateDoctor !== undefined ? vatRateDoctor : vatRate;
  const vHealth = vatRateHealth !== undefined ? vatRateHealth : vatRate;

  // Base raw parts
  const rawExpertPart = baseAmount * (finalExpertRate / 100);
  const rawDoctorPart = baseAmount * (finalDoctorRate / 100);
  const rawHealthPart = healthAmount;

  let subTotal = 0;
  let vatAmount = 0;
  let totalAmount = 0;
  let specialistFee = 0;
  let doctorFee = 0;

  if (firm.isVatIncluded) {
    // VAT is already included (girdiler brüt)
    totalAmount = baseAmount + healthAmount;
    const expertVat = rawExpertPart > 0 ? (rawExpertPart - (rawExpertPart / (1 + vExpert / 100))) : 0;
    const doctorVat = rawDoctorPart > 0 ? (rawDoctorPart - (rawDoctorPart / (1 + vDoctor / 100))) : 0;
    const healthVat = rawHealthPart > 0 ? (rawHealthPart - (rawHealthPart / (1 + vHealth / 100))) : 0;
    
    vatAmount = Math.round((expertVat + doctorVat + healthVat) * 100) / 100;
    subTotal = Math.round((totalAmount - vatAmount) * 100) / 100;
    specialistFee = Math.round((rawExpertPart - expertVat) * 100) / 100;
    doctorFee = Math.round((rawDoctorPart - doctorVat) * 100) / 100;
  } else {
    // VAT is excluded (girdiler net)
    specialistFee = Math.round(rawExpertPart * 100) / 100;
    doctorFee = Math.round(rawDoctorPart * 100) / 100;
    const expertVat = rawExpertPart * (vExpert / 100);
    const doctorVat = rawDoctorPart * (vDoctor / 100);
    const healthVat = rawHealthPart * (vHealth / 100);

    vatAmount = Math.round((expertVat + doctorVat + healthVat) * 100) / 100;
    subTotal = Math.round((baseAmount + healthAmount) * 100) / 100;
    totalAmount = Math.round((subTotal + vatAmount) * 100) / 100;
  }

  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    healthAmount: Math.round(healthAmount * 100) / 100,
    subTotal,
    vatAmount,
    totalAmount,
    specialistFee,
    doctorFee,
    isBranch: false,
    poolDetails: childCount > 0 ? {
      totalCount: totalPoolEmployeeCount,
      childCount
    } : undefined
  };
};

// Simple utility to format currency in Turkish Lira
export const formatLira = (value: number): string => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

// Excel (XLSX) Export Helper using SheetJS (xlsx package)
export const downloadExcel = (data: any[], filename: string, headers: string[]) => {
  // Construct grid array with headers and row data
  const worksheetData = [headers, ...data];

  // Convert array of arrays to sheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set default column widths for clear presentation
  worksheet['!cols'] = Array(headers.length).fill({ wch: 20 });

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cari Ekstre');

  // Trigger download of real .xlsx binary
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
