const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add api import
content = content.replace(/from '\.\/initialData';/, "from './initialData';\nimport { api } from './api';");

// 2. Replace State initialization
const stateRegex = /const \[firms, setFirms\] = useState[\s\S]*?\}\);\n\n  \/\/ Load form values once settings state is populated/m;
const newState = `const [firms, setFirms] = useState<Firm[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
      uzmanPercentage: 60,
      hekimPercentage: 40,
      kdvRate: 20,
      vatRateExpert: 20,
      vatRateDoctor: 10,
      vatRateHealth: 10,
      simpleDebtMode: false,
      vpsServerUrl: '/api/health-sync/latest',
      vpsApiKey: 'vps_secure_secret_2026'
  });
  const [isDbLoaded, setIsDbLoaded] = useState(false);

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

  // Load Initial Data from API
  useEffect(() => {
    const loadDb = async () => {
      try {
        const [f, i, t, e, c, s] = await Promise.all([
          api.getFirms(), api.getInvoices(), api.getTransactions(), api.getExpenses(), api.getCategories(), api.getSettings()
        ]);
        if (f) setFirms(f);
        if (i) setInvoices(i);
        if (t) setTransactions(t);
        if (e) setExpenses(e);
        if (c) setCategories(c);
        if (s && Object.keys(s).length > 0) setSettings(prev => ({ ...prev, ...s }));
      } catch (err) {
        console.error('Failed to load database:', err);
      } finally {
        setIsDbLoaded(true);
      }
    };
    loadDb();
  }, []);

  // Load form values once settings state is populated`;
content = content.replace(stateRegex, newState);

// Remove the localStorage useEffect hooks
const removeEffectRegex = /\/\/ 2\. Sync to localStorage on every state change[\s\S]*?\/\/ Load form values once settings state is populated/m;
content = content.replace(removeEffectRegex, "// Load form values once settings state is populated");

// 3. Update handlers with API calls (optimistic)
content = content.replace(/const handleSaveSettings = \(e: React\.FormEvent\) => \{([\s\S]*?)alert\('Sistem ve VPS entegrasyon parametreleri başarıyla güncellendi\.'\);/m, 
  `const handleSaveSettings = async (e: React.FormEvent) => {$1await api.updateSettings({
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
    alert('Sistem ve VPS entegrasyon parametreleri başarıyla güncellendi.');`);

content = content.replace(/const handleSaveFirm = \(updatedFirm: Firm\) => \{\s*setFirms[\s\S]*?\};/m, 
  `const handleSaveFirm = async (updatedFirm: Firm) => {
    setFirms(prev => prev.map(f => f.id === updatedFirm.id ? updatedFirm : f));
    await api.updateFirm(updatedFirm);
  };`);

content = content.replace(/const handleDeleteFirm = \(firmId: string\) => \{([\s\S]*?)setFirms\(prev => prev\.filter\(f => f\.id !== firmId\)\);([\s\S]*?)\};/m, 
  `const handleDeleteFirm = async (firmId: string) => {$1setFirms(prev => prev.filter(f => f.id !== firmId));
      await api.deleteFirm(firmId);$2};`);

content = content.replace(/const handleAddFirm = \(firmOrName: Firm \| string\) => \{([\s\S]*?)setFirms\(prev => \[\.\.\.prev, (.*?)\]\);\n\s*\}/gm, 
  `const handleAddFirm = async (firmOrName: Firm | string) => {$1setFirms(prev => [...prev, $2]);
      await api.addFirm($2);
    }`);

content = content.replace(/const handleSendToIssue = \(draftInv: Partial<Invoice>\) => \{([\s\S]*?)setInvoices\(prev => \[fullInvoice, \.\.\.prev\]\);/m, 
  `const handleSendToIssue = async (draftInv: Partial<Invoice>) => {$1setInvoices(prev => [fullInvoice, ...prev]);
    await api.addInvoice(fullInvoice);`);

content = content.replace(/const handleApproveInvoice = \(id: string\) => \{([\s\S]*?)setInvoices\(([\s\S]*?)\);\n\n    \/\/ 2\. Post as ledger([\s\S]*?)setTransactions\(([\s\S]*?)\]\);/m, 
  `const handleApproveInvoice = async (id: string) => {$1setInvoices($2);
    const targetInv = invoices.find(i => i.id === id);
    if(targetInv) await api.updateInvoice({ ...targetInv, status: 'approved', isApproved: true, approvalDate: '2026-07-07' });

    // 2. Post as ledger$3setTransactions($4]);
    await api.addTransaction(newTx);`);

content = content.replace(/const handleRemoveInvoiceFromQueue = \(id: string\) => \{\s*setInvoices\(prev => prev\.filter\(inv => inv\.id !== id\)\);\s*\};/m, 
  `const handleRemoveInvoiceFromQueue = async (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    await api.deleteInvoice(id);
  };`);

content = content.replace(/const handleAddManualTransaction = \(newTx: Omit<Transaction, 'id'>\) => \{([\s\S]*?)setTransactions\(prev => \[\.\.\.prev, tx\]\);\s*\};/m, 
  `const handleAddManualTransaction = async (newTx: Omit<Transaction, 'id'>) => {$1setTransactions(prev => [...prev, tx]);
    await api.addTransaction(tx);
  };`);

content = content.replace(/const handleEditTransaction = \(id: string, updatedTx: Partial<Transaction>\) => \{([\s\S]*?)setTransactions\(prev => prev\.map\(t => t\.id === id \? \{ \.\.\.t, \.\.\.updatedTx \} : t\)\);\s*\};/m, 
  `const handleEditTransaction = async (id: string, updatedTx: Partial<Transaction>) => {$1setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedTx } : t));
    const targetTx = transactions.find(t => t.id === id);
    if (targetTx) await api.updateTransaction({ ...targetTx, ...updatedTx });
  };`);

content = content.replace(/const handleDeleteTransaction = \(id: string\) => \{([\s\S]*?)setTransactions\(prev => prev\.filter\(t => t\.id !== id\)\);\s*\};/m, 
  `const handleDeleteTransaction = async (id: string) => {$1setTransactions(prev => prev.filter(t => t.id !== id));
    await api.deleteTransaction(id);
  };`);

content = content.replace(/const handleMarkInvoicePaid = \(invoiceId: string\) => \{([\s\S]*?)setInvoices\(([\s\S]*?)\);\n\n    \/\/ 2\. Log corresponding payment([\s\S]*?)setTransactions\(([\s\S]*?)\]\);/m, 
  `const handleMarkInvoicePaid = async (invoiceId: string) => {$1setInvoices($2);
    const targetInv = invoices.find(i => i.id === invoiceId);
    if(targetInv) await api.updateInvoice({ ...targetInv, status: 'paid', paymentDate: '2026-07-07' });

    // 2. Log corresponding payment$3setTransactions($4]);
    await api.addTransaction(newTx);`);

content = content.replace(/const handleAddExpense = \(newExp: Omit<Expense, 'id'>\) => \{([\s\S]*?)setExpenses\(prev => \[\.\.\.prev, exp\]\);\s*\};/m, 
  `const handleAddExpense = async (newExp: Omit<Expense, 'id'>) => {$1setExpenses(prev => [...prev, exp]);
    await api.addExpense(exp);
  };`);

content = content.replace(/const handleEditExpense = \(id: string, updatedExp: Partial<Expense>\) => \{\s*setExpenses\(prev => prev\.map\(exp => exp\.id === id \? \{ \.\.\.exp, \.\.\.updatedExp \} : exp\)\);\s*\};/m, 
  `const handleEditExpense = async (id: string, updatedExp: Partial<Expense>) => {
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, ...updatedExp } : exp));
    const target = expenses.find(e => e.id === id);
    if (target) await api.updateExpense({ ...target, ...updatedExp });
  };`);

content = content.replace(/const handleDeleteExpense = \(id: string\) => \{\s*setExpenses\(prev => prev\.filter\(exp => exp\.id !== id\)\);\s*\};/m, 
  `const handleDeleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
    await api.deleteExpense(id);
  };`);

content = content.replace(/const handleAddExpenseCategory = \(name: string\) => \{([\s\S]*?)setCategories\(prev => \[\.\.\.prev, cat\]\);\s*\};/m, 
  `const handleAddExpenseCategory = async (name: string) => {$1setCategories(prev => [...prev, cat]);
    await api.addCategory(cat);
  };`);

content = content.replace(/const handleDeleteExpenseCategory = \(id: string\) => \{\s*setCategories\(prev => prev\.filter\(c => c\.id !== id\)\);\s*\};/m, 
  `const handleDeleteExpenseCategory = async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    await api.deleteCategory(id);
  };`);

// 4. Update the Upload Backup to also push to backend
content = content.replace(/const handleUploadBackup = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{/, 
  `const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {`);
content = content.replace(/alert\('Yedek başarıyla geri yüklendi!'\);/, 
  `await api.restoreBackup({ firms: parsedFirms, transactions: restoredTransactions, invoices: restoredInvoices, expenses: data.expenses || [], categories: data.expenseCategories || [], settings: data.globalSettings || {} });
          alert('Yedek başarıyla geri yüklendi!');`);

// Wrap return inside isDbLoaded check
content = content.replace(/return \(\n    <div className="flex h-screen/, 
  `if (!isDbLoaded) return <div className="flex items-center justify-center h-screen bg-[#050505] text-white">Veritabanı bağlantısı kuruluyor...</div>;
  
  return (
    <div className="flex h-screen`);

fs.writeFileSync('src/App.tsx', content);
