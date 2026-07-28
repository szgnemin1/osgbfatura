import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as ChartTooltip, 
  Legend as ChartLegend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { Plus, Search, Calendar, CreditCard, Tag, FileText, BarChart3, PieChartIcon, TrendingDown, DollarSign, Table, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Expense, ExpenseCategory, Transaction } from '../types';
import { formatLira } from '../initialData';

interface ExpenseManagementViewProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  transactions: Transaction[]; // For Revenue vs Expense analysis
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onAddCategory: (name: string) => void;
  onEditExpense?: (id: string, updatedExp: Partial<Expense>) => void;
  onDeleteExpense?: (id: string) => void;
}

export default function ExpenseManagementView({
  expenses,
  categories,
  transactions,
  onAddExpense,
  onAddCategory,
  onEditExpense,
  onDeleteExpense
}: ExpenseManagementViewProps) {
  // Sub tab selection to separate Matrix table from graphical analysis charts
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'charts'>('matrix');

  // Input Form States
  const [newCatName, setNewCatName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState('2026-07-07');
  const [expNote, setExpNote] = useState('');
  const [catSearchTerm, setCatSearchTerm] = useState('');

  // Ledger filter/search
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');

  // Editing states
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  // Deletion confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  // Colors for Pie Chart slices (Sophisticated dark palette)
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f43f5e', '#a855f7', '#06b6d4'];

  // Filter categories dynamically based on search
  const searchedCategories = useMemo(() => {
    return categories.filter(c => c.name.toLowerCase().includes(catSearchTerm.toLowerCase()));
  }, [categories, catSearchTerm]);

  // Handle adding a new category
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    // Check if duplicate
    const exists = categories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase());
    if (exists) {
      alert('Bu gider kalemi zaten mevcut.');
      return;
    }

    onAddCategory(newCatName.trim());
    setNewCatName('');
    alert('Yeni gider kalemi başarıyla eklendi.');
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

    setExpAmount('');
    setExpNote('');
    setSelectedCatId('');
    setCatSearchTerm('');
    alert('Gider kaydı başarıyla eklendi.');
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
    alert('Gider kaydı güncellendi.');
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (!onDeleteExpense || !deleteConfirmId) return;
    onDeleteExpense(deleteConfirmId);
    setDeleteConfirmId(null);
    alert('Gider kaydı silindi.');
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = exp.note.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) ||
                            exp.categoryName.toLowerCase().includes(ledgerSearchTerm.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => b.date.localeCompare(a.date)); // Newest first
  }, [expenses, ledgerSearchTerm]);

  // Matrix calculation: rows are Gider Kalemi, columns are 12 Months
  const expenseMatrix = useMemo(() => {
    return categories.map(cat => {
      let categoryTotal = 0;
      const monthlySums = monthsNames.map(m => {
        // Filter expenses for this category and month in year 2026
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
    }).sort((a, b) => b.total - a.total); // Sorted by total spent descending
  }, [categories, expenses]);

  // General Summary Metrics for the whole year 2026
  const analytics = useMemo(() => {
    const total2026 = expenses
      .filter(e => e.date.startsWith('2026'))
      .reduce((sum, e) => sum + e.amount, 0);

    const julExpenses = expenses
      .filter(e => e.date.startsWith('2026-07'))
      .reduce((sum, e) => sum + e.amount, 0);

    // Highest expense category in 2026
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

  // Pie Chart Data: Spent per category in year 2026
  const pieChartData = useMemo(() => {
    return categories.map(cat => {
      const value = expenses
        .filter(e => e.categoryId === cat.id && e.date.startsWith('2026'))
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        name: cat.name,
        value: Math.round(value)
      };
    }).filter(item => item.value > 0);
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
      // Income = invoice payments collected in this month
      const income = transactions
        .filter(t => t.type === 'payment' && t.date.startsWith(m.key))
        .reduce((sum, t) => sum + t.amount, 0);

      // Expenses logged in this month
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

  return (
    <div className="space-y-6" id="expenses-container">
      {/* Header */}
      <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-xs">
        <h1 className="text-xl font-semibold text-white tracking-tight">Gider Yönetimi & Analizi</h1>
        <p className="text-xs text-neutral-400 mt-1">Gider bütçesi girişleri, kategorizasyon ve gelir-gider dağılım grafikleri.</p>
      </div>

      {/* Analysis Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="expense-metrics">
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Yıllık Toplam Gider</span>
            <h3 className="text-xl font-extrabold text-white mt-1">{formatLira(analytics.annualTotal)}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-450 border border-rose-500/10">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Temmuz Gideri (Cari)</span>
            <h3 className="text-xl font-extrabold text-white mt-1">{formatLira(analytics.julyTotal)}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-450 border border-rose-500/10">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">En Yüksek Gider Kalemi</span>
            <h3 className="text-sm font-bold text-white mt-2 truncate max-w-[200px]">{analytics.highestCategory}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-450 border border-rose-500/10">
            <Tag className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Elegant Sub-Tab Selection to partition view content */}
      <div className="flex bg-[#0c0c0c] p-1 rounded-xl border border-neutral-800/60 max-w-md" id="expense-subtabs-nav">
        <button
          type="button"
          onClick={() => setActiveSubTab('matrix')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeSubTab === 'matrix'
              ? 'bg-indigo-650 text-white shadow-xs font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40'
          }`}
        >
          <Table className="h-4 w-4" />
          Gider Matrisi & Giriş
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('charts')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeSubTab === 'charts'
              ? 'bg-indigo-650 text-white shadow-xs font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Analiz Grafikleri
        </button>
      </div>

      {activeSubTab === 'matrix' ? (
        /* 12 Months Expenses Matrix and Entry form */
        <div className="flex flex-col gap-6 animate-fade-in" id="expense-matrix-and-forms">
          {/* Upper Forms Row: Add Category and Add Expense side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="expense-upper-forms">
            {/* Form 1: Add New Expense Category */}
            <form onSubmit={handleAddNewCategory} className="lg:col-span-4 bg-[#0a0a0a] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="font-bold text-neutral-200 text-xs uppercase tracking-wider pb-2 border-b border-neutral-800 flex items-center gap-1.5 mb-4">
                  <Tag className="h-4 w-4 text-indigo-400" />
                  Yeni Gider Kalemi Ekle
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Gider Kalem Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: Kırtasiye Giderleri"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-neutral-900 text-white"
                    required
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Kalem Ekle
                </button>
              </div>
            </form>

            {/* Form 2: Log an Expense transaction */}
            <form onSubmit={handleAddExpenseSubmit} className="lg:col-span-8 bg-[#0a0a0a] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="font-bold text-neutral-200 text-xs uppercase tracking-wider pb-2 border-b border-neutral-800 flex items-center gap-1.5 mb-4">
                  <CreditCard className="h-4 w-4 text-rose-450" />
                  Gider Girişi Yap
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1: Live Search Gider Kalemi */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gider Kalemi Seç</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="Ara..."
                        value={catSearchTerm}
                        onChange={(e) => setCatSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 w-full text-[11px] border border-neutral-800 rounded-md bg-neutral-900 text-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <select
                      value={selectedCatId}
                      onChange={(e) => setSelectedCatId(e.target.value)}
                      className="w-full px-3 py-1 text-xs border border-neutral-800 rounded-lg bg-neutral-900 text-white focus:outline-hidden focus:border-indigo-500 min-h-[75px]"
                      size={3}
                      required
                    >
                      {searchedCategories.map(c => (
                        <option key={c.id} value={c.id} className="bg-neutral-950 text-white py-0.5">{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Column 2: Amount & Date */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Gider Tutarı (TL)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-lg bg-neutral-900 text-white focus:outline-hidden focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Gider Tarihi</label>
                      <input
                        type="date"
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-lg bg-neutral-900 text-white focus:outline-hidden focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Column 3: Note & Submit Button */}
                  <div className="space-y-3 flex flex-col justify-between">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Özel Not / Açıklama</label>
                      <input
                        type="text"
                        placeholder="Örn: Fatura No: 2321"
                        value={expNote}
                        onChange={(e) => setExpNote(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-lg bg-neutral-900 text-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-rose-950/20 cursor-pointer"
                      >
                        Gideri Kaydet
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Matrix Table: 12 Months full-width layout */}
          <div className="w-full bg-[#111111] rounded-2xl border border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between" id="matrix-table-card">
            <div className="p-4 bg-[#0a0a0a] border-b border-neutral-800 font-bold text-xs uppercase tracking-wider text-neutral-400">
              12 Aylık Gider Dağılım Matrisi (2026)
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-neutral-950/30 border-b border-neutral-800 text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider">
                    <th className="px-4 py-3 text-right text-white font-bold w-36">Gider Kalemi</th>
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
                    <th className="px-4 py-3 text-right text-rose-400 font-bold">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-[11px] font-semibold text-neutral-400">
                  {expenseMatrix.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-900/30 transition-colors">
                      {/* Item/Category Name */}
                      <td className="px-4 py-3 text-right font-bold text-white truncate max-w-[150px]">
                        {row.name}
                      </td>

                      {/* 12 monthly sums */}
                      {row.monthlySums.map((sum, idx) => (
                        <td key={idx} className="px-2 py-3 text-right text-neutral-500">
                          {sum > 0 ? sum.toLocaleString('tr-TR') : <span className="text-neutral-750">—</span>}
                        </td>
                      ))}

                      {/* Total column */}
                      <td className="px-4 py-3 text-right text-rose-400 font-bold bg-rose-500/5">
                        {row.total > 0 ? formatLira(row.total) : '0.00 TL'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Custom Edit Expense Form */}
          {editingExpense && (
            <div className="bg-[#121118] p-5 rounded-2xl border border-indigo-950/40 shadow-sm space-y-4 animate-fade-in" id="edit-expense-panel">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm border-b border-indigo-950/50 pb-2">
                <Edit2 className="h-4 w-4" />
                <span>Gider Kaydını Düzenle</span>
              </div>
              <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gider Kalemi</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-lg bg-neutral-900 text-white focus:outline-hidden focus:border-indigo-500"
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
                    className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-lg bg-neutral-900 text-white focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gider Tarihi</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-lg bg-neutral-900 text-white focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Özel Not / Açıklama</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-800 rounded-lg bg-neutral-900 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Custom Delete Confirmation Card */}
          {deleteConfirmId && (
            <div className="bg-[#1c1214] p-5 rounded-2xl border border-rose-950/50 shadow-sm space-y-4 animate-fade-in" id="expense-delete-confirmation-panel">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                <span>Gider Kaydını Sil</span>
              </div>
              <p className="text-xs text-neutral-300">
                Bu gider kaydını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-end gap-2 pt-2">
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
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          )}

          {/* Expense Ledger Table */}
          <div className="w-full bg-[#111111] rounded-2xl border border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between" id="expenses-ledger-card">
            <div className="p-4 bg-[#0a0a0a] border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400">Gider Hareketleri Listesi</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Sistemde kayıtlı tüm münferit gider kalemleri</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Giderlerde ara..."
                    value={ledgerSearchTerm}
                    onChange={(e) => setLedgerSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1 w-48 text-[11px] border border-neutral-800 rounded-lg bg-neutral-900 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-neutral-950/30 border-b border-neutral-800 text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider">
                    <th className="px-4 py-3">Gider Kalemi</th>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3">Açıklama / Not</th>
                    <th className="px-4 py-3 text-right">Tutar</th>
                    <th className="px-4 py-3 text-center w-28">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-[11px] font-semibold text-neutral-400">
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-neutral-900/30 transition-colors">
                        <td className="px-4 py-3 font-bold text-white">
                          {exp.categoryName}
                        </td>
                        <td className="px-4 py-3 text-neutral-350">
                          {exp.date}
                        </td>
                        <td className="px-4 py-3 text-neutral-400 font-normal">
                          {exp.note || <span className="text-neutral-600 italic">Not girilmemiş</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-rose-450 font-bold">
                          {formatLira(exp.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(exp)}
                              className="p-1 text-neutral-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors cursor-pointer"
                              title="Düzenle"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(exp.id)}
                              className="p-1 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
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
                      <td colSpan={5} className="px-4 py-8 text-center text-neutral-500 italic">
                        Gösterilecek gider kaydı bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Advanced charts area */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" id="expense-charts-grid">
        {/* Recharts Bar/Line Chart: Gelir vs Gider Dağılımı */}
        <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">Gelir & Gider Dağılımı</h2>
            <p className="text-xs text-neutral-400 mt-1">Aylık bazda gerçekleşen tahsilat girişi vs gider dağılımı</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueVsExpenseData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#737373', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#737373', fontSize: 10 }} />
                <ChartTooltip
                  formatter={(value: any) => [formatLira(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#161616', borderRadius: '12px', border: '1px solid #262626', color: '#e5e5e5' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Gelir (Tahsilat)" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Gider" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recharts Pie Chart: Gider Dağılımı Pasta Grafiği */}
        <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">Gider Dağılım Oranları</h2>
            <p className="text-xs text-neutral-400 mt-1">Kategorilere göre 2026 yılı gider payları</p>
          </div>
          <div className="h-72 w-full flex flex-col sm:flex-row items-center gap-4">
            {pieChartData.length > 0 ? (
              <>
                <div className="flex-1 h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        formatter={(value: any) => [formatLira(Number(value)), '']}
                        contentStyle={{ backgroundColor: '#161616', borderRadius: '12px', border: '1px solid #262626', color: '#e5e5e5' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* List categories with colors side-by-side */}
                <div className="w-full sm:w-48 overflow-y-auto max-h-[220px] space-y-1.5 text-[11px] font-medium text-neutral-400">
                  {pieChartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span 
                        className="inline-block w-2.5 h-2.5 rounded-xs shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate">{entry.name}:</span>
                      <span className="font-bold text-white ml-auto">{formatLira(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 text-xs">
                Grafik oluşturulacak gider verisi bulunamadı.
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
