import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, Check, Download, AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
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

  // Compute stats for all firms (useful for global export and list display)
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

  // Selected firm transactions
  const selectedFirmTransactions = useMemo(() => {
    return transactions
      .filter(t => t.firmId === selectedFirmId)
      .sort((a, b) => b.date.localeCompare(a.date)); // descending dates
  }, [transactions, selectedFirmId]);

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

  // EXPORT 1: Selected Firm Ledger (Cari Hesap Defteri)
  const handleExportSelectedLedger = () => {
    if (!selectedFirm || !selectedFirmWithBalances) return;

    const headers = ['Tarih', 'İşlem Tipi', 'Açıklama', 'Tutar (TL)'];
    
    const data = selectedFirmTransactions.map(t => {
      let typeLabel = '';
      if (t.type === 'invoice') typeLabel = 'Fatura Kesildi';
      else if (t.type === 'debt_addition') typeLabel = 'Borç Girişi';
      else if (t.type === 'payment') typeLabel = 'Tahsilat Alındı';

      return [
        t.date,
        typeLabel,
        t.description,
        t.amount.toFixed(2)
      ];
    });

    // Add summary row
    data.push([]);
    data.push(['Toplam Kesilen Faturalar / Borçlar', '', '', selectedFirmWithBalances.totalInvoiced.toFixed(2)]);
    data.push(['Toplam Yapılan Tahsilatlar', '', '', selectedFirmWithBalances.totalCollected.toFixed(2)]);
    data.push(['Güncel Cari Bakiye', '', '', selectedFirmWithBalances.balance.toFixed(2)]);

    downloadExcel(data, `${selectedFirm.name}_Cari_Ekstre`, headers);
  };

  // EXPORT 1.5: Selected Firm Ledger PDF
  const handleExportSelectedLedgerPDF = () => {
    if (!selectedFirm || !selectedFirmWithBalances) return;

    // Create a new jsPDF instance (portrait A4)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const clean = (str: string) => toAsciiFriendly(str);

    // 1. Premium Header Banner (Slate-900 / Navy Slate style)
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 26, 'F');

    // Title inside the header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(clean('FCTS | CARI HESAP EKSTRESI'), 14, 16);

    // Subtitle / Brand in the header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(clean('FINANSAL CARI TAKIP SISTEMI'), 196, 16, { align: 'right' });

    // 2. Firm & Document Details in beautifully styled columns (Y=35)
    // Left Column: Client metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(clean('CARI BILGILERI'), 14, 36);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Firma Unvani:', 14, 42);
    doc.text('Vergi Numarasi:', 14, 47);
    doc.text('Adres:', 14, 52);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(clean(selectedFirm.name), 40, 42);
    doc.text(clean(selectedFirm.taxNumber || 'Kayit Yok'), 40, 47);
    
    // Address wrapping for long lines
    const splitAddress = doc.splitTextToSize(clean(selectedFirm.address || 'Kayit Yok'), 80);
    doc.text(splitAddress, 40, 52);

    // Right Column: Statement Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(clean('EKSTRE DETAYLARI'), 130, 36);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Rapor Tarihi:', 130, 42);
    doc.text('Fatura Tipi:', 130, 47);
    doc.text('Cari Durumu:', 130, 52);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(new Date().toLocaleDateString('tr-TR'), 156, 42);
    doc.text(clean(selectedFirm.invoiceType === 'efatura' ? 'e-Fatura' : 'e-Arsiv'), 156, 47);
    
    const curBal = selectedFirmWithBalances.balance;
    const curBalText = curBal === 0 ? 'DENGEDE' : (curBal > 0 ? 'BORCLU' : 'ALACAKLI');
    doc.text(curBalText, 156, 52);

    // Header Separator Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, 62, 196, 62);

    // Columns structure
    const tableHeaders = [['Tarih', 'Islem Tipi', 'Aciklama', 'Tutar (TL)']];
    
    // Rows building
    const tableRows = selectedFirmTransactions.map(t => {
      let typeLabel = '';
      if (t.type === 'invoice') typeLabel = 'Fatura';
      else if (t.type === 'debt_addition') typeLabel = 'Borc Girisi';
      else if (t.type === 'payment') typeLabel = 'Tahsilat';

      const prefix = t.type === 'payment' ? '-' : '+';
      return [
        t.date,
        clean(typeLabel),
        clean(t.description),
        `${prefix}${t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
      ];
    });

    // Render structured ledger table
    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: 68,
      theme: 'striped',
      styles: { 
        fontSize: 8.5, 
        font: 'helvetica',
        cellPadding: 4,
        textColor: [51, 65, 85] // slate-700
      },
      headStyles: { 
        fillColor: [15, 23, 42], // slate-900 / premium dark grey
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 26 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 38 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // light slate-50 background for alternating rows
      },
      didParseCell: (data) => {
        // Apply micro-style color-coding to transactions in the table cells
        if (data.section === 'body' && data.column.index === 3) {
          const val = data.cell.text[0] || '';
          if (val.startsWith('-')) {
            data.cell.styles.textColor = [5, 150, 105]; // emerald-600 (green) for payments/collections
          } else if (val.startsWith('+')) {
            data.cell.styles.textColor = [225, 29, 72]; // rose-600 (red) for invoices/debts
          }
        }
      }
    });

    // Calculate dynamic coordinates for totals block, with pagination checks
    let summaryY = (doc as any).lastAutoTable.finalY + 8;
    if (summaryY > 235) {
      doc.addPage();
      summaryY = 20;
    }

    // Outer container rectangle for the summary details (Right aligned elegant card)
    doc.setFillColor(248, 250, 252); // Soft slate gray background
    doc.rect(110, summaryY, 86, 42, 'F');
    doc.setDrawColor(226, 232, 240); // Soft border
    doc.rect(110, summaryY, 86, 42, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // text-slate-500
    doc.text('Toplam Borc / Faturalar:', 114, summaryY + 8);
    doc.text('Toplam Tahsilatlar:', 114, summaryY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // text-slate-900
    doc.text(`+${selectedFirmWithBalances.totalInvoiced.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 192, summaryY + 8, { align: 'right' });
    doc.text(`-${selectedFirmWithBalances.totalCollected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 192, summaryY + 16, { align: 'right' });

    // Inner line separator inside summary box
    doc.setDrawColor(226, 232, 240);
    doc.line(112, summaryY + 22, 194, summaryY + 22);

    // Final Net Balance section with description (debt, credit or balanced)
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
      doc.setTextColor(100, 116, 139); // neutral slate-500
    } else if (bal > 0) {
      balanceText = `${bal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
      statusText = 'FİRMA BORÇLU';
      doc.setTextColor(225, 29, 72); // rose-600
    } else {
      balanceText = `${Math.abs(bal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
      statusText = 'ALACAKLI (FAZLA ÖDEME)';
      doc.setTextColor(5, 150, 105); // emerald-600
    }
    doc.text(balanceText, 192, summaryY + 29, { align: 'right' });

    doc.setFontSize(7.5);
    doc.text(clean(statusText), 192, summaryY + 36, { align: 'right' });

    // Save PDF
    doc.save(`${toAsciiFriendly(selectedFirm.name)}_Cari_Hesap_Ekstresi.pdf`);
  };

  // EXPORT 2: All Firms Balances Report (Tüm Cari Bakiye Raporu)
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
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4 relative">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-base font-bold text-white tracking-tight">Cari Defter ve Hesap Detayları</h2>
          <p className="text-xs text-neutral-400">
            Firma bazlı tüm kesilen faturaları, geçmiş borçları ve tahsilatları inceleyin.
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto shrink-0">
          <button
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
            placeholder="Hızlı Cari Hesap Ara... (Firma adı yazın, örn: Sezgin)"
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
              onClick={() => {
                setSearchTerm('');
                setIsDropdownOpen(false);
              }}
              className="absolute right-4 top-3.5 text-neutral-500 hover:text-neutral-300 transition-colors text-xs font-semibold"
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
                    onClick={() => {
                      setSelectedFirmId(f.id);
                      setSearchTerm(''); // Clear on select so they can see the whole ledger
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-5 py-3.5 hover:bg-neutral-800/40 transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-indigo-600/5 border-l-2 border-indigo-500' : ''
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
                        balance > 0 ? 'text-rose-450' : balance < 0 ? 'text-emerald-400' : 'text-neutral-500'
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

      {/* Main Area: Detailed Account ledger */}
      <div className="space-y-6" id="cari-main-details">
        {selectedFirmWithBalances ? (
          <>
            {/* Upper detailed stats cards */}
            <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-neutral-800">
                <div>
                  <h1 className="text-xl font-bold text-white">{selectedFirmWithBalances.name}</h1>
                  <p className="text-xs text-neutral-400 mt-1">Vergi No / Adres: {selectedFirmWithBalances.taxNumber || 'Kayıt Yok'} • {selectedFirmWithBalances.address || 'Kayıt Yok'}</p>
                </div>
                
                {/* Export single ledger & Addition buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportSelectedLedger}
                    className="flex items-center gap-1 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-neutral-500" />
                    Cari Ekstre Excel
                  </button>
                  
                  <button
                    onClick={handleExportSelectedLedgerPDF}
                    className="flex items-center gap-1 px-3 py-2 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border border-rose-900/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-rose-500" />
                    Cari Ekstre PDF
                  </button>
                  
                  <button
                    onClick={() => {
                      setTxDate('2026-07-07');
                      setShowAddDebt(true);
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-rose-650/10 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Borç Ekle
                  </button>
                  
                  <button
                    onClick={() => {
                      setTxDate('2026-07-07');
                      setShowAddPayment(true);
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tahsilat Ekle
                  </button>
                </div>
              </div>

              {/* Three summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="cari-metrics">
                {/* Toplam Faturalanan */}
                <div className="bg-[#111111] p-4 rounded-xl border border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Toplam Faturalandırılan</span>
                  <h3 className="text-xl font-bold text-white mt-2">{formatLira(selectedFirmWithBalances.totalInvoiced)}</h3>
                </div>

                {/* Toplam Tahsilat */}
                <div className="bg-[#111111] p-4 rounded-xl border border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Toplam Tahsilat (Giriş)</span>
                  <h3 className="text-xl font-bold text-white mt-2">{formatLira(selectedFirmWithBalances.totalCollected)}</h3>
                </div>

                {/* Güncel Bakiye */}
                <div className={`p-4 rounded-xl border ${
                  selectedFirmWithBalances.balance > 0 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-450' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Güncel Cari Bakiye</span>
                  <h3 className="text-xl font-extrabold mt-2">
                    {selectedFirmWithBalances.balance === 0 
                      ? 'Dengelenmiş Bakiye (0.00 TL)' 
                      : selectedFirmWithBalances.balance > 0 
                        ? `${formatLira(selectedFirmWithBalances.balance)} (Firma Borçlu)` 
                        : `${formatLira(Math.abs(selectedFirmWithBalances.balance))} (Fazla Ödeme)`
                    }
                  </h3>
                </div>
              </div>
            </div>

            {/* Manual Forms Overlay/Inlines (Simulating modals elegantly) */}
            {showAddDebt && (
              <div className="bg-[#1a1113] p-5 rounded-2xl border border-rose-950/50 shadow-sm space-y-4 animate-fade-in">
                <div className="font-bold text-rose-400 text-sm">Cari Hesaba El İle Borç/Yükümlülük Girişi</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Borç Tutarı (TL)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Borç Giriş Tarihi</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">İşlem Açıklaması</label>
                    <input
                      type="text"
                      placeholder="Örn: Eski dönem devreden bakiye"
                      value={txDesc}
                      onChange={(e) => setTxDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDebt(false)}
                    className="px-3 py-1.5 bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddManualTransactionSubmit('debt_addition')}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Borç Kaydet
                  </button>
                </div>
              </div>
            )}

            {showAddPayment && (
              <div className="bg-[#0e1713] p-5 rounded-2xl border border-emerald-950/50 shadow-sm space-y-4 animate-fade-in">
                <div className="font-bold text-emerald-400 text-sm">Cari Hesaba Tahsilat Girişi (Ödeme Alındı)</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tahsil Edilen Tutar (TL)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tahsilat Tarihi</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">İşlem Açıklaması</label>
                    <input
                      type="text"
                      placeholder="Örn: Havale ödemesi"
                      value={txDesc}
                      onChange={(e) => setTxDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    className="px-3 py-1.5 bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddManualTransactionSubmit('payment')}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Tahsilat Kaydet
                  </button>
                </div>
              </div>
            )}

            {/* Edit Transaction Modal / inline card */}
            {editingTransaction && (
              <div className="bg-[#111625] p-5 rounded-2xl border border-indigo-950/50 shadow-sm space-y-4 animate-fade-in" id="edit-transaction-panel">
                <div className="font-bold text-indigo-400 text-sm">Cari Hesap Hareketini Düzenle</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">İşlem Tipi</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-hidden focus:border-indigo-500"
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
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">İşlem Tarihi</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">İşlem Açıklaması</label>
                    <input
                      type="text"
                      placeholder="Örn: Ödeme alındı"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
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
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </div>
            )}

            {/* Custom Delete Confirmation Modal / inline card */}
            {deleteConfirmId && (
              <div className="bg-[#1c1214] p-5 rounded-2xl border border-rose-950/50 shadow-sm space-y-4 animate-fade-in" id="delete-confirmation-panel">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <AlertCircle className="h-5 w-5 text-rose-500" />
                  <span>Cari Hareketi Sil</span>
                </div>
                <p className="text-xs text-neutral-300">
                  Bu cari hesap hareketini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
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

            {/* Transactions Ledger Table */}
            <div className="bg-[#111111] rounded-2xl border border-neutral-800 shadow-xs overflow-hidden" id="cari-transactions-wrapper">
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-[#0a0a0a]">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Cari Hesap Ekstresi (Defter Hareketleri)</span>
                <span className="text-[10px] text-neutral-500 font-semibold">{selectedFirmTransactions.length} Hareket Listeleniyor</span>
              </div>
              
              <div className="overflow-x-auto text-neutral-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-950/30 border-b border-neutral-800">
                      <th className="px-6 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Tarih</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">İşlem</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Açıklama</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Tutar</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Eylemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-xs">
                    {selectedFirmTransactions.length > 0 ? (
                      selectedFirmTransactions.map((t) => {
                        // Find matching invoice if this transaction is an invoice, to show "Mark Paid" button
                        // Match invoice from global list
                        const invoice = t.type === 'invoice' 
                          ? invoices.find(inv => inv.firmId === selectedFirmId && inv.totalAmount === t.amount && inv.date === t.date)
                          : null;

                        return (
                          <tr key={t.id} className="hover:bg-[#1a1a1a]/30 transition-colors">
                            <td className="px-6 py-3.5 font-semibold text-neutral-400">{t.date}</td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex px-2 py-0.5 rounded-md font-semibold text-[9px] uppercase tracking-wider border ${
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
                            <td className={`px-4 py-3.5 text-right font-bold ${
                              t.type === 'payment' ? 'text-emerald-400' : 'text-white'
                            }`}>
                              {t.type === 'payment' ? '-' : '+'}{formatLira(t.amount)}
                            </td>
                            <td className="px-6 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {invoice && invoice.status === 'approved' ? (
                                  <button
                                    onClick={() => handleMarkPaid(invoice)}
                                    className="inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shadow-3xs cursor-pointer shrink-0"
                                    title="Faturayı Ödenmiş Olarak İşaretle"
                                  >
                                    Fatura Ödendi
                                  </button>
                                ) : invoice && invoice.status === 'paid' ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold shrink-0">
                                    <Check className="h-3.5 w-3.5" />
                                    Ödendi
                                  </span>
                                ) : null}

                                <button
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
                                  onClick={() => handleDeleteTransactionClick(t.id)}
                                  className="p-1.5 text-neutral-400 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
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
                        <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 text-xs">
                          Cari hesaba ait kayıtlı defter hareketi bulunmamaktadır.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {selectedFirmWithBalances && (
                    <tfoot className="border-t-2 border-neutral-800 bg-neutral-950/40 text-xs font-semibold text-neutral-300">
                      <tr>
                        <td colSpan={3} className="px-6 py-3.5 text-neutral-400">Toplam Kesilen Faturalar / Borçlar:</td>
                        <td className="px-4 py-3.5 text-right font-bold text-white">{formatLira(selectedFirmWithBalances.totalInvoiced)}</td>
                        <td></td>
                      </tr>
                      <tr className="border-t border-neutral-800/60">
                        <td colSpan={3} className="px-6 py-3.5 text-neutral-400">Toplam Yapılan Tahsilatlar:</td>
                        <td className="px-4 py-3.5 text-right font-bold text-emerald-400">-{formatLira(selectedFirmWithBalances.totalCollected)}</td>
                        <td></td>
                      </tr>
                      <tr className="border-t border-neutral-700 bg-neutral-900/40">
                        <td colSpan={3} className="px-6 py-4 text-white font-bold text-sm">Güncel Net Cari Bakiye:</td>
                        <td className={`px-4 py-4 text-right text-sm font-extrabold ${
                          selectedFirmWithBalances.balance > 0 
                            ? 'text-rose-450' 
                            : selectedFirmWithBalances.balance < 0 
                              ? 'text-emerald-400' 
                              : 'text-neutral-400'
                        }`}>
                          {selectedFirmWithBalances.balance === 0 
                            ? '0.00 TL' 
                            : formatLira(Math.abs(selectedFirmWithBalances.balance))
                          }
                        </td>
                        <td className="px-6 py-4 text-center">
                          {selectedFirmWithBalances.balance === 0 ? (
                            <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                              DENGEDE
                            </span>
                          ) : selectedFirmWithBalances.balance > 0 ? (
                            <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              FİRMA BORÇLU
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ALACAKLI (FAZLA ÖDEME)
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-[#0a0a0a] p-16 rounded-2xl border border-neutral-800 shadow-xs flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-neutral-500 mb-3" />
            <p className="text-white font-semibold">Cari Hesap Seçilmedi</p>
            <p className="text-xs text-neutral-500 mt-1">İncelemek istediğiniz cari hesabı yukarıdaki arama kutusunu kullanarak seçebilirsiniz.</p>
          </div>
        )}
      </div>
    </div>
  );
}
