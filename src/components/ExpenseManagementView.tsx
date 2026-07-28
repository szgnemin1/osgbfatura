import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  Plus, Search, Calendar, CreditCard, Tag, FileText, BarChart3, 
  TrendingDown, Table, Edit2, Trash2, AlertCircle, PenTool, Eye,
  Download, CheckCircle2, Filter, Layers, Check, ArrowRight, ShieldCheck,
  FolderPlus, Wallet, Receipt, PieChart as PieChartIcon
} from 'lucide-react';
import { Expense, ExpenseCategory, Transaction } from '../types';
import { formatLira, downloadExcel } from '../initialData';

interface ExpenseManagementViewProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  transactions: Transaction[]; // For Revenue vs Expense analysis
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory?: (id: string) => void;
  onEditExpense?: (id: string, updatedExp: Partial<Expense>) => void;
  onDeleteExpense?: (id: string) => void;
}

export default function ExpenseManagementView({
  expenses,
  categories,
  transactions,
  onAddExpense,
  onAddCategory,
  onDeleteCategory,
  onEditExpense,
  onDeleteExpense
}: ExpenseManagementViewProps) {
  // Main Top-level View Mode: 'entry' (Veri Yazma) vs 'view' (Verilere Bakma)
  const [mainTab, setMainTab] = useState<'entry' | 'view'>('entry');

  // Sub-tab inside Data Viewing mode
  const [viewSubTab, setViewSubTab] = useState<'ledger' | 'matrix' | 'charts'>('ledger');

  // Input Form States (Data Entry Area)
  const [newCatName, setNewCatName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState('2026-07-07');
  const [expNote, setExpNote] = useState('');
  const [catSearchTerm, setCatSearchTerm] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

  // Ledger filter/search (Data Viewing Area)
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Editing states
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  // Deletion confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Success Notification banner state
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // 12 Months names list for calculations
  const monthsNames = [
    { name: 'Ocak', suffix: '-01' },
    { name: 'Şubat', suffix: '-02' },
    { name: 'Mart', suffix: '-03' },
    { name: 'Nisan', suffix: '-04' },
    { name: 'Mayıs', suffix: '-05' },
    { name: 'Haziran', suffix: '-06' },
    { name: 'Temmuz', suffix: '-07' },
    { name: 'Ağustos', suffix: '-08' },
    { name: 'Eylül', suffix: '-09' },
    { name: 'Ekim', suffix: '-10' },
    { name: 'Kasım', suffix: '-11' },
    { name: 'Aralık', suffix: '-12' }
  ];

  // Colors for Pie Chart slices
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f43f5e', '#a855f7', '#06b6d4'];

  // Filter categories dynamically based on search in entry form
  const searchedCategories = useMemo(() => {
    return categories.filter(c => c.name.toLowerCase().includes(catSearchTerm.toLowerCase()))
                     .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [categories, catSearchTerm]);

  // Handle adding a new category
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    const exists = categories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase());
    if (exists) {
      alert('Bu gider kalemi zaten mevcut.');
      return;
    }

    onAddCategory(newCatName.trim());
    showNotification(`"${newCatName.trim()}" yeni gider kalemi olarak eklendi.`);
    setNewCatName('');
  };

  // Handle deleting an expense category
  const handleCategoryDelete = (catId: string, catName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`"${catName}" gider kalemini silmek istediğinize emin misiniz?`)) {
      if (onDeleteCategory) {
        onDeleteCategory(catId);
      }
      if (selectedCatId === catId) {
        setSelectedCatId('');
      }
      showNotification(`"${catName}" gider kalemi silindi.`);
    }
  };

  // Handle adding a new expense transaction
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !expAmount) {
      alert('Lütfen bir gider kalemi seçin ve tutar girin.');
      return;
    }

    const cat = categories.find(c => c.id === selectedCatId);
    if (!cat) return;

    onAddExpense({
      categoryId: selectedCatId,
      categoryName: cat.name,
      date: expDate,
      amount: Number(expAmount),
      note: expNote
    });

    showNotification(`${formatLira(Number(expAmount))} tutarındaki "${cat.name}" gider kaydı başarıyla eklendi.`);
    setExpAmount('');
    setExpNote('');
    setSelectedCatId('');
    setCatSearchTerm('');
  };

  const handleStartEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setEditAmount(String(exp.amount));
    setEditDate(exp.date);
    setEditNote(exp.note);
    setEditCategoryId(exp.categoryId);
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !onEditExpense) return;

    const cat = categories.find(c => c.id === editCategoryId);
    if (!cat) return;

    onEditExpense(editingExpense.id, {
      categoryId: editCategoryId,
      categoryName: cat.name,
      amount: Number(editAmount),
      date: editDate,
      note: editNote
    });

    setEditingExpense(null);
    showNotification('Gider kaydı başarıyla güncellendi.');
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (!onDeleteExpense || !deleteConfirmId) return;
    onDeleteExpense(deleteConfirmId);
    setDeleteConfirmId(null);
    showNotification('Gider kaydı silindi.');
  };

  // Filtered expenses list for viewing
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = exp.note.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) ||
                            exp.categoryName.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) ||
                            exp.date.includes(ledgerSearchTerm);
      const matchesCategory = selectedCategoryFilter === 'all' || exp.categoryId === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => b.date.localeCompare(a.date)); // Newest first
  }, [expenses, ledgerSearchTerm, selectedCategoryFilter]);

  // Recent 5 expenses for quick review in the Entry Area
  const recentExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [expenses]);

  // Matrix calculation: rows are Gider Kalemi, columns are 12 Months
  const expenseMatrix = useMemo(() => {
    return categories.map(cat => {
      let categoryTotal = 0;
      const monthlySums = monthsNames.map(m => {
        const sum = expenses
          .filter(e => e.categoryId === cat.id && e.date.startsWith(`2026${m.suffix}`))
          .reduce((total, e) => total + e.amount, 0);
        
        categoryTotal += sum;
        return sum;
      });

      return {
        id: cat.id,
        name: cat.name,
        monthlySums,
        total: categoryTotal
      };
    }).sort((a, b) => b.total - a.total);
  }, [categories, expenses]);

  // General Summary Metrics for the whole year 2026
  const analytics = useMemo(() => {
    const total2026 = expenses
      .filter(e => e.date.startsWith('2026'))
      .reduce((sum, e) => sum + e.amount, 0);

    const julExpenses = expenses
      .filter(e => e.date.startsWith('2026-07'))
      .reduce((sum, e) => sum + e.amount, 0);

    let highestCatName = 'Mevcut Değil';
    let highestCatAmount = 0;

    categories.forEach(cat => {
      const catSum = expenses
        .filter(e => e.categoryId === cat.id && e.date.startsWith('2026'))
        .reduce((sum, e) => sum + e.amount, 0);
      
      if (catSum > highestCatAmount) {
        highestCatAmount = catSum;
        highestCatName = cat.name;
      }
    });

    return {
      annualTotal: total2026,
      julyTotal: julExpenses,
      highestCategory: `${highestCatName} (${formatLira(highestCatAmount)})`
    };
  }, [expenses, categories]);

  // Pie Chart Data: Spent per category in year 2026 with percentages
  const pieChartData = useMemo(() => {
    const rawItems = categories.map(cat => {
      const value = expenses
        .filter(e => e.categoryId === cat.id && e.date.startsWith('2026'))
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        id: cat.id,
        name: cat.name,
        value: Math.round(value)
      };
    }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);

    const totalSpent = rawItems.reduce((acc, item) => acc + item.value, 0);

    const items = rawItems.map(item => ({
      ...item,
      percentage: totalSpent > 0 ? Number(((item.value / totalSpent) * 100).toFixed(1)) : 0
    }));

    return {
      totalSpent,
      items
    };
  }, [categories, expenses]);

  // Revenue vs Expense chart data for each of the 6 historical months
  const revenueVsExpenseData = useMemo(() => {
    const monthsForIncome = [
      { name: 'Ocak', key: '2026-01' },
      { name: 'Şubat', key: '2026-02' },
      { name: 'Mart', key: '2026-03' },
      { name: 'Nisan', key: '2026-04' },
      { name: 'Mayıs', key: '2026-05' },
      { name: 'Haziran', key: '2026-06' }
    ];

    return monthsForIncome.map(m => {
      const income = transactions
        .filter(t => t.type === 'payment' && t.date.startsWith(m.key))
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = expenses
        .filter(e => e.date.startsWith(m.key))
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        name: m.name,
        'Gelir (Tahsilat)': Math.round(income),
        'Gider': Math.round(expense)
      };
    });
  }, [transactions, expenses]);

  // Export Expenses to Excel
  const handleExportExpensesExcel = () => {
    const headers = ['Tarih', 'Gider Kalemi', 'Açıklama / Not', 'Gider Tutarı (TL)'];
    const data = filteredExpenses.map(e => [
      e.date,
      e.categoryName,
      e.note || '-',
      e.amount.toFixed(2)
    ]);

    const totalSum = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    data.push([]);
    data.push(['TOPLAM GİDER', '', '', totalSum.toFixed(2)]);

    downloadExcel(data, 'Gider_Hareketleri_Raporu', headers);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="expense-management-root">
      {/* Toast Notification Banner */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-emerald-400/40 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Banner & Overview */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-rose-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Gider Yönetimi</h1>
          </div>
          <p className="text-xs text-neutral-400">
            İşletme giderlerini kaydedin, kategorize edin ve detaylı finansal tablolarla analiz edin.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-4 bg-[#111115] px-4 py-2.5 rounded-xl border border-neutral-800 shrink-0">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Yıllık Toplam Gider</span>
            <span className="text-sm font-extrabold text-rose-400">{formatLira(analytics.annualTotal)}</span>
          </div>
          <div className="h-8 w-px bg-neutral-800" />
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Toplam Kayıt</span>
            <span className="text-sm font-bold text-white">{expenses.length} Adet</span>
          </div>
        </div>
      </div>

      {/* Main Structural Mode Selector (Separate Entry & Viewing Areas) */}
      <div className="bg-[#0e0e12] p-1.5 rounded-2xl border border-neutral-800/90 shadow-md flex flex-col sm:flex-row gap-2" id="main-expense-mode-tabs">
        <button
          type="button"
          onClick={() => setMainTab('entry')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'entry'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
          id="btn-tab-expense-entry"
        >
          <PenTool className="h-4 w-4" />
          <span>✍️ GİDER YAZMA & VERİ GİRİŞİ</span>
          <span className="text-[10px] opacity-75 font-normal ml-1 hidden lg:inline">(Yeni Kayıt & Kalem Tanımlama)</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('view')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'view'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
          id="btn-tab-expense-view"
        >
          <Eye className="h-4 w-4" />
          <span>📊 GİDER İNCELEME & ANALİZLER</span>
          <span className="text-[10px] opacity-75 font-normal ml-1 hidden lg:inline">(Listeler, Matris & Grafikler)</span>
        </button>
      </div>

      {/* SECTION 1: DATA ENTRY AREA (VERİ YAZMA YERİ) */}
      {mainTab === 'entry' && (
        <div className="space-y-6 animate-fade-in" id="expense-entry-section">
          {/* Section Indicator Bar */}
          <div className="bg-[#111116] border border-rose-950/40 p-4 rounded-xl flex items-center justify-between text-xs font-medium text-rose-300">
            <div className="flex items-center gap-2">
              <PenTool className="h-4 w-4 text-rose-400" />
              <span>Buradan sisteme yeni gider hareketleri işleyebilir ve yeni gider kategorileri tanımlayabilirsiniz.</span>
            </div>
            <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-mono border border-rose-500/20">
              VERİ GİRİŞ MODU
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form 1: Add New Expense Entry */}
            <form onSubmit={handleAddExpenseSubmit} className="lg:col-span-8 bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="font-bold text-white text-sm uppercase tracking-wider pb-3 border-b border-neutral-800 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4.5 w-4.5 text-rose-400" />
                    <span>1. Yeni Gider Kaydı Oluştur</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 lowercase font-normal">*(Zorunlu alanlar)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category Selection with Live Search */}
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                      Gider Kalemi Seç <span className="text-rose-400">*</span>
                    </label>

                    {/* Selected category state view */}
                    {selectedCatId ? (
                      (() => {
                        const selCat = categories.find(c => c.id === selectedCatId);
                        return (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                            <div className="flex items-center gap-2 truncate">
                              <CheckCircle2 className="h-4 w-4 text-rose-400 shrink-0" />
                              <span className="text-xs font-bold text-white truncate">{selCat ? selCat.name : 'Seçili Kalem'}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedCatId('')}
                                className="text-[10px] font-bold text-neutral-300 hover:text-white px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer"
                              >
                                Değiştir
                              </button>
                              {selCat && (
                                <button
                                  type="button"
                                  onClick={(e) => handleCategoryDelete(selCat.id, selCat.name, e)}
                                  className="p-1 text-neutral-400 hover:text-rose-400 rounded cursor-pointer"
                                  title="Bu gider kalemini sil"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      /* Live Search Input with Popup Dropdown */
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                          <input
                            type="text"
                            placeholder="Kalem arayın..."
                            value={catSearchTerm}
                            onFocus={() => setIsCatDropdownOpen(true)}
                            onChange={(e) => {
                              setCatSearchTerm(e.target.value);
                              setIsCatDropdownOpen(true);
                            }}
                            className="pl-9 pr-3 py-2 w-full text-xs border border-neutral-800 rounded-xl bg-neutral-900 text-white focus:outline-none focus:border-rose-500 font-medium"
                          />
                        </div>

                        {/* Dropdown list appearing on live search */}
                        {isCatDropdownOpen && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-[#131318] border border-neutral-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto p-1.5 space-y-1 border-t-2 border-t-rose-500">
                            <div className="px-2 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex justify-between items-center border-b border-neutral-800/80 pb-1 mb-1">
                              <span>Arama Sonuçları ({searchedCategories.length})</span>
                              <button 
                                type="button" 
                                onClick={() => setIsCatDropdownOpen(false)}
                                className="text-neutral-500 hover:text-neutral-300 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>

                            {searchedCategories.length > 0 ? (
                              searchedCategories.map(cat => (
                                <div
                                  key={cat.id}
                                  onClick={() => {
                                    setSelectedCatId(cat.id);
                                    setIsCatDropdownOpen(false);
                                  }}
                                  className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg hover:bg-neutral-800/80 cursor-pointer transition-colors group"
                                >
                                  <span className="font-semibold text-white group-hover:text-rose-300 transition-colors truncate pr-2">
                                    {cat.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCategoryDelete(cat.id, cat.name, e)}
                                    className="p-1 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors shrink-0"
                                    title={`"${cat.name}" kalemini sil`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-4 text-center text-xs text-neutral-500 italic">
                                Aramanızla eşleşen gider kalemi bulunamadı.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Amount & Date Input */}
                  <div className="space-y-4 md:col-span-1">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Gider Tutarı (TL) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-mono border border-neutral-800 rounded-xl bg-neutral-900 text-white focus:outline-none focus:border-rose-500 font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Gider İşlem Tarihi <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="date"
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs border border-neutral-800 rounded-xl bg-neutral-900 text-white focus:outline-none focus:border-rose-500 font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Note & Submit */}
                  <div className="space-y-4 md:col-span-1 flex flex-col justify-between">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Açıklama / Not (Opsiyonel)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Örn: Fatura No: 9942, Akaryakıt fişi vb."
                        value={expNote}
                        onChange={(e) => setExpNote(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-xl bg-neutral-900 text-white focus:outline-none focus:border-rose-500 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-950/20 cursor-pointer flex items-center justify-center gap-2"
                      id="btn-save-expense-entry"
                    >
                      <Plus className="h-4 w-4" />
                      Gider Kaydını Sisteme İşle
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Form 2: Define New Category */}
            <form onSubmit={handleAddNewCategory} className="lg:col-span-4 bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="font-bold text-white text-sm uppercase tracking-wider pb-3 border-b border-neutral-800 flex items-center gap-2 mb-4">
                  <FolderPlus className="h-4.5 w-4.5 text-indigo-400" />
                  <span>2. Yeni Gider Kalemi Tanımla</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Gider Kategori Adı
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Bilişim & Yazılım Harcamaları"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-neutral-800 rounded-xl focus:outline-none focus:border-indigo-500 bg-neutral-900 text-white font-medium"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Sistemde mevcut olmayan yeni bir masraf veya bütçe kalemi eklemek için bu alanı kullanın.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4 text-indigo-400" />
                  Yeni Kalemi Tanımla
                </button>

                {/* Active Categories List with Delete Option */}
                <div className="border-t border-neutral-800/80 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Mevcut Kalemler ({categories.length})
                    </span>
                    <span className="text-[9px] text-neutral-500">Silmek için 🗑️ tıklayın</span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {categories.map(cat => (
                      <div 
                        key={cat.id} 
                        className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-900/60 hover:bg-neutral-900 rounded-lg border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors"
                      >
                        <span className="truncate pr-1">{cat.name}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCategoryDelete(cat.id, cat.name, e)}
                          className="p-1 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer shrink-0"
                          title={`"${cat.name}" kalemini sil`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Quick Review: Recent Entries Table in Data Entry Mode */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-neutral-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neutral-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-white">Son Girilen Gider Hareketleri (Hızlı İnceleme)</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMainTab('view');
                  setViewSubTab('ledger');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Tüm Kayıtları Gör ({expenses.length})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/50 text-[10px] font-bold uppercase text-neutral-500 border-b border-neutral-800">
                    <th className="px-4 py-2.5">Tarih</th>
                    <th className="px-4 py-2.5">Gider Kalemi</th>
                    <th className="px-4 py-2.5">Açıklama</th>
                    <th className="px-4 py-2.5 text-right">Tutar</th>
                    <th className="px-4 py-2.5 text-center">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  {recentExpenses.length > 0 ? (
                    recentExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-neutral-900/40">
                        <td className="px-4 py-2.5 font-mono text-neutral-400">{exp.date}</td>
                        <td className="px-4 py-2.5 font-bold text-white">{exp.categoryName}</td>
                        <td className="px-4 py-2.5 text-neutral-400 italic">{exp.note || '-'}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-400">{formatLira(exp.amount)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              handleStartEdit(exp);
                            }}
                            className="p-1 text-neutral-500 hover:text-indigo-400 rounded transition-colors cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-neutral-500 italic">Henüz kaydedilmiş gider bulunmuyor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: DATA VIEWING AREA (VERİLERE BAKMA YERİ) */}
      {mainTab === 'view' && (
        <div className="space-y-6 animate-fade-in" id="expense-view-section">
          {/* Sub-navigation inside Viewing Area */}
          <div className="bg-[#111115] p-2 rounded-2xl border border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800/80 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewSubTab('ledger')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewSubTab === 'ledger'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Gider Listesi</span>
              </button>

              <button
                type="button"
                onClick={() => setViewSubTab('matrix')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewSubTab === 'matrix'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>12 Aylık Matris</span>
              </button>

              <button
                type="button"
                onClick={() => setViewSubTab('charts')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewSubTab === 'charts'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <PieChartIcon className="h-3.5 w-3.5" />
                <span>Pasta Grafik Analizi</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportExpensesExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer w-full sm:w-auto justify-center"
            >
              <Download className="h-4 w-4" />
              <span>Gider Listesini Excel İndir</span>
            </button>
          </div>

          {/* Edit Modal/Panel inside Viewing Area */}
          {editingExpense && (
            <div className="bg-[#121118] p-5 rounded-2xl border border-indigo-950/60 shadow-lg space-y-4 animate-fade-in" id="edit-expense-panel">
              <div className="flex items-center justify-between border-b border-indigo-950/50 pb-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <Edit2 className="h-4 w-4" />
                  <span>Gider Kaydını Düzenle</span>
                </div>
                <button type="button" onClick={handleCancelEdit} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gider Kalemi</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-xl bg-neutral-900 text-white focus:outline-none focus:border-indigo-500"
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gider Tutarı (TL)</label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-xl bg-neutral-900 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gider Tarihi</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-xl bg-neutral-900 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Özel Not / Açıklama</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-xl bg-neutral-900 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Delete Confirm Panel */}
          {deleteConfirmId && (
            <div className="bg-[#1c1214] p-5 rounded-2xl border border-rose-950/50 shadow-md space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="h-4 w-4 text-rose-500" />
                <span>Gider Kaydını Silme Onayı</span>
              </div>
              <p className="text-xs text-neutral-300">
                Bu gider kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          )}

          {/* VIEW SUB-TAB 1: LEDGER TABLE */}
          {viewSubTab === 'ledger' && (
            <div className="bg-[#0a0a0a] rounded-2xl border border-neutral-800 overflow-hidden shadow-xs space-y-0">
              <div className="p-4 bg-[#111115] border-b border-neutral-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-white">Detaylı Gider Hareketleri Listesi</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Sistemdeki tüm harcama ve masraf kayıtları</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Category Filter dropdown */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-white rounded-xl text-xs focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="all">Tüm Gider Kalemleri</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Giderlerde ara..."
                      value={ledgerSearchTerm}
                      onChange={(e) => setLedgerSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 w-48 text-xs border border-neutral-800 rounded-xl bg-neutral-900 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-950/60 border-b border-neutral-800 text-[10px] font-bold uppercase text-neutral-500">
                      <th className="px-5 py-3">Tarih</th>
                      <th className="px-4 py-3">Gider Kalemi</th>
                      <th className="px-4 py-3">Açıklama / Not</th>
                      <th className="px-4 py-3 text-right">Tutar (TL)</th>
                      <th className="px-5 py-3 text-center w-28">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                    {filteredExpenses.length > 0 ? (
                      filteredExpenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-neutral-900/40 transition-colors">
                          <td className="px-5 py-3 font-mono font-semibold text-neutral-400">{exp.date}</td>
                          <td className="px-4 py-3 font-bold text-white">{exp.categoryName}</td>
                          <td className="px-4 py-3 text-neutral-400 font-medium">{exp.note || <span className="text-neutral-600 italic">Not yok</span>}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">{formatLira(exp.amount)}</td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(exp)}
                                className="p-1 text-neutral-500 hover:text-indigo-400 rounded transition-colors cursor-pointer"
                                title="Düzenle"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(exp.id)}
                                className="p-1 text-neutral-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                                title="Sil"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-neutral-500 italic">Aradığınız kriterlere uygun gider kaydı bulunamadı.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW SUB-TAB 2: 12-MONTH MATRIX TABLE */}
          {viewSubTab === 'matrix' && (
            <div className="bg-[#0a0a0a] rounded-2xl border border-neutral-800 overflow-hidden shadow-xs space-y-0">
              <div className="p-4 bg-[#111115] border-b border-neutral-800 font-bold text-xs uppercase tracking-wider text-white">
                12 Aylık Gider Dağılım Matrisi (2026 Yıllık Bütçe)
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-neutral-950/50 border-b border-neutral-800 text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider">
                      <th className="px-4 py-3 text-left text-white font-bold w-44">Gider Kalemi</th>
                      <th className="px-2 py-3 text-right">Oca</th>
                      <th className="px-2 py-3 text-right">Şub</th>
                      <th className="px-2 py-3 text-right">Mar</th>
                      <th className="px-2 py-3 text-right">Nis</th>
                      <th className="px-2 py-3 text-right">May</th>
                      <th className="px-2 py-3 text-right">Haz</th>
                      <th className="px-2 py-3 text-right">Tem</th>
                      <th className="px-2 py-3 text-right">Ağu</th>
                      <th className="px-2 py-3 text-right">Eyl</th>
                      <th className="px-2 py-3 text-right">Eki</th>
                      <th className="px-2 py-3 text-right">Kas</th>
                      <th className="px-2 py-3 text-right">Ara</th>
                      <th className="px-4 py-3 text-right text-rose-400 font-bold">Yıllık Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-[11px] font-semibold text-neutral-400">
                    {expenseMatrix.map((row) => (
                      <tr key={row.id} className="hover:bg-neutral-900/40 transition-colors">
                        <td className="px-4 py-3 text-left font-bold text-white truncate max-w-[170px]">
                          {row.name}
                        </td>
                        {row.monthlySums.map((sum, idx) => (
                          <td key={idx} className="px-2 py-3 text-right font-mono text-neutral-500">
                            {sum > 0 ? sum.toLocaleString('tr-TR') : <span className="text-neutral-700">—</span>}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-400 bg-rose-500/5">
                          {row.total > 0 ? formatLira(row.total) : '0.00 ₺'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW SUB-TAB 3: RECHARTS PASTA GRAFİK ANALİZİ */}
          {viewSubTab === 'charts' && (
            <div className="space-y-6 animate-fade-in" id="expense-pie-chart-analysis">
              {/* KPI Metrics Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 flex items-center gap-3">
                  <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Toplam Analiz Edilen Gider</span>
                    <span className="text-base font-extrabold text-white font-mono">{formatLira(pieChartData.totalSpent)}</span>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Aktif Gider Kalemi Sayısı</span>
                    <span className="text-base font-extrabold text-white font-mono">{pieChartData.items.length} Kalem</span>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">En Yüksek Paylı Kalem</span>
                    <span className="text-sm font-bold text-amber-300 truncate block">
                      {pieChartData.items.length > 0 ? `${pieChartData.items[0].name} (%${pieChartData.items[0].percentage})` : 'Mevcut Değil'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Donut Pie Chart & Legend Section */}
              <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-4 gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-rose-400" />
                      <span>Gider Kalemi Dağılım Oranları (Pasta Grafik)</span>
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">Tüm harcamaların kategorilere göre yüzdesil ve tutarsal dağılımı</p>
                  </div>
                  <span className="text-xs text-neutral-400 font-mono bg-neutral-900 px-3 py-1 rounded-lg border border-neutral-800">
                    2026 Yıllık Veriler
                  </span>
                </div>

                {pieChartData.items.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    {/* Donut Chart Container with Center Overlay */}
                    <div className="lg:col-span-6 relative flex items-center justify-center h-80 w-full bg-[#0d0d12] rounded-2xl border border-neutral-800/80 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData.items}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={115}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="#0a0a0a"
                            strokeWidth={3}
                          >
                            {pieChartData.items.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip 
                            formatter={(value: any, name: any, props: any) => [
                              `${formatLira(Number(value))} (%${props.payload.percentage})`,
                              props.payload.name
                            ]}
                            contentStyle={{ 
                              backgroundColor: '#161618', 
                              borderRadius: '12px', 
                              border: '1px solid #333', 
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Donut Center Info Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Toplam Gider</span>
                        <span className="text-base font-extrabold text-white font-mono">{formatLira(pieChartData.totalSpent)}</span>
                      </div>
                    </div>

                    {/* Detailed Category Legend Cards */}
                    <div className="lg:col-span-6 space-y-2.5 max-h-[340px] overflow-y-auto pr-2">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                        Kategori Bazlı Pay Detayları
                      </span>

                      {pieChartData.items.map((item, index) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-3 bg-neutral-900/60 hover:bg-neutral-900 rounded-xl border border-neutral-800/80 transition-all"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <span 
                              className="w-3.5 h-3.5 rounded-md shrink-0 shadow-xs" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-xs font-bold text-white truncate">{item.name}</span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                              style={{ 
                                backgroundColor: `${COLORS[index % COLORS.length]}20`,
                                color: COLORS[index % COLORS.length]
                              }}
                            >
                              %{item.percentage}
                            </span>
                            <span className="text-xs font-mono font-bold text-neutral-200 w-24 text-right">
                              {formatLira(item.value)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-neutral-500 text-xs italic">
                    Pasta grafik analizini görüntülemek için henüz kayıtlı gider verisi bulunmuyor.
                  </div>
                )}
              </div>

              {/* Category Share Visual Progress Bars */}
              {pieChartData.items.length > 0 && (
                <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-neutral-800 pb-2">
                    Kategori Bütçe Payı Karşılaştırma Barları
                  </h3>

                  <div className="space-y-3">
                    {pieChartData.items.map((item, index) => (
                      <div key={item.id} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-neutral-300">{item.name}</span>
                          <span className="font-mono font-bold text-neutral-400">
                            {formatLira(item.value)} <span className="text-neutral-500">(%{item.percentage})</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.max(item.percentage, 2)}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
