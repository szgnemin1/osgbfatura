import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Settings2, 
  SlidersHorizontal, 
  FileCheck, 
  BookOpen, 
  Clock, 
  TrendingDown, 
  Settings,
  Percent,
  X,
  PlusSquare,
  Sparkles,
  Menu,
  Download,
  Upload,
  Server,
  Key,
  RefreshCw,
  Activity,
  Copy,
  Rss,
  Plus,
  LogOut
} from 'lucide-react';

// Type imports
import { 
  Firm, 
  Invoice, 
  Transaction, 
  Expense, 
  ExpenseCategory, 
  SystemSettings,
  PricingModel
} from './types';

// Helper and Seed imports
import { 
  initialExpenseCategories, 
  initialExpenses, 
  initialFirms, 
  generateInitialHistory 
} from './initialData';

// Component imports
import DashboardView from './components/DashboardView';
import PricingView from './components/PricingView';
import InvoicePrepView from './components/InvoicePrepView';
import InvoicesToIssueView from './components/InvoicesToIssueView';
import CariDetailView from './components/CariDetailView';
import DebtTrackingView from './components/DebtTrackingView';
import ExpenseManagementView from './components/ExpenseManagementView';
import SettingsView from './components/SettingsView';

export default function App() {
  // 1. Initial State Load (loading from localStorage, falling back to seed history)
  const [firms, setFirms] = useState<Firm[]>(() => {
    try {
      const saved = localStorage.getItem('fcts_firms');
      if (!saved) return initialFirms;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : initialFirms;
    } catch {
      return initialFirms;
    }
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem('fcts_invoices');
      if (!saved) return generateInitialHistory().invoices;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : generateInitialHistory().invoices;
    } catch {
      return generateInitialHistory().invoices;
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('fcts_transactions');
      if (!saved) return generateInitialHistory().transactions;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : generateInitialHistory().transactions;
    } catch {
      return generateInitialHistory().transactions;
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('fcts_expenses');
      if (!saved) return initialExpenses;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : initialExpenses;
    } catch {
      return initialExpenses;
    }
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>(() => {
    try {
      const saved = localStorage.getItem('fcts_categories');
      if (!saved) return initialExpenseCategories;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : initialExpenseCategories;
    } catch {
      return initialExpenseCategories;
    }
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('fcts_settings');
    const defaults = {
      uzmanPercentage: 60,
      hekimPercentage: 40,
      kdvRate: 20,
      vatRateExpert: 20,
      vatRateDoctor: 10,
      vatRateHealth: 10,
      simpleDebtMode: false,
      vpsServerUrl: '/api/health-sync/latest',
      vpsApiKey: 'vps_secure_secret_2026'
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed };
      } catch (e) {
        return defaults;
      }
    }
    return defaults;
  });

  // Current active page tab (1: Ana Sayfa, 2: Fiyatlandırma, 3: Fatura Hazırlık, 4: Kesilecek Fatura, 5: Cari Detay, 6: Borç Takip, 7: Gider Yönetimi)
  const [activeTab, setActiveTab] = useState<number>(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Settings overlay modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // System Update States
  const [checkingSystemUpdate, setCheckingSystemUpdate] = useState(false);
  const [systemUpdateStatus, setSystemUpdateStatus] = useState<any>(null);
  const [updatingSystem, setUpdatingSystem] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);

  // Form states for Settings Modal
  const [settingsUzman, setSettingsUzman] = useState(settings.uzmanPercentage);
  const [settingsHekim, setSettingsHekim] = useState(settings.hekimPercentage);
  const [settingsKdv, setSettingsKdv] = useState(settings.kdvRate);
  const [settingsVatExpert, setSettingsVatExpert] = useState(settings.vatRateExpert !== undefined ? settings.vatRateExpert : settings.kdvRate);
  const [settingsVatDoctor, setSettingsVatDoctor] = useState(settings.vatRateDoctor !== undefined ? settings.vatRateDoctor : settings.kdvRate);
  const [settingsVatHealth, setSettingsVatHealth] = useState(settings.vatRateHealth !== undefined ? settings.vatRateHealth : settings.kdvRate);
  const [settingsSimpleDebtMode, setSettingsSimpleDebtMode] = useState(!!settings.simpleDebtMode);
  const [settingsVpsUrl, setSettingsVpsUrl] = useState(settings.vpsServerUrl || '/api/health-sync/latest');
  const [settingsVpsKey, setSettingsVpsKey] = useState(settings.vpsApiKey || 'vps_secure_secret_2026');
  const [testingVpsConnection, setTestingVpsConnection] = useState(false);

  // Health Sync Live Test Simulator States
  const [simulatedFirmName, setSimulatedFirmName] = useState('');
  const [simulatedAmount, setSimulatedAmount] = useState('');
  const [isSimulatingPost, setIsSimulatingPost] = useState(false);

  // 2. Sync to localStorage on every state change
  useEffect(() => {
    localStorage.setItem('fcts_firms', JSON.stringify(firms));
  }, [firms]);

  useEffect(() => {
    localStorage.setItem('fcts_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('fcts_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('fcts_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('fcts_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('fcts_settings', JSON.stringify(settings));
  }, [settings]);

  // Load form values once settings state is populated
  useEffect(() => {
    setSettingsUzman(settings.uzmanPercentage);
    setSettingsHekim(settings.hekimPercentage);
    setSettingsKdv(settings.kdvRate);
    setSettingsVatExpert(settings.vatRateExpert !== undefined ? settings.vatRateExpert : settings.kdvRate);
    setSettingsVatDoctor(settings.vatRateDoctor !== undefined ? settings.vatRateDoctor : settings.kdvRate);
    setSettingsVatHealth(settings.vatRateHealth !== undefined ? settings.vatRateHealth : settings.kdvRate);
    setSettingsSimpleDebtMode(!!settings.simpleDebtMode);
    setSettingsVpsUrl(settings.vpsServerUrl || '/api/health-sync/latest');
    setSettingsVpsKey(settings.vpsApiKey || 'vps_secure_secret_2026');
  }, [settings]);

  // 3. State Actions & Handlers

  // Save general settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (settingsUzman + settingsHekim !== 100) {
      alert('Hata: Uzman ve Hekim yüzdelerinin toplamı 100 olmalıdır!');
      return;
    }
    
    setSettings({
      uzmanPercentage: settingsUzman,
      hekimPercentage: settingsHekim,
      kdvRate: settingsKdv,
      vatRateExpert: settingsVatExpert,
      vatRateDoctor: settingsVatDoctor,
      vatRateHealth: settingsVatHealth,
      simpleDebtMode: settingsSimpleDebtMode,
      vpsServerUrl: settingsVpsUrl,
      vpsApiKey: settingsVpsKey
    });
    
    setShowSettingsModal(false);
    alert('Sistem ve VPS entegrasyon parametreleri başarıyla güncellendi.');
  };

  // Download all systems data in the requested JSON backup format
  const handleDownloadBackup = () => {
    // 1. Build preparation list based on current active state of firms
    const preparation = firms.map(f => ({
      firmId: f.id,
      currentEmployeeCount: f.employeeCount || 10,
      extraItemAmount: f.healthDataFee || 0,
      addYearlyFee: false
    }));

    // 2. Build transactions list following the requested format
    const backupTransactions = [
      ...transactions.map(t => {
        const inv = invoices.find(i => i.id === t.id || (i.firmId === t.firmId && i.date === t.date));
        const credit = t.type === 'payment' ? t.amount : 0;
        const debt = t.type === 'payment' ? 0 : t.amount;
        const dateParts = t.date.split('-');
        const month = dateParts[1] ? parseInt(dateParts[1], 10) : 7;
        const year = dateParts[0] ? parseInt(dateParts[0], 10) : 2026;
        
        return {
          firmId: t.firmId,
          date: t.date.includes('T') ? t.date : `${t.date}T12:00:00.000Z`,
          type: t.type === 'invoice' ? 'FATURA' : (t.type === 'payment' ? 'TAHSILAT' : 'BORC'),
          invoiceType: inv?.invoiceType === 'earsiv' ? 'E-Arşiv' : 'E-Fatura',
          description: t.description,
          debt,
          credit,
          month,
          year,
          status: inv?.status === 'paid' ? 'PAID' : 'APPROVED',
          calculatedDetails: {
            employeeCount: inv?.employeeCount || 0,
            extraItemAmount: inv?.healthAmount || 0,
            expertShare: inv?.specialistFee || 0,
            doctorShare: inv?.doctorFee || 0
          },
          id: t.id
        };
      }),
      ...invoices.filter(i => i.status === 'pending_approval').map(inv => {
        const dateParts = inv.date.split('-');
        const month = dateParts[1] ? parseInt(dateParts[1], 10) : 7;
        const year = dateParts[0] ? parseInt(dateParts[0], 10) : 2026;

        return {
          firmId: inv.firmId,
          date: inv.date.includes('T') ? inv.date : `${inv.date}T12:00:00.000Z`,
          type: 'FATURA',
          invoiceType: inv.invoiceType === 'earsiv' ? 'E-Arşiv' : 'E-Fatura',
          description: `${inv.firmName} Hizmet Bedeli - Fatura Taslağı`,
          debt: inv.totalAmount,
          credit: 0,
          month,
          year,
          status: 'PENDING',
          calculatedDetails: {
            employeeCount: inv.employeeCount,
            extraItemAmount: inv.healthAmount,
            expertShare: inv.specialistFee,
            doctorShare: inv.doctorFee
          },
          id: inv.id
        };
      })
    ];

    // 3. Build firms list following the requested format
    const backupFirms = firms.map(f => {
      const isKdvExcluded = !f.isVatIncluded;
      const basePersonLimit = f.pricingModel.standartConfig?.baseCount || f.pricingModel.toleransliConfig?.baseCount || 10;
      const baseFee = f.pricingModel.standartConfig?.baseFee || f.pricingModel.toleransliConfig?.baseFee || 0;
      const extraPersonFee = f.pricingModel.standartConfig?.extraPerPerson || f.pricingModel.toleransliConfig?.extraPerPerson || 0;
      const tolerancePercentage = f.pricingModel.toleransliConfig?.tolerancePercent || 10;
      const yearlyFee = f.pricingModel.yillikConfig?.annualFee || 0;
      const tiers = f.pricingModel.kademeliConfig?.ranges || [];

      return {
        name: f.name,
        parentFirmId: f.parentFirmId || "",
        basePersonLimit,
        baseFee,
        extraPersonFee,
        expertPercentage: settings.uzmanPercentage,
        doctorPercentage: settings.hekimPercentage,
        defaultInvoiceType: f.invoiceType === 'earsiv' ? 'E-Arşiv' : 'E-Fatura',
        taxNumber: f.taxNumber || "",
        address: f.address || "",
        yearlyFee,
        pricingModel: f.pricingModel.type.toUpperCase(),
        tolerancePercentage,
        tiers,
        serviceType: f.serviceType ? f.serviceType.toUpperCase() : "BOTH",
        isKdvExcluded,
        hasSecondaryModel: false,
        secondaryPricingModel: "STANDART",
        secondaryBaseFee: 0,
        secondaryBasePersonLimit: 0,
        secondaryExtraPersonFee: 0,
        secondaryTiers: [],
        id: f.id
      };
    });

    // 4. Construct complete backup object
    const backupData = {
      firms: backupFirms,
      transactions: backupTransactions,
      preparation,
      globalSettings: {
        uzmanPercentage: settings.uzmanPercentage,
        hekimPercentage: settings.hekimPercentage,
        kdvRate: settings.kdvRate,
        vatRateExpert: settings.vatRateExpert !== undefined ? settings.vatRateExpert : settings.kdvRate,
        vatRateDoctor: settings.vatRateDoctor !== undefined ? settings.vatRateDoctor : settings.kdvRate,
        vatRateHealth: settings.vatRateHealth !== undefined ? settings.vatRateHealth : settings.kdvRate,
        simpleDebtMode: settings.simpleDebtMode || false
      },
      expenseCategories: categories,
      expenses,
      backupDate: new Date().toISOString(),
      version: "2.2.0"
    };

    // 5. Trigger download
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fcts_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Upload and parse JSON backup, restoring system state
  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data || !Array.isArray(data.firms)) {
          alert('Geçersiz yedek dosyası formatı! Dosya "firms" dizisini içermelidir.');
          return;
        }

        if (confirm('Dikkat! Mevcut tüm verileriniz silinecek ve yedek dosyasındaki veriler yüklenecektir. Devam etmek istiyor musunuz?')) {
          // 1. Process and Restore Global Settings
          if (data.globalSettings && typeof data.globalSettings === 'object') {
            const gs = data.globalSettings;
            setSettings({
              uzmanPercentage: typeof gs.uzmanPercentage === 'number' ? gs.uzmanPercentage : 60,
              hekimPercentage: typeof gs.hekimPercentage === 'number' ? gs.hekimPercentage : 40,
              kdvRate: typeof gs.kdvRate === 'number' ? gs.kdvRate : 20,
              vatRateExpert: typeof gs.vatRateExpert === 'number' ? gs.vatRateExpert : gs.kdvRate || 20,
              vatRateDoctor: typeof gs.vatRateDoctor === 'number' ? gs.vatRateDoctor : gs.kdvRate || 20,
              vatRateHealth: typeof gs.vatRateHealth === 'number' ? gs.vatRateHealth : gs.kdvRate || 20,
              simpleDebtMode: !!gs.simpleDebtMode
            });
          }

          // 2. Process and Restore Firms
          const parsedFirms: Firm[] = data.firms.map((f: any) => {
            // Determine pricing model type and configs
            const pModelTypeRaw = f.pricingModel || 'STANDART';
            const pModelType = pModelTypeRaw.toLowerCase(); // 'standart' | 'toleransli' | 'kademeli' | 'yillik'
            
            // Build pricing model config
            const pricingModel: PricingModel = {
              type: pModelType as any
            };

            if (pModelType === 'standart') {
              pricingModel.standartConfig = {
                baseCount: f.basePersonLimit || 10,
                baseFee: f.baseFee || 0,
                extraPerPerson: f.extraPersonFee || 0
              };
            } else if (pModelType === 'toleransli') {
              pricingModel.toleransliConfig = {
                baseCount: f.basePersonLimit || 10,
                baseFee: f.baseFee || 0,
                extraPerPerson: f.extraPersonFee || 0,
                tolerancePercent: f.tolerancePercentage || 10
              };
            } else if (pModelType === 'kademeli') {
              pricingModel.kademeliConfig = {
                ranges: Array.isArray(f.tiers) ? f.tiers : []
              };
            } else if (pModelType === 'yillik') {
              pricingModel.yillikConfig = {
                annualFee: f.yearlyFee || 0
              };
            }

            // Find matching preparation values
            const prep = Array.isArray(data.preparation) ? data.preparation.find((p: any) => p.firmId === f.id) : null;
            const employeeCount = prep ? prep.currentEmployeeCount : (f.employeeCount || 10);
            const healthDataFee = prep ? prep.extraItemAmount : (f.healthDataFee || 0);

            return {
              id: f.id || `firm-${Date.now()}-${Math.random()}`,
              name: f.name || 'İsimsiz Firma',
              isVatIncluded: f.isKdvExcluded !== undefined ? !f.isKdvExcluded : !(f.isVatIncluded === false),
              invoiceType: (f.defaultInvoiceType === 'E-Arşiv' || f.invoiceType === 'earsiv') ? 'earsiv' : 'efatura',
              taxNumber: f.taxNumber || '',
              address: f.address || '',
              pricingModel,
              healthDataFee,
              employeeCount,
              parentFirmId: f.parentFirmId || '',
              serviceType: (f.serviceType === 'EXPERT_ONLY' || f.serviceType === 'expert_only') ? 'expert_only' :
                           (f.serviceType === 'DOCTOR_ONLY' || f.serviceType === 'doctor_only') ? 'doctor_only' : 'both'
            };
          });

          setFirms(parsedFirms);

          // 3. Process and Restore Expenses & Expense Categories
          if (Array.isArray(data.expenseCategories)) {
            setCategories(data.expenseCategories);
          }
          if (Array.isArray(data.expenses)) {
            setExpenses(data.expenses);
          }

          // 4. Process and Restore Invoices & Transactions
          const restoredInvoices: Invoice[] = [];
          const restoredTransactions: Transaction[] = [];

          if (Array.isArray(data.transactions)) {
            data.transactions.forEach((tx: any) => {
              const fId = tx.firmId;
              const firmObj = parsedFirms.find(pf => pf.id === fId);
              const fName = firmObj ? firmObj.name : (tx.description || 'Bilinmeyen Firma');
              const txType = (tx.type || '').toUpperCase();
              const isPending = (tx.status || '').toUpperCase() === 'PENDING';

              const dateStr = tx.date ? tx.date.split('T')[0] : '2026-07-07';

              if (txType === 'FATURA' || txType === 'INVOICE') {
                const totalAmt = tx.debt || tx.amount || 0;
                const extraAmt = tx.calculatedDetails?.extraItemAmount || 0;
                const baseAmt = totalAmt - extraAmt;
                const empCount = tx.calculatedDetails?.employeeCount || tx.employeeCount || 10;
                const specFee = tx.calculatedDetails?.expertShare || 0;
                const docFee = tx.calculatedDetails?.doctorShare || 0;

                const newInvoice: Invoice = {
                  id: tx.id || `inv-${Date.now()}-${Math.random()}`,
                  firmId: fId,
                  firmName: fName,
                  invoiceType: (tx.invoiceType === 'E-Arşiv' || tx.invoiceType === 'earsiv') ? 'earsiv' : 'efatura',
                  date: dateStr,
                  employeeCount: empCount,
                  baseAmount: baseAmt,
                  healthAmount: extraAmt,
                  totalAmount: totalAmt,
                  isVatIncluded: firmObj ? firmObj.isVatIncluded : false,
                  status: isPending ? 'pending_approval' : (tx.status?.toLowerCase() === 'paid' ? 'paid' : 'approved'),
                  specialistFee: specFee,
                  doctorFee: docFee,
                  vatRate: data.globalSettings?.kdvRate || 20,
                  vatAmount: 0,
                  isApproved: !isPending,
                  approvalDate: isPending ? undefined : dateStr,
                  paymentDate: tx.status?.toLowerCase() === 'paid' ? dateStr : undefined
                };
                restoredInvoices.push(newInvoice);

                if (!isPending) {
                  // Approved or paid fatura creates ledger entry
                  restoredTransactions.push({
                    id: tx.id || `tx-${Date.now()}-${Math.random()}`,
                    firmId: fId,
                    firmName: fName,
                    type: 'invoice',
                    date: dateStr,
                    amount: totalAmt,
                    description: tx.description || `${dateStr} Tarihli Hizmet Faturası`
                  });

                  if (tx.status?.toLowerCase() === 'paid') {
                    // Also create corresponding payment ledger entry to balance it
                    restoredTransactions.push({
                      id: `tx-pay-${tx.id || Date.now()}`,
                      firmId: fId,
                      firmName: fName,
                      type: 'payment',
                      date: dateStr,
                      amount: totalAmt,
                      description: `${tx.description || 'Fatura'} Tahsilat Kapama`
                    });
                  }
                }
              } else if (txType === 'TAHSILAT' || txType === 'ODEME' || txType === 'PAYMENT') {
                restoredTransactions.push({
                  id: tx.id || `tx-${Date.now()}-${Math.random()}`,
                  firmId: fId,
                  firmName: fName,
                  type: 'payment',
                  date: dateStr,
                  amount: tx.credit || tx.amount || 0,
                  description: tx.description || 'Ödeme Tahsilatı'
                });
              } else if (txType === 'BORC' || txType === 'DEBT') {
                restoredTransactions.push({
                  id: tx.id || `tx-${Date.now()}-${Math.random()}`,
                  firmId: fId,
                  firmName: fName,
                  type: 'debt_addition',
                  date: dateStr,
                  amount: tx.debt || tx.amount || 0,
                  description: tx.description || 'Borç İlavesi'
                });
              }
            });
          }

          setInvoices(restoredInvoices);
          setTransactions(restoredTransactions);

          alert('Yedek başarıyla geri yüklendi!');
          setShowSettingsModal(false);
        }
      } catch (err) {
        console.error(err);
        alert('Yedek yükleme başarısız! Geçersiz JSON formatı.');
      }
    };
    reader.readAsText(file);
  };

  // Add/Save Firm configuration
  const handleSaveFirm = (updatedFirm: Firm) => {
    setFirms(prev => prev.map(f => f.id === updatedFirm.id ? updatedFirm : f));
  };

  // Delete an existing firm
  const handleDeleteFirm = (firmId: string) => {
    const firmToDelete = firms.find(f => f.id === firmId);
    if (!firmToDelete) return;

    if (confirm(`"${firmToDelete.name}" firmasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      setFirms(prev => prev.filter(f => f.id !== firmId));
      alert(`"${firmToDelete.name}" firması sistemden silindi.`);
    }
  };

  // Add a brand new firm
  const handleAddFirm = (firmOrName: Firm | string) => {
    if (typeof firmOrName === 'object' && firmOrName !== null) {
      setFirms(prev => [...prev, firmOrName]);
    } else {
      const newFirm: Firm = {
        id: `firm-${Date.now()}`,
        name: String(firmOrName),
        isVatIncluded: false,
        invoiceType: 'efatura',
        pricingModel: {
          type: 'standart',
          standartConfig: {
            baseCount: 10,
            baseFee: 1000,
            extraPerPerson: 50
          }
        }
      };
      setFirms(prev => [...prev, newFirm]);
    }
  };

  // Sent from Fatura Hazırlık page into pending approval queue
  const handleSendToIssue = (draftInv: Partial<Invoice>) => {
    const fullInvoice: Invoice = {
      ...draftInv,
      id: `inv-draft-${Date.now()}`,
      date: '2026-07-07', // Current simulated date
      status: 'pending_approval',
      isApproved: false
    } as Invoice;

    setInvoices(prev => [fullInvoice, ...prev]);

    // Update the last entered employee count for this firm
    if (draftInv.firmId && draftInv.employeeCount !== undefined) {
      setFirms(prev => prev.map(f => f.id === draftInv.firmId ? { ...f, employeeCount: draftInv.employeeCount } : f));
    }
  };

  // Approve invoice (Move from pending queue to Cari Detay / approved)
  const handleApproveInvoice = (id: string) => {
    const target = invoices.find(i => i.id === id);
    if (!target) return;

    // 1. Mark as approved
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'approved', isApproved: true, approvalDate: '2026-07-07' } : inv));

    // 2. Post as ledger charge transaction (Invoiced)
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      firmId: target.firmId,
      firmName: target.firmName,
      type: 'invoice',
      date: '2026-07-07',
      amount: target.totalAmount,
      description: `${target.date} Tarihli Hizmet Faturası`
    };
    setTransactions(prev => [...prev, newTx]);
  };

  // Remove draft/unapproved invoice from the queue
  const handleRemoveInvoiceFromQueue = (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  // Manual transaction addition (Cari Detay Add Debt or Collection)
  const handleAddManualTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx-manual-${Date.now()}`
    };
    setTransactions(prev => [...prev, tx]);
  };

  // Edit existing manual/any transaction
  const handleEditTransaction = (id: string, updatedTx: Partial<Transaction>) => {
    const originalTx = transactions.find(t => t.id === id);
    if (originalTx) {
      if (originalTx.type === 'invoice') {
        setInvoices(prev => prev.map(inv => {
          const isMatch = inv.id === originalTx.id || 
                          (inv.firmId === originalTx.firmId && 
                           inv.date === originalTx.date && 
                           Math.abs(inv.totalAmount - originalTx.amount) < 0.01);
          if (isMatch) {
            const newAmount = updatedTx.amount !== undefined ? updatedTx.amount : originalTx.amount;
            const newDate = updatedTx.date !== undefined ? updatedTx.date : originalTx.date;
            const vatRate = inv.vatRate || 20;
            return {
              ...inv,
              totalAmount: newAmount,
              date: newDate,
              baseAmount: Math.round((newAmount / (1 + vatRate / 100)) * 100) / 100,
              vatAmount: Math.round((newAmount - (newAmount / (1 + vatRate / 100))) * 100) / 100
            };
          }
          return inv;
        }));
      }
    }
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedTx } : t));
  };

  // Delete transaction
  const handleDeleteTransaction = (id: string) => {
    const targetTx = transactions.find(t => t.id === id);
    if (targetTx) {
      if (targetTx.type === 'invoice') {
        // Delete corresponding invoice from invoices state
        setInvoices(prev => prev.filter(inv => {
          const isMatch = inv.id === targetTx.id || 
                          (inv.firmId === targetTx.firmId && 
                           inv.date === targetTx.date && 
                           Math.abs(inv.totalAmount - targetTx.amount) < 0.01);
          return !isMatch;
        }));
      } else if (targetTx.type === 'payment') {
        // Revert any matching paid invoice back to 'approved'
        setInvoices(prev => {
          const paidInvoice = prev.find(inv => 
            inv.firmId === targetTx.firmId && 
            inv.status === 'paid' && 
            Math.abs(inv.totalAmount - targetTx.amount) < 0.01
          );
          if (paidInvoice) {
            return prev.map(inv => inv.id === paidInvoice.id ? { ...inv, status: 'approved', paymentDate: undefined } : inv);
          }
          return prev;
        });
      }
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Mark invoice paid from Cari Detay
  const handleMarkInvoicePaid = (invoiceId: string) => {
    const target = invoices.find(i => i.id === invoiceId);
    if (!target) return;

    // 1. Mark invoice as paid
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'paid', paymentDate: '2026-07-07' } : inv));

    // 2. Log corresponding payment transaction to balance the ledger
    const newTx: Transaction = {
      id: `tx-pay-${Date.now()}`,
      firmId: target.firmId,
      firmName: target.firmName,
      type: 'payment',
      date: '2026-07-07',
      amount: target.totalAmount,
      description: `${target.date} Fatura Tahsilat Kapama`
    };
    setTransactions(prev => [...prev, newTx]);
  };

  // Add a new expense record
  const handleAddExpense = (newExp: Omit<Expense, 'id'>) => {
    const exp: Expense = {
      ...newExp,
      id: `exp-${Date.now()}`
    };
    setExpenses(prev => [...prev, exp]);
  };

  // Edit an existing expense record
  const handleEditExpense = (id: string, updatedExp: Partial<Expense>) => {
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, ...updatedExp } : exp));
  };

  // Delete an expense record
  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  // Add a new expense category
  const handleAddExpenseCategory = (name: string) => {
    const cat: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      name
    };
    setCategories(prev => [...prev, cat]);
  };

  // Delete an expense category
  const handleDeleteExpenseCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // Live calculator to compute actual outstanding debt (Cari bakiye)
  const getFirmBalance = (firmId: string): number => {
    const firmTxs = transactions.filter(t => t.firmId === firmId);
    
    const totalInvoiced = firmTxs
      .filter(t => t.type === 'invoice' || t.type === 'debt_addition')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCollected = firmTxs
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);

    return Math.round((totalInvoiced - totalCollected) * 100) / 100;
  };

  // Queue badge size
  const pendingQueueCount = invoices.filter(inv => inv.status === 'pending_approval').length;

  return (
    <div className="flex h-screen bg-[#050505] font-sans text-neutral-200 overflow-hidden relative" id="main-layout">
      {/* 1. SIDEBAR NAVIGATION */}
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-45 md:relative w-64 bg-[#0a0a0a] border-r border-neutral-800 flex flex-col justify-between shrink-0 h-full transition-transform duration-300 md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`} id="sidebar-panel">
        <div className="flex flex-col flex-1">
          {/* Logo Brand area */}
          <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold tracking-wider shadow-md shadow-indigo-500/20">
                F
              </div>
              <div>
                <span className="text-sm font-bold text-white tracking-tight block">FATURA & CARİ</span>
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest block">Takip Otomasyonu</span>
              </div>
            </div>
            {/* Mobile close button inside sidebar */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white md:hidden cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
 
          {/* Navigation Items */}
          <nav className="p-4 space-y-1 overflow-y-auto flex-1" id="nav-list">
            {/* 1. Ana Sayfa */}
            <button
              onClick={() => { setActiveTab(1); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === 1 
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-xs' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent'
              }`}
            >
              <Home className="h-4.5 w-4.5 shrink-0" />
              <span>Ana Sayfa</span>
            </button>
 
            {/* 2. Fiyatlandırma */}
            <button
              onClick={() => { setActiveTab(2); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === 2 
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-xs' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent'
              }`}
            >
              <SlidersHorizontal className="h-4.5 w-4.5 shrink-0" />
              <span>Fiyatlandırma Ayarları</span>
            </button>
 
            {/* 3. Fatura Hazırlık */}
            <button
              onClick={() => { setActiveTab(3); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === 3 
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-xs' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent'
              }`}
            >
              <PlusSquare className="h-4.5 w-4.5 shrink-0" />
              <span>Fatura Hazırlık</span>
            </button>
 
            {/* 4. Kesilecek Fatura */}
            <button
              onClick={() => { setActiveTab(4); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === 4 
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-xs' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileCheck className="h-4.5 w-4.5 shrink-0" />
                <span>Kesilecek Faturalar</span>
              </div>
              {pendingQueueCount > 0 && (
                <span className="h-5 min-w-5 px-1.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black flex items-center justify-center border border-amber-500/30">
                  {pendingQueueCount}
                </span>
              )}
            </button>
 
            {/* 5. Cari Detay */}
            <button
              onClick={() => { setActiveTab(5); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === 5 
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-xs' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent'
              }`}
            >
              <BookOpen className="h-4.5 w-4.5 shrink-0" />
              <span>Cari Detay</span>
            </button>
 
            {/* 6. Borç Takip */}
            <button
              onClick={() => { setActiveTab(6); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === 6 
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-xs' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent'
              }`}
            >
              <Clock className="h-4.5 w-4.5 shrink-0" />
              <span>Borç Yaşlandırma</span>
            </button>
 
            {/* 7. Gider Yönetimi */}
            <button
              onClick={() => { setActiveTab(7); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === 7 
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-xs' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent'
              }`}
            >
              <TrendingDown className="h-4.5 w-4.5 shrink-0" />
              <span>Gider Yönetimi</span>
            </button>

            {/* 8. Güvenlik ve Ayarlar */}
            <button
              onClick={() => { setActiveTab(8); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === 8 
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-xs' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent'
              }`}
            >
              <Settings className="h-4.5 w-4.5 shrink-0" />
              <span>Güvenlik & Ayarlar</span>
            </button>
          </nav>
        </div>
 
        {/* Global Settings & Quick Param trigger */}
        <div className="p-4 border-t border-neutral-800 bg-[#070707] space-y-3" id="sidebar-footer">
          <div className="text-[10px] text-neutral-500 font-bold px-2 flex justify-between">
            <span>UZMAN / HEKİM:</span>
            <span className="text-neutral-300">%{settings.uzmanPercentage} / %{settings.hekimPercentage}</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-bold px-2 flex justify-between">
            <span>SİSTEM KDV:</span>
            <span className="text-neutral-300">%{settings.kdvRate}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => { setShowSettingsModal(true); setMobileMenuOpen(false); }}
              className="py-2 px-2 bg-[#111111] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Ayarlar</span>
            </button>
            <button
              onClick={() => { setShowSettingsModal(true); setMobileMenuOpen(false); }}
              className="py-2 px-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Güncelle</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#050505]" id="app-workspace">
        {/* Top Header navbar */}
        <header className="h-16 bg-[#0a0a0a] border-b border-neutral-800 px-4 md:px-8 flex justify-between items-center shrink-0" id="navbar">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 md:hidden hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Menüyü Aç"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[200px] xs:max-w-[300px] sm:max-w-none">
              {activeTab === 1 && 'Panoromik Finansal Dashboard'}
              {activeTab === 2 && 'Ücret Tanımlama Modülü'}
              {activeTab === 3 && 'Fatura Hesaplama & Hazırlama'}
              {activeTab === 4 && 'Onay Aşamasındaki e-Belgeler'}
              {activeTab === 5 && 'Müşteri Cari Hesap Defterleri'}
              {activeTab === 6 && 'Alacak Yaşlandırma & Risk Analizi'}
              {activeTab === 7 && 'Şirket Gider Matrisi & Analizleri'}
              {activeTab === 8 && 'Güvenlik ve Sistem Ayarları'}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Quick help banner */}
            <div className="hidden xs:flex items-center gap-1 bg-indigo-650/10 border border-indigo-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold text-indigo-400">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              VDS Entegrasyonuna Hazır Çözüm
            </div>

            <button
              onClick={() => {
                sessionStorage.removeItem('active_session');
                window.location.reload();
              }}
              className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer"
              title="Güvenli Çıkış"
            >
              <LogOut className="h-3 w-3" />
              Çıkış Yap
            </button>
          </div>
        </header>
 
        {/* Dynamic Inner Screens Panel */}
        <section className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#050505]" id="inner-view-portal">
          {activeTab === 1 && (
            <DashboardView 
              firms={firms}
              invoices={invoices} 
              transactions={transactions} 
              expenses={expenses} 
            />
          )}

          {activeTab === 2 && (
            <PricingView 
              firms={firms} 
              onSaveFirm={handleSaveFirm} 
              onAddFirm={handleAddFirm} 
              onDeleteFirm={handleDeleteFirm}
            />
          )}

          {activeTab === 3 && (
            <InvoicePrepView 
              firms={firms} 
              vatRate={settings.kdvRate} 
              vatRateExpert={settings.vatRateExpert !== undefined ? settings.vatRateExpert : settings.kdvRate}
              vatRateDoctor={settings.vatRateDoctor !== undefined ? settings.vatRateDoctor : settings.kdvRate}
              vatRateHealth={settings.vatRateHealth !== undefined ? settings.vatRateHealth : settings.kdvRate}
              vpsServerUrl={settings.vpsServerUrl}
              vpsApiKey={settings.vpsApiKey}
              onSendToIssue={handleSendToIssue} 
              onAddFirm={handleAddFirm}
              onSaveFirm={handleSaveFirm}
            />
          )}

          {activeTab === 4 && (
            <InvoicesToIssueView 
              pendingInvoices={invoices.filter(i => i.status === 'pending_approval')} 
              settings={settings}
              getFirmBalance={getFirmBalance}
              onApproveInvoice={handleApproveInvoice}
              onRemoveInvoice={handleRemoveInvoiceFromQueue}
            />
          )}

          {activeTab === 5 && (
            <CariDetailView 
              firms={firms}
              invoices={invoices}
              transactions={transactions}
              onAddTransaction={handleAddManualTransaction}
              onMarkInvoicePaid={handleMarkInvoicePaid}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 6 && (
            <DebtTrackingView 
              firms={firms}
              invoices={invoices}
              transactions={transactions}
            />
          )}

          {activeTab === 7 && (
            <ExpenseManagementView 
              expenses={expenses}
              categories={categories}
              transactions={transactions}
              onAddExpense={handleAddExpense}
              onAddCategory={handleAddExpenseCategory}
              onDeleteCategory={handleDeleteExpenseCategory}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 8 && (
            <SettingsView />
          )}
        </section>
      </main>

      {/* 3. SETTINGS MODAL OVERLAY */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" id="settings-overlay">
          <div className="bg-[#111111] rounded-2xl border border-neutral-800 shadow-2xl max-w-md w-full p-6 space-y-6 relative m-4 text-neutral-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-indigo-400" />
                Sistem Parametreleri (Ayarlar)
              </h2>
              <p className="text-xs text-neutral-400 mt-1">Kesilecek faturaları ayrıştırmada kullanılan katsayılar.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* Uzman / Hekim percentages split */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">Uzman Ücret Payı (%)</label>
                <div className="relative">
                  <Percent className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settingsUzman}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSettingsUzman(val);
                      setSettingsHekim(100 - val);
                    }}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 text-white rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">Hekim Ücret Payı (%)</label>
                <div className="relative">
                  <Percent className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settingsHekim}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSettingsHekim(val);
                      setSettingsUzman(100 - val);
                    }}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 text-white rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-neutral-500 font-semibold italic">Not: Uzman + Hekim paylarının toplamı %100 olmalıdır.</p>
              </div>

              {/* Default KDV percentage */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">Genel/Varsayılan KDV Oranı (%)</label>
                <div className="relative">
                  <Percent className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={settingsKdv}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSettingsKdv(val);
                      // Auto-align default sub-VATs to keep simple usage clean
                      setSettingsVatExpert(val);
                      setSettingsVatDoctor(val);
                      setSettingsVatHealth(val);
                    }}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 text-white rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Advanced Separate VAT Rates */}
              <div className="border-t border-neutral-800 pt-4 mt-4 space-y-4">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Gelişmiş KDV Oranları</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-neutral-400">Uzman KDV (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={settingsVatExpert}
                      onChange={(e) => setSettingsVatExpert(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-neutral-400">Hekim KDV (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={settingsVatDoctor}
                      onChange={(e) => setSettingsVatDoctor(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-neutral-400">Sağlık KDV (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={settingsVatHealth}
                      onChange={(e) => setSettingsVatHealth(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Simple Debt Mode */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="simpleDebtMode"
                  checked={settingsSimpleDebtMode}
                  onChange={(e) => setSettingsSimpleDebtMode(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-neutral-800 bg-neutral-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="simpleDebtMode" className="text-xs font-semibold text-neutral-300 cursor-pointer select-none">
                  Basitleştirilmiş Borç Yaşlandırma Modu
                </label>
              </div>

              {/* Sağlık Verileri RSS / JSON Feed Entegrasyon Ayarları */}
              <div className="border-t border-neutral-800 pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Rss className="h-3.5 w-3.5 text-teal-400" />
                    Sağlık Verileri RSS / JSON Besleme Ayarları
                  </span>
                  <span className="text-[10px] text-teal-300 font-semibold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                    RSS / Feed
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Diğer sağlık otomasyonunuzun yayınladığı canlı RSS / JSON besleme adresi ve güvenlik anahtarını buradan yapılandırın.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-neutral-300">RSS Feed / JSON API Endpoint URL</label>
                    <input
                      type="text"
                      value={settingsVpsUrl}
                      onChange={(e) => setSettingsVpsUrl(e.target.value)}
                      placeholder="/api/health-sync/latest veya https://sisteminiz.com/api/health-sync/latest"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-neutral-950 border border-neutral-800 text-teal-300 rounded-lg focus:outline-hidden focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-neutral-300">API Secret Key / Bearer Token</label>
                    <div className="relative">
                      <Key className="absolute right-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                      <input
                        type="password"
                        value={settingsVpsKey}
                        onChange={(e) => setSettingsVpsKey(e.target.value)}
                        placeholder="vps_secure_secret_2026"
                        className="w-full px-3 py-1.5 text-xs font-mono bg-neutral-950 border border-neutral-800 text-teal-300 rounded-lg focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={testingVpsConnection}
                    onClick={async () => {
                      setTestingVpsConnection(true);
                      try {
                        let baseUrl = settingsVpsUrl || '/api/health-sync/latest';
                        if (baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost')) {
                          baseUrl = '/api/health-sync/latest';
                        }

                        const cacheBuster = `_t=${Date.now()}`;
                        const targetUrl = baseUrl.includes('?') ? `${baseUrl}&${cacheBuster}` : `${baseUrl}?${cacheBuster}`;

                        const headers: Record<string, string> = {
                          'Cache-Control': 'no-cache, no-store, must-revalidate',
                          'Pragma': 'no-cache'
                        };
                        if (settingsVpsKey) {
                          headers['Authorization'] = `Bearer ${settingsVpsKey}`;
                        }

                        let res;
                        try {
                          res = await fetch(targetUrl, { headers, cache: 'no-store' });
                        } catch {
                          res = await fetch(`/api/health-sync/latest?${cacheBuster}`, { headers, cache: 'no-store' });
                        }

                        const data = await res.json();
                        if (data.success) {
                          alert(`✅ RSS / FEED BAĞLANTISI BAŞARILI!\n\nServis Durumu: Aktif (Önbelleksiz Anlık Veri)\nOkunan Firma Kayıt Sayısı: ${data.uniqueFirmsCount || 0}\nSon Senkronizasyon: ${data.lastSyncTime || 'Henüz Yapılmadı'}`);
                        } else {
                          alert(`⚠️ Sunucu yanıt verdi ancak mesaj döndürdü: ${data.error || 'Bilinmeyen Hata'}`);
                        }
                      } catch (err) {
                        alert(`❌ Feed Bağlantı Hatası: ${settingsVpsUrl} adresiyle iletişim kurulamadı.`);
                      } finally {
                        setTestingVpsConnection(false);
                      }
                    }}
                    className="w-full py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${testingVpsConnection ? 'animate-spin' : ''}`} />
                    {testingVpsConnection ? 'Bağlantı Sınanıyor...' : 'RSS / Feed Bağlantısını Test Et'}
                  </button>

                  {/* Canlı Sağlık Verisi Ekleme Simülatörü */}
                  <div className="p-3 bg-teal-500/5 border border-teal-500/20 rounded-xl space-y-2 mt-2">
                    <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider block">
                      🧪 Canlı Test Verisi Gönder (Sağlık Otomasyonu Simülatörü)
                    </span>
                    <p className="text-[10px] text-neutral-400 leading-normal">
                      Diğer sistemden canlı veri eklenmiş gibi bu ekrandan hemen yeni bir firma ve sağlık bedeli ekleyip, "Sağlık Verilerini Çek" butonunun anlık tepkisini test edebilirsiniz.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Firma Unvanı (Örn: ABC Sağlık)"
                        value={simulatedFirmName}
                        onChange={(e) => setSimulatedFirmName(e.target.value)}
                        className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg focus:outline-none focus:border-teal-500"
                      />
                      <input
                        type="number"
                        placeholder="Tutar TL (Örn: 1500)"
                        value={simulatedAmount}
                        onChange={(e) => setSimulatedAmount(e.target.value)}
                        className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isSimulatingPost}
                      onClick={async () => {
                        if (!simulatedFirmName.trim() || !simulatedAmount || Number(simulatedAmount) <= 0) {
                          alert("Lütfen geçerli bir firma unvanı ve pozitif bir tutar girin.");
                          return;
                        }
                        setIsSimulatingPost(true);
                        try {
                          const res = await fetch('/api/health-sync', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${settingsVpsKey || 'vps_secure_secret_2026'}`
                            },
                            body: JSON.stringify({
                              records: [
                                {
                                  firmName: simulatedFirmName.trim(),
                                  paymentType: 'fatura',
                                  amount: Number(simulatedAmount)
                                }
                              ]
                            })
                          });
                          const data = await res.json();
                          if (data.success) {
                            alert(`✅ YENİ SAĞLIK VERİSİ CANLI FEED'E EKLENDİ!\n\nFirma: ${simulatedFirmName}\nTutar: ${simulatedAmount} TL\n\nŞimdi 'Fatura Hazırlık' ekranından 'Sağlık Verilerini Çek' butonuna bastığınızda bu yeni veri anında gelecektir.`);
                            setSimulatedFirmName('');
                            setSimulatedAmount('');
                          } else {
                            alert(`⚠️ Hata: ${data.error || 'Veri eklenemedi'}`);
                          }
                        } catch (err) {
                          alert("❌ Sunucuya bağlanırken hata oluştu.");
                        } finally {
                          setIsSimulatingPost(false);
                        }
                      }}
                      className="w-full py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {isSimulatingPost ? 'Gönderiliyor...' : 'Canlı Feed\'e Yeni Sağlık Kaydı Ekle (POST)'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const devPrompt = `Selam! Bizim Fatura Otomasyonu sistemimize canlı sağlık verilerini aktarmak için sistemine bir RSS / JSON Feed API servisi eklemen gerekiyor.

Gereksinimler:
1. Endpoint URL: ${settingsVpsUrl || '/api/health-sync/latest'}
2. HTTP Metodu: GET
3. Güvenlik: Authorization Header (Bearer Token: ${settingsVpsKey || 'vps_secure_secret_2026'})
4. Beklenen JSON Yanıt Formatı:
{
  "success": true,
  "uniqueFirmsCount": 10,
  "lastSyncTime": "2026-07-27 12:00",
  "totals": {
    "Firma Unvanı A.Ş.": 1500.00,
    "Örnek Sağlık Ltd. Şti.": 2350.50
  }
}

Not: Lütfen ödeme türü 'fatura' olan sağlık bedellerini firma adına göre toplayıp bu JSON formatında döndüren canlı RSS/Feed servisini yayına al.`;
                      navigator.clipboard.writeText(devPrompt);
                      alert("✅ Diğer AI Yazılımcı İçin RSS Entegrasyon Promptu Kopyalandı!\n\nDiğer projeyi geliştiren AI yazılımcıya bu promptu yapıştırıp iletebilirsiniz.");
                    }}
                    className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-indigo-400" />
                    Diğer AI Yazılımcı İçin RSS Entegrasyon Promptunu Kopyala
                  </button>
                </div>
              </div>

              {/* Tek Tıkla Otomatik Sistem Güncelleme (Terminalsiz) */}
              <div className="border-t border-neutral-800 pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                    Tek Tıkla Otomatik Sistem Güncelleme (Terminalsiz)
                  </span>
                  <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Git Pull + Build + PM2
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  GitHub deposuna (<code className="text-emerald-300">github.com/szgnemin1/osgbfatura</code>) yeni kod veya güncelleme eklendiğinde terminale girmeden tek tıkla sistemi güncelleyebilirsiniz.
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={checkingSystemUpdate || updatingSystem}
                    onClick={async () => {
                      setCheckingSystemUpdate(true);
                      try {
                        const res = await fetch('/api/system/git-status');
                        const data = await res.json();
                        setSystemUpdateStatus(data);
                      } catch {
                        setSystemUpdateStatus({ success: false, message: 'Güncelleme durumu kontrol edilemedi.' });
                      } finally {
                        setCheckingSystemUpdate(false);
                      }
                    }}
                    className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${checkingSystemUpdate ? 'animate-spin text-emerald-400' : 'text-neutral-400'}`} />
                    {checkingSystemUpdate ? 'Kontrol Ediliyor...' : 'Güncellemeleri Kontrol Et'}
                  </button>

                  <button
                    type="button"
                    disabled={updatingSystem}
                    onClick={async () => {
                      if (!confirm("Sistem güncellenecek, en son GitHub kodları çekilip yeniden derlenecek ve 3002 portundaki uygulama baştan başlatılacak.\n\nDevam etmek istiyor musunuz?")) {
                        return;
                      }
                      setUpdatingSystem(true);
                      setUpdateLogs(["Güncelleme süreci başlatıldı..."]);
                      try {
                        const res = await fetch('/api/system/update', { method: 'POST' });
                        const data = await res.json();
                        if (data.logs) {
                          setUpdateLogs(data.logs);
                        }
                        if (data.success) {
                          alert(`✅ ${data.message}\n\nSayfa 3 saniye içinde otomatik yenilenecektir.`);
                          setTimeout(() => {
                            window.location.reload();
                          }, 3000);
                        } else {
                          alert(`⚠️ Hata: ${data.error || 'Güncelleme tamamlanamadı.'}`);
                        }
                      } catch (err: any) {
                        alert("⚠️ Güncelleme başlatıldı ve sunucu yeniden başlatılıyor. Lütfen 5 saniye sonra sayfayı yenileyin.");
                        setTimeout(() => {
                          window.location.reload();
                        }, 4000);
                      } finally {
                        setUpdatingSystem(false);
                      }
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className={`h-3.5 w-3.5 ${updatingSystem ? 'animate-bounce' : ''}`} />
                    {updatingSystem ? 'Sistem Güncelleniyor...' : 'Sistemi Şimdi Güncelle'}
                  </button>
                </div>

                {systemUpdateStatus && (
                  <div className={`p-2.5 rounded-xl border text-xs font-medium ${systemUpdateStatus.hasUpdates ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
                    {systemUpdateStatus.message}
                  </div>
                )}

                {updateLogs.length > 0 && (
                  <div className="p-3 bg-black/80 border border-neutral-800 rounded-xl space-y-1 font-mono text-[10px] text-emerald-400 max-h-32 overflow-y-auto">
                    {updateLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">» {log}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sistem Yedekleme ve Yükleme */}
              <div className="border-t border-neutral-800 pt-4 mt-4 space-y-3">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Veri Yedekleme & Geri Yükleme</span>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Tüm firma tanımlarınızı, cari hareketleri, hesap ayarlarını ve giderleri JSON dosyası olarak yedekleyin veya geri yükleyin.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="py-2.5 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-indigo-400 shrink-0" />
                    Yedek İndir (JSON)
                  </button>
                  
                  <label
                    className="py-2.5 px-3 bg-[#161616] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <Upload className="h-4 w-4 text-neutral-400 shrink-0" />
                    Yedek Yükle
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleUploadBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold border border-neutral-800"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10"
                >
                  Ayarları Uygula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
