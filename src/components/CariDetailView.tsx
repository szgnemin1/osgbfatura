import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Trash2, Edit2, Check, Download, AlertCircle, TrendingUp, TrendingDown, 
  DollarSign, Calendar, Filter, FileText, Printer, X, Sparkles, ChevronDown, Clock, ShieldCheck,
  BookOpen
} from 'lucide-react';
import { Firm, Invoice, Transaction } from '../types';
import { formatLira, downloadExcel } from '../initialData';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to remove Turkish diacritics for safe standard PDF font embedding
function toAsciiFriendly(text: string): string {
  if (!text) return '';
  return text
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

// Turkish case-insensitive normalization helper
function normalizeTurkish(str: string): string {
  if (!str) return '';
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase();
}

const getTwelveMonthsAgoStr = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
};

const getTodayStr = () => {
  return new Date().toISOString().split('T')[0];
};

interface CariDetailViewProps {
  firms: Firm[];
  invoices: Invoice[];
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onMarkInvoicePaid: (invoiceId: string) => void;
  onEditTransaction?: (id: string, updatedTx: Partial<Transaction>) => void;
  onDeleteTransaction?: (id: string) => void;
}

export default function CariDetailView({
  firms,
  invoices,
  transactions,
  onAddTransaction,
  onMarkInvoicePaid,
  onEditTransaction,
  onDeleteTransaction
}: CariDetailViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFirmId, setSelectedFirmId] = useState<string>(firms[0]?.id || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Date Range Filtering (Default to 12 months)
  const [dateFilterMode, setDateFilterMode] = useState<'12months' | 'all' | 'custom'>('12months');
  const [startDate, setStartDate] = useState<string>(getTwelveMonthsAgoStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  // Ekstre Download Prompt Modal States
  const [showEkstreModal, setShowEkstreModal] = useState(false);
  const [ekstreFilterMode, setEkstreFilterMode] = useState<'all' | '12months' | 'custom'>('12months');
  const [ekstreStartDate, setEkstreStartDate] = useState<string>(getTwelveMonthsAgoStr());
  const [ekstreEndDate, setEkstreEndDate] = useState<string>(getTodayStr());

  // Transaction Modals/forms
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  
  // Form values
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState('2026-07-07');
  const [txDesc, setTxDesc] = useState('');

  // Editing Transaction state variables
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editType, setEditType] = useState<'invoice' | 'payment' | 'debt_addition'>('payment');
  
  // Custom delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Selected firm object
  const selectedFirm = firms.find(f => f.id === selectedFirmId);

  // Filter & Search Firms (Turkish case-insensitive support)
  const filteredFirms = useMemo(() => {
    const normSearch = normalizeTurkish(searchTerm);
    return firms.filter(f => normalizeTurkish(f.name).includes(normSearch))
                .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [firms, searchTerm]);

  // Compute stats for all firms (overall balance)
  const firmsWithBalances = useMemo(() => {
    return firms.map(f => {
      const firmTxs = transactions.filter(t => t.firmId === f.id);
      
      const totalInvoiced = firmTxs
        .filter(t => t.type === 'invoice' || t.type === 'debt_addition')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalCollected = firmTxs
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + t.amount, 0);

      const balance = Math.round((totalInvoiced - totalCollected) * 100) / 100;

      return {
        ...f,
        totalInvoiced,
        totalCollected,
        balance
      };
    });
  }, [firms, transactions]);

  const selectedFirmWithBalances = useMemo(() => {
    return firmsWithBalances.find(f => f.id === selectedFirmId);
  }, [firmsWithBalances, selectedFirmId]);

  // All transactions for the selected firm sorted chronologically ascending
  const sortedAscTransactions = useMemo(() => {
    return transactions
      .filter(t => t.firmId === selectedFirmId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, selectedFirmId]);

  // Transactions with cumulative running balance per line
  const txsWithRunningBalance = useMemo(() => {
    let cumulative = 0;
    return sortedAscTransactions.map(t => {
      const isDebit = t.type === 'invoice' || t.type === 'debt_addition';
      if (isDebit) {
        cumulative += t.amount;
      } else {
        cumulative -= t.amount;
      }
      return {
        ...t,
        runningBalance: Math.round(cumulative * 100) / 100
      };
    });
  }, [sortedAscTransactions]);

  // Prior opening balance (Devreden Bakiye) before the start date if filtering is active
  const openingBalance = useMemo(() => {
    if (dateFilterMode === 'all') return 0;
    const cutoff = startDate;
    const priorTxs = sortedAscTransactions.filter(t => t.date < cutoff);
    const priorInvoiced = priorTxs.filter(t => t.type === 'invoice' || t.type === 'debt_addition').reduce((s, t) => s + t.amount, 0);
    const priorCollected = priorTxs.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
    return Math.round((priorInvoiced - priorCollected) * 100) / 100;
  }, [sortedAscTransactions, dateFilterMode, startDate]);

  // Filtered transactions for view display (descending order by date)
  const displayTransactions = useMemo(() => {
    let list = [...txsWithRunningBalance];
    if (dateFilterMode === '12months') {
      list = list.filter(t => t.date >= startDate && t.date <= endDate);
    } else if (dateFilterMode === 'custom') {
      if (startDate) list = list.filter(t => t.date >= startDate);
      if (endDate) list = list.filter(t => t.date <= endDate);
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [txsWithRunningBalance, dateFilterMode, startDate, endDate]);

  // Metrics for filtered period
  const filteredInvoicedSum = useMemo(() => {
    return displayTransactions
      .filter(t => t.type === 'invoice' || t.type === 'debt_addition')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [displayTransactions]);

  const filteredCollectedSum = useMemo(() => {
    return displayTransactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [displayTransactions]);

  // Handle manual additions
  const handleAddManualTransactionSubmit = (type: 'debt_addition' | 'payment') => {
    if (!selectedFirmId || !txAmount) return;

    onAddTransaction({
      firmId: selectedFirmId,
      firmName: selectedFirm?.name || '',
      type,
      date: txDate,
      amount: Number(txAmount),
      description: txDesc || (type === 'payment' ? 'Elden/Banka Tahsilat' : 'Geçmiş Dönem Borç Girişi')
    });

    setTxAmount('');
    setTxDesc('');
    setShowAddDebt(false);
    setShowAddPayment(false);
    alert('İşlem başarıyla cari hesaba işlendi.');
  };

  // Mark an invoice as Paid and automatically record payment
  const handleMarkPaid = (inv: Invoice) => {
    onMarkInvoicePaid(inv.id);
    alert(`${inv.firmName} unvanlı firmanın ${inv.date} tarihli faturası ödendi olarak işaretlendi ve tahsilat eklendi.`);
  };

  const handleSaveEditedTransactionSubmit = () => {
    if (!editingTransaction || !editAmount || !onEditTransaction) return;

    onEditTransaction(editingTransaction.id, {
      type: editType,
      amount: Number(editAmount),
      date: editDate,
      description: editDesc
    });

    setEditingTransaction(null);
    alert('Cari hareket başarıyla güncellendi.');
  };

  const handleDeleteTransactionClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (!onDeleteTransaction || !deleteConfirmId) return;
    onDeleteTransaction(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  // EXPORT PROCESSOR (Excel) with chosen filter
  const executeExcelExport = (mode: 'all' | '12months' | 'custom', pStart: string, pEnd: string) => {
    if (!selectedFirm || !selectedFirmWithBalances) return;

    let targetTxs = [...txsWithRunningBalance];
    let rangeLabel = 'Tüm Zamanlar';

    if (mode === '12months' || mode === 'custom') {
      targetTxs = targetTxs.filter(t => t.date >= pStart && t.date <= pEnd);
      rangeLabel = `${pStart} - ${pEnd}`;
    }

    targetTxs.sort((a, b) => b.date.localeCompare(a.date));

    const headers = ['Tarih', 'İşlem Tipi', 'Açıklama', 'Borç / Fatura (TL)', 'Alacak / Tahsilat (TL)', 'Satır Bakiye (TL)'];
    
    const data = targetTxs.map(t => {
      let typeLabel = '';
      if (t.type === 'invoice') typeLabel = 'Fatura';
      else if (t.type === 'debt_addition') typeLabel = 'Borç Girişi';
      else if (t.type === 'payment') typeLabel = 'Tahsilat';

      const isDebit = t.type === 'invoice' || t.type === 'debt_addition';

      return [
        t.date,
        typeLabel,
        t.description,
        isDebit ? t.amount.toFixed(2) : '0.00',
        !isDebit ? t.amount.toFixed(2) : '0.00',
        t.runningBalance.toFixed(2)
      ];
    });

    data.push([]);
    data.push(['Ekstre Tarih Aralığı:', rangeLabel, '', '', '', '']);
    data.push(['Toplam Kesilen Faturalar / Borçlar', '', '', selectedFirmWithBalances.totalInvoiced.toFixed(2), '', '']);
    data.push(['Toplam Yapılan Tahsilatlar', '', '', '', selectedFirmWithBalances.totalCollected.toFixed(2), '']);
    data.push(['Güncel Cari Bakiye', '', '', '', '', selectedFirmWithBalances.balance.toFixed(2)]);

    downloadExcel(data, `${selectedFirm.name}_Cari_Ekstre_${mode}`, headers);
  };

  // EXPORT PROCESSOR (PDF) with chosen filter
  const executePDFExport = (mode: 'all' | '12months' | 'custom', pStart: string, pEnd: string) => {
    if (!selectedFirm || !selectedFirmWithBalances) return;

    let targetTxs = [...txsWithRunningBalance];
    let rangeLabel = 'TÜM ZAMANLAR (TÜM BİLGİLER)';

    if (mode === '12months' || mode === 'custom') {
      targetTxs = targetTxs.filter(t => t.date >= pStart && t.date <= pEnd);
      rangeLabel = `${pStart} / ${pEnd}`;
    }

    targetTxs.sort((a, b) => a.date.localeCompare(b.date)); // Chronological for statement

    // Create jsPDF instance (A4 portrait)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const clean = (str: string) => toAsciiFriendly(str);

    // Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(clean('FCTS | RESMI CARI HESAP EKSTRESI'), 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(clean('FINANSAL CARI TAKIP VE FATURA SISTEMI'), 196, 16, { align: 'right' });

    // Document & Client details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(clean('MUSTERI / CARI BILGILERI'), 14, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Firma Unvani:', 14, 44);
    doc.text('Vergi Numarasi:', 14, 49);
    doc.text('Adres:', 14, 54);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(clean(selectedFirm.name), 42, 44);
    doc.text(clean(selectedFirm.taxNumber || 'Kayit Yok'), 42, 49);
    
    const splitAddr = doc.splitTextToSize(clean(selectedFirm.address || 'Kayit Yok'), 75);
    doc.text(splitAddr, 42, 54);

    // Right Column: Statement Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(clean('EKSTRE PARAMETRELERI'), 130, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Rapor Tarihi:', 130, 44);
    doc.text('Ekstre Araligi:', 130, 49);
    doc.text('Cari Durum:', 130, 54);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(new Date().toLocaleDateString('tr-TR'), 158, 44);
    doc.text(clean(rangeLabel), 158, 49);
    
    const curBal = selectedFirmWithBalances.balance;
    const curBalText = curBal === 0 ? 'DENGEDE' : (curBal > 0 ? 'BORCLU' : 'ALACAKLI');
    doc.text(curBalText, 158, 54);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, 64, 196, 64);

    // Table Headers
    const tableHeaders = [['Tarih', 'Islem Tipi', 'Aciklama', 'Borc (TL)', 'Alacak (TL)', 'Bakiye (TL)']];
    
    // Rows
    const tableRows = targetTxs.map(t => {
      let typeLabel = '';
      if (t.type === 'invoice') typeLabel = 'Fatura';
      else if (t.type === 'debt_addition') typeLabel = 'Borc Girisi';
      else if (t.type === 'payment') typeLabel = 'Tahsilat';

      const isDebit = t.type === 'invoice' || t.type === 'debt_addition';

      return [
        t.date,
        clean(typeLabel),
        clean(t.description),
        isDebit ? `${t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '-',
        !isDebit ? `${t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '-',
        `${t.runningBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`
      ];
    });

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: 70,
      theme: 'striped',
      styles: { 
        fontSize: 8, 
        font: 'helvetica',
        cellPadding: 3.5,
        textColor: [51, 65, 85]
      },
      headStyles: { 
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 8.5
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 22 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
        5: { halign: 'right', fontStyle: 'bold', cellWidth: 32 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    let summaryY = (doc as any).lastAutoTable.finalY + 8;
    if (summaryY > 235) {
      doc.addPage();
      summaryY = 20;
    }

    doc.setFillColor(248, 250, 252);
    doc.rect(110, summaryY, 86, 42, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(110, summaryY, 86, 42, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Toplam Borc / Faturalar:', 114, summaryY + 8);
    doc.text('Toplam Tahsilatlar:', 114, summaryY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`+${selectedFirmWithBalances.totalInvoiced.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 192, summaryY + 8, { align: 'right' });
    doc.text(`-${selectedFirmWithBalances.totalCollected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 192, summaryY + 16, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(112, summaryY + 22, 194, summaryY + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Net Cari Bakiye:', 114, summaryY + 29);

    const bal = selectedFirmWithBalances.balance;
    let balanceText = '';
    let statusText = '';
    
    if (bal === 0) {
      balanceText = '0.00 TL';
      statusText = 'DENGEDE';
      doc.setTextColor(100, 116, 139);
    } else if (bal > 0) {
      balanceText = `${bal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
      statusText = 'FIRMA BORCLU';
      doc.setTextColor(225, 29, 72);
    } else {
      balanceText = `${Math.abs(bal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
      statusText = 'ALACAKLI (FAZLA ODEME)';
      doc.setTextColor(5, 150, 105);
    }
    doc.text(balanceText, 192, summaryY + 29, { align: 'right' });

    doc.setFontSize(7.5);
    doc.text(clean(statusText), 192, summaryY + 36, { align: 'right' });

    doc.save(`${toAsciiFriendly(selectedFirm.name)}_Cari_Hesap_Ekstresi.pdf`);
  };

  // EXPORT ALL FIRMS SUMMARY REPORT
  const handleExportAllBalances = () => {
    const headers = ['Firma Unvanı', 'Fatura Tipi', 'Toplam Kesilen Faturalar (TL)', 'Toplam Tahsilat (TL)', 'Güncel Bakiye (TL)', 'Durum'];

    const data = firmsWithBalances.map(f => [
      f.name,
      f.invoiceType === 'efatura' ? 'e-Fatura' : 'e-Arşiv',
      f.totalInvoiced.toFixed(2),
      f.totalCollected.toFixed(2),
      f.balance.toFixed(2),
      f.balance > 0 ? 'Borçlu' : f.balance < 0 ? 'Alacaklı (Fazla Ödeme)' : 'Dengede'
    ]);

    downloadExcel(data, `Tum_Cari_Hesaplar_Bakiye_Raporu`, headers);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto" id="cari-layout">
      {/* Dynamic Backdrop for dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-30 cursor-default" 
          onClick={() => setIsDropdownOpen(false)} 
        />
      )}

      {/* Top Banner & Global Actions Card */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4 relative">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 justify-center md:justify-start">
            <BookOpen className="h-4.5 w-4.5 text-indigo-400" />
            Cari Defter ve Hesap Detayları
          </h2>
          <p className="text-xs text-neutral-400">
            Firma bazlı tüm kesilen faturaları, borç hareketlerini ve tahsilatları tek bakışta inceleyin.
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={handleExportAllBalances}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold transition-all cursor-pointer w-full md:w-auto"
          >
            <Download className="h-4 w-4 shrink-0" />
            Tüm Carileri Excel Olarak İndir
          </button>
        </div>
      </div>

      {/* Modern Live Search Bar Combobox */}
      <div className="relative max-w-2xl mx-auto z-40" id="cari-search-section">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Hızlı Cari Hesap Ara... (Firma adı yazın)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full pl-12 pr-12 py-3.5 bg-[#0a0a0a] hover:bg-neutral-900 focus:bg-[#0a0a0a] text-sm border border-neutral-800 focus:border-indigo-500 rounded-2xl focus:outline-hidden font-medium text-white transition-all shadow-lg placeholder:text-neutral-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setIsDropdownOpen(false);
              }}
              className="absolute right-4 top-3.5 text-neutral-500 hover:text-neutral-300 transition-colors text-xs font-semibold cursor-pointer"
            >
              Temizle
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown Drop */}
        {isDropdownOpen && (
          <div className="absolute left-0 right-0 mt-2 bg-[#121212] border border-neutral-800 rounded-2xl shadow-2xl z-40 max-h-72 overflow-y-auto divide-y divide-neutral-800/50 animate-fade-in">
            {filteredFirms.length > 0 ? (
              filteredFirms.map((f) => {
                const fb = firmsWithBalances.find(item => item.id === f.id);
                const balance = fb ? fb.balance : 0;
                const isSelected = selectedFirmId === f.id;

                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedFirmId(f.id);
                      setSearchTerm('');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-5 py-3.5 hover:bg-neutral-800/40 transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected ? 'bg-indigo-600/10 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-neutral-200 flex items-center gap-1.5">
                        {f.name}
                        {isSelected && (
                          <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            AKTİF
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5 uppercase tracking-wider">
                        {f.invoiceType === 'efatura' ? 'e-Fatura' : 'e-Arşiv'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${
                        balance > 0 ? 'text-rose-400' : balance < 0 ? 'text-emerald-400' : 'text-neutral-500'
                      }`}>
                        {balance === 0 ? 'Dengede' : formatLira(balance)}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-5 py-5 text-xs text-neutral-500 text-center">
                Arama kriterine uygun firma bulunamadı.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Master Card: Unified Ledger & Balance Control Container */}
      <div className="space-y-6" id="cari-main-details">
        {selectedFirmWithBalances ? (
          <div className="bg-[#0c0c0e] rounded-2xl border border-neutral-800/90 shadow-2xl overflow-hidden space-y-0" id="unified-master-card">
            
            {/* Master Header: Company Title, Tax details, & Big Net Balance Badge */}
            <div className="p-6 bg-[#111115] border-b border-neutral-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-black text-white tracking-tight">{selectedFirmWithBalances.name}</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700 uppercase">
                    {selectedFirmWithBalances.invoiceType === 'efatura' ? 'e-Fatura' : 'e-Arşiv'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {selectedFirmWithBalances.groupName || 'Genel'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-mono">
                  Vergi No: <span className="text-white font-semibold">{selectedFirmWithBalances.taxNumber || 'Kayıt Yok'}</span> • Adres: <span className="text-neutral-300">{selectedFirmWithBalances.address || 'Kayıt Yok'}</span>
                </p>
              </div>

              {/* Master Net Balance Display Box */}
              <div className={`px-5 py-3 rounded-2xl border flex items-center gap-4 shadow-lg ${
                selectedFirmWithBalances.balance > 0 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                  : selectedFirmWithBalances.balance < 0 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-neutral-800/50 border-neutral-700 text-neutral-300'
              }`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Net Cari Bakiye</span>
                  <div className="text-xl font-black tracking-tight mt-0.5">
                    {selectedFirmWithBalances.balance === 0 
                      ? '0.00 ₺ (Dengede)' 
                      : formatLira(Math.abs(selectedFirmWithBalances.balance))
                    }
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                    selectedFirmWithBalances.balance > 0
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : selectedFirmWithBalances.balance < 0
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-neutral-700 border-neutral-600 text-neutral-300'
                  }`}>
                    {selectedFirmWithBalances.balance === 0 ? 'DENGEDE' : selectedFirmWithBalances.balance > 0 ? 'FİRMA BORÇLU' : 'ALACAKLI'}
                  </span>
                </div>
              </div>
            </div>

            {/* Single-row Summary Metrics Bar inside Master Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 bg-[#08080a] border-b border-neutral-800">
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Toplam Borç / Faturalar</span>
                <span className="text-base font-bold text-white block">{formatLira(selectedFirmWithBalances.totalInvoiced)}</span>
              </div>
              
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Toplam Tahsilat (Giriş)</span>
                <span className="text-base font-bold text-emerald-400 block">{formatLira(selectedFirmWithBalances.totalCollected)}</span>
              </div>

              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Seçili Dönem Hareketi</span>
                <span className="text-base font-bold text-indigo-300 block">{displayTransactions.length} Adet İşlem</span>
              </div>

              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Görünüm Aralığı</span>
                <span className="text-xs font-semibold text-neutral-300 block">
                  {dateFilterMode === '12months' ? 'Son 12 Aylık Dönem' : dateFilterMode === 'all' ? 'Tüm Zamanlar' : `${startDate} - ${endDate}`}
                </span>
              </div>
            </div>

            {/* Integrated Controls & Date Filter Toolbar */}
            <div className="p-4 bg-[#0d0d11] border-b border-neutral-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left: Date Range Filter Bar (12 Aylık Varsayılan) */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 mr-1">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <span>Tarih Filtresi:</span>
                </div>

                <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterMode('12months');
                      setStartDate(getTwelveMonthsAgoStr());
                      setEndDate(getTodayStr());
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      dateFilterMode === '12months'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    📅 Son 12 Ay (Görünür)
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateFilterMode('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      dateFilterMode === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    📆 Tüm Zamanlar
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateFilterMode('custom')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      dateFilterMode === 'custom'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    🛠️ Özel Tarih
                  </button>
                </div>

                {dateFilterMode === 'custom' && (
                  <div className="flex items-center gap-1.5 animate-fade-in">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <span className="text-neutral-500 text-xs">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Right: Action Buttons (Ekstre İndir, Borç Ekle, Tahsilat Ekle) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEkstreFilterMode(dateFilterMode);
                    setEkstreStartDate(startDate);
                    setEkstreEndDate(endDate);
                    setShowEkstreModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-indigo-400" />
                  <span>Cari Ekstre Al (Soru Sor)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTxDate(getTodayStr());
                    setShowAddDebt(true);
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Borç Ekle
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setTxDate(getTodayStr());
                    setShowAddPayment(true);
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tahsilat Ekle
                </button>
              </div>
            </div>

            {/* Manual Forms (Inline Popup Box) */}
            {showAddDebt && (
              <div className="p-5 bg-[#1a1113] border-b border-rose-950/50 space-y-3 animate-fade-in">
                <div className="font-bold text-rose-400 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Cari Hesaba Manuel Borç/Yükümlülük Girişi</span>
                  <button type="button" onClick={() => setShowAddDebt(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Borç Tutarı (TL)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Borç Giriş Tarihi</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">İşlem Açıklaması</label>
                    <input
                      type="text"
                      placeholder="Örn: Geçmiş dönem devreden bakiye"
                      value={txDesc}
                      onChange={(e) => setTxDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddDebt(false)}
                    className="px-3 py-1.5 bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddManualTransactionSubmit('debt_addition')}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    Borç Kaydet
                  </button>
                </div>
              </div>
            )}

            {showAddPayment && (
              <div className="p-5 bg-[#0e1713] border-b border-emerald-950/50 space-y-3 animate-fade-in">
                <div className="font-bold text-emerald-400 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Cari Hesaba Tahsilat Girişi (Ödeme Alındı)</span>
                  <button type="button" onClick={() => setShowAddPayment(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tahsil Edilen Tutar (TL)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tahsilat Tarihi</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">İşlem Açıklaması</label>
                    <input
                      type="text"
                      placeholder="Örn: Banka havalesi ile tahsilat"
                      value={txDesc}
                      onChange={(e) => setTxDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    className="px-3 py-1.5 bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddManualTransactionSubmit('payment')}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    Tahsilat Kaydet
                  </button>
                </div>
              </div>
            )}

            {/* Editing Transaction Modal / Panel */}
            {editingTransaction && (
              <div className="p-5 bg-[#111625] border-b border-indigo-950/50 space-y-3 animate-fade-in" id="edit-transaction-panel">
                <div className="font-bold text-indigo-400 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Cari Hesap Hareketi Düzenle</span>
                  <button type="button" onClick={() => setEditingTransaction(null)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">İşlem Tipi</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      <option value="invoice">Hizmet Faturası (Borç)</option>
                      <option value="debt_addition">Borç İlavesi / Girişi</option>
                      <option value="payment">Tahsilat Alındı (Ödeme)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tutar (TL)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">İşlem Tarihi</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">İşlem Açıklaması</label>
                    <input
                      type="text"
                      placeholder="Açıklama girin"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingTransaction(null)}
                    className="px-3 py-1.5 bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditedTransactionSubmit}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmId && (
              <div className="p-5 bg-[#1c1214] border-b border-rose-950/50 space-y-3 animate-fade-in" id="delete-confirmation-panel">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  <span>Cari Hareketi Silme Onayı</span>
                </div>
                <p className="text-xs text-neutral-300">
                  Bu cari hesap hareketini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem bakiye hesaplamalarını etkileyecektir.
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
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    Evet, Sil
                  </button>
                </div>
              </div>
            )}

            {/* Master Transactions Table (Defter Hareketleri) */}
            <div className="overflow-x-auto text-neutral-200" id="cari-transactions-wrapper">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0e0e12] border-b border-neutral-800">
                    <th className="px-6 py-3.5 text-xs font-bold text-neutral-400 uppercase tracking-wider">Tarih</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-neutral-400 uppercase tracking-wider">İşlem Tipi</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-neutral-400 uppercase tracking-wider">Açıklama</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-rose-400 uppercase tracking-wider text-right">Borç / Fatura (₺)</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-emerald-400 uppercase tracking-wider text-right">Alacak / Tahsilat (₺)</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-indigo-400 uppercase tracking-wider text-right">Yürüyen Bakiye (₺)</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-neutral-400 uppercase tracking-wider text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-xs">
                  {displayTransactions.length > 0 ? (
                    displayTransactions.map((t) => {
                      const invoice = t.type === 'invoice' 
                        ? invoices.find(inv => inv.firmId === selectedFirmId && inv.totalAmount === t.amount && inv.date === t.date)
                        : null;

                      const isDebit = t.type === 'invoice' || t.type === 'debt_addition';

                      return (
                        <tr key={t.id} className="hover:bg-neutral-900/60 transition-colors">
                          <td className="px-6 py-3.5 font-mono font-semibold text-neutral-300">{t.date}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider border ${
                              t.type === 'invoice'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                : t.type === 'debt_addition'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {t.type === 'invoice' ? 'Fatura' : t.type === 'debt_addition' ? 'Borç Girişi' : 'Tahsilat'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-neutral-200">{t.description}</td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-400">
                            {isDebit ? formatLira(t.amount) : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">
                            {!isDebit ? formatLira(t.amount) : '-'}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-mono font-black ${
                            t.runningBalance > 0 ? 'text-rose-400' : t.runningBalance < 0 ? 'text-emerald-400' : 'text-neutral-400'
                          }`}>
                            {formatLira(t.runningBalance)}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {invoice && invoice.status === 'approved' ? (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPaid(invoice)}
                                  className="inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer shrink-0"
                                  title="Faturayı Ödenmiş Olarak İşaretle"
                                >
                                  Ödendi Yap
                                </button>
                              ) : invoice && invoice.status === 'paid' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold shrink-0">
                                  <Check className="h-3.5 w-3.5" />
                                  Ödendi
                                </span>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTransaction(t);
                                  setEditAmount(t.amount.toString());
                                  setEditDate(t.date);
                                  setEditDesc(t.description);
                                  setEditType(t.type);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="İşlemi Düzenle"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteTransactionClick(t.id)}
                                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="İşlemi Sil"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 text-xs">
                        Seçili tarih aralığında kaydedilmiş defter hareketi bulunmamaktadır.
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot className="border-t-2 border-neutral-800 bg-[#08080a] text-xs font-semibold text-neutral-300">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-neutral-400 font-bold">Seçili Dönem Toplamları:</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">+{formatLira(filteredInvoicedSum)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">-{formatLira(filteredCollectedSum)}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-indigo-300">
                      {formatLira(filteredInvoicedSum - filteredCollectedSum)}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="border-t border-neutral-800/80 bg-[#111116]">
                    <td colSpan={3} className="px-6 py-3.5 text-white font-bold text-sm">GÜNCEL NET CARİ BAKİYE (GENEL):</td>
                    <td colSpan={3} className={`px-4 py-3.5 text-right font-mono text-base font-black ${
                      selectedFirmWithBalances.balance > 0 
                        ? 'text-rose-400' 
                        : selectedFirmWithBalances.balance < 0 
                          ? 'text-emerald-400' 
                          : 'text-neutral-400'
                    }`}>
                      {selectedFirmWithBalances.balance === 0 
                        ? '0.00 ₺ (DENGEDE)' 
                        : formatLira(Math.abs(selectedFirmWithBalances.balance))
                      }
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        selectedFirmWithBalances.balance === 0
                          ? 'bg-neutral-800 text-neutral-400'
                          : selectedFirmWithBalances.balance > 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {selectedFirmWithBalances.balance === 0 ? 'DENGEDE' : selectedFirmWithBalances.balance > 0 ? 'FİRMA BORÇLU' : 'ALACAKLI'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        ) : (
          <div className="bg-[#0a0a0a] p-16 rounded-2xl border border-neutral-800 shadow-xs flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-neutral-500 mb-3" />
            <p className="text-white font-semibold">Cari Hesap Seçilmedi</p>
            <p className="text-xs text-neutral-500 mt-1">İncelemek istediğiniz cari hesabı yukarıdaki arama kutusunu kullanarak seçebilirsiniz.</p>
          </div>
        )}
      </div>

      {/* Ekstre İndirme Tarih Aralığı Soru Popup Modal */}
      {showEkstreModal && selectedFirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0f0f12] border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cari Ekstre İndir & Yazdır</h3>
                  <p className="text-xs text-neutral-400">{selectedFirm.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEkstreModal(false)}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Prompt Question */}
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs space-y-1">
              <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Ekstre için Tarih Aralığı Seçilsin mi?
              </div>
              <p className="text-neutral-300 leading-relaxed">
                Ekstrenizde belirli bir tarih aralığı filtrelemek istiyorsanız tarihleri belirleyebilirsiniz. Tarih sınırı koymazsanız tüm geçmiş bilgiler yazdırılır.
              </p>
            </div>

            {/* Filter Mode Selector Options */}
            <div className="space-y-2.5">
              <label 
                onClick={() => setEkstreFilterMode('all')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  ekstreFilterMode === 'all'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white'
                    : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <input
                  type="radio"
                  name="ekstreMode"
                  checked={ekstreFilterMode === 'all'}
                  onChange={() => setEkstreFilterMode('all')}
                  className="mt-1 accent-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">1. Tüm Zamanlar / Tüm Bilgiler (Tarih Sınırı Yok)</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Firmaya ait bugüne kadarki tüm defter hareketleri eksiksiz basılır.</div>
                </div>
              </label>

              <label 
                onClick={() => setEkstreFilterMode('12months')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  ekstreFilterMode === '12months'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white'
                    : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <input
                  type="radio"
                  name="ekstreMode"
                  checked={ekstreFilterMode === '12months'}
                  onChange={() => setEkstreFilterMode('12months')}
                  className="mt-1 accent-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">2. Son 12 Aylık Görünüm</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Son 1 yıla ait faturalar ve tahsilat hareketleri listelenir.</div>
                </div>
              </label>

              <label 
                onClick={() => setEkstreFilterMode('custom')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  ekstreFilterMode === 'custom'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white'
                    : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <input
                  type="radio"
                  name="ekstreMode"
                  checked={ekstreFilterMode === 'custom'}
                  onChange={() => setEkstreFilterMode('custom')}
                  className="mt-1 accent-indigo-500"
                />
                <div className="w-full">
                  <div className="text-xs font-bold text-white">3. Özel Tarih Aralığı Belirle</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5 mb-2">Başlangıç ve bitiş tarihini aşağıdan seçin.</div>
                  
                  {ekstreFilterMode === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-800" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 mb-1">Başlangıç Tarihi</label>
                        <input
                          type="date"
                          value={ekstreStartDate}
                          onChange={(e) => setEkstreStartDate(e.target.value)}
                          className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 mb-1">Bitiş Tarihi</label>
                        <input
                          type="date"
                          value={ekstreEndDate}
                          onChange={(e) => setEkstreEndDate(e.target.value)}
                          className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowEkstreModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Vazgeç
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    executeExcelExport(ekstreFilterMode, ekstreStartDate, ekstreEndDate);
                    setShowEkstreModal(false);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Excel İndir
                </button>

                <button
                  type="button"
                  onClick={() => {
                    executePDFExport(ekstreFilterMode, ekstreStartDate, ekstreEndDate);
                    setShowEkstreModal(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/40"
                >
                  <FileText className="h-3.5 w-3.5" />
                  PDF Ekstre İndir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
