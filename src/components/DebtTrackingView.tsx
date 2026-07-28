import React, { useMemo } from 'react';
import { Calendar, AlertTriangle, ChevronRight, BarChart3, Clock, ArrowDownWideNarrow, ShieldAlert } from 'lucide-react';
import { Firm, Invoice, Transaction } from '../types';
import { formatLira } from '../initialData';

interface DebtTrackingViewProps {
  firms: Firm[];
  invoices: Invoice[];
  transactions: Transaction[];
}

export default function DebtTrackingView({ firms, invoices, transactions }: DebtTrackingViewProps) {
  // Current simulate date (Assume 2026-07-07)
  const currentSimulatedDate = new Date('2026-07-07');

  // Compute aging breakdown for each firm
  const agingAnalysis = useMemo(() => {
    return firms.map(f => {
      // 1. Calculate overall balance (Total Billed - Total Paid)
      const firmTxs = transactions.filter(t => t.firmId === f.id);
      
      const totalInvoiced = firmTxs
        .filter(t => t.type === 'invoice' || t.type === 'debt_addition')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalCollected = firmTxs
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + t.amount, 0);

      const balance = Math.round((totalInvoiced - totalCollected) * 100) / 100;

      // If no debt, skip aging split or return zeroes
      if (balance <= 0) {
        return {
          ...f,
          balance: 0,
          bucket30: 0,
          bucket60: 0,
          bucket90: 0,
          bucket90Plus: 0,
          oldestUnpaidDays: 0
        };
      }

      // 2. Compute aging split based on unpaid invoices
      // Get all approved but unpaid invoices for this firm
      const unpaidInvoices = invoices
        .filter(inv => inv.firmId === f.id && inv.status === 'approved')
        .sort((a, b) => a.date.localeCompare(b.date)); // oldest first

      let remainingDebtToAllocate = balance;
      let bucket30 = 0;
      let bucket60 = 0;
      let bucket90 = 0;
      let bucket90Plus = 0;
      let oldestUnpaidDays = 0;

      if (unpaidInvoices.length > 0) {
        // Calculate age for each unpaid invoice and bucket them
        unpaidInvoices.forEach(inv => {
          if (remainingDebtToAllocate <= 0) return;

          const invDate = new Date(inv.date);
          const timeDiff = currentSimulatedDate.getTime() - invDate.getTime();
          const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));

          // Track the oldest unpaid invoice age
          if (daysDiff > oldestUnpaidDays) {
            oldestUnpaidDays = daysDiff;
          }

          // We allocate the invoice amount to its bucket (up to what is still owed in total balance)
          const allocation = Math.min(remainingDebtToAllocate, inv.totalAmount);
          remainingDebtToAllocate -= allocation;

          if (daysDiff <= 30) {
            bucket30 += allocation;
          } else if (daysDiff <= 60) {
            bucket60 += allocation;
          } else if (daysDiff <= 90) {
            bucket90 += allocation;
          } else {
            bucket90Plus += allocation;
          }
        });
      }

      // If there's still unallocated debt (e.g. from manual debt additions with no associated invoice)
      // put it in the 0-30 days bucket by default
      if (remainingDebtToAllocate > 0) {
        bucket30 += remainingDebtToAllocate;
      }

      return {
        ...f,
        balance,
        bucket30: Math.round(bucket30 * 100) / 100,
        bucket60: Math.round(bucket60 * 100) / 100,
        bucket90: Math.round(bucket90 * 100) / 100,
        bucket90Plus: Math.round(bucket90Plus * 100) / 100,
        oldestUnpaidDays
      };
    })
    .filter(item => item.balance > 0) // Only firms with outstanding debt
    .sort((a, b) => b.balance - a.balance); // Sorted from highest debt to lowest
  }, [firms, invoices, transactions]);

  // Aggregate stats across all buckets
  const bucketTotals = useMemo(() => {
    let t30 = 0;
    let t60 = 0;
    let t90 = 0;
    let t90Plus = 0;

    agingAnalysis.forEach(f => {
      t30 += f.bucket30;
      t60 += f.bucket60;
      t90 += f.bucket90;
      t90Plus += f.bucket90Plus;
    });

    const grandTotal = t30 + t60 + t90 + t90Plus;

    return {
      t30,
      t60,
      t90,
      t90Plus,
      grandTotal
    };
  }, [agingAnalysis]);

  return (
    <div className="space-y-6" id="debt-tracking-container">
      {/* Header */}
      <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-xs flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Borç Yaşlandırma & Takip Analizi</h1>
          <p className="text-xs text-neutral-400 mt-1">Borçlu firmaların gecikme sürelerine göre sınıflandırılmış bakiye dağılımı.</p>
        </div>
      </div>

      {/* Bucket Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" id="aging-buckets">
        {/* Total Owed */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Toplam Alacak</span>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-white">{formatLira(bucketTotals.grandTotal)}</h3>
            <p className="text-[10px] text-neutral-500 mt-1">Geciken faturaların genel toplamı</p>
          </div>
        </div>

        {/* 0-30 Days */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">0 - 30 Gün</span>
            <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold rounded text-[9px]">Vadesi Yeni</span>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-white">{formatLira(bucketTotals.t30)}</h3>
            <p className="text-[10px] text-neutral-500 mt-1">Son 30 gün içinde kesilmiş faturalar</p>
          </div>
        </div>

        {/* 31-60 Days */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">31 - 60 Gün</span>
            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold rounded text-[9px]">Gecikme Başlangıcı</span>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-white">{formatLira(bucketTotals.t60)}</h3>
            <p className="text-[10px] text-neutral-500 mt-1">1-2 ay arası bekleyen alacaklar</p>
          </div>
        </div>

        {/* 61-90 Days */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">61 - 90 Gün</span>
            <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold rounded text-[9px]">Ciddi Gecikme</span>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-white">{formatLira(bucketTotals.t90)}</h3>
            <p className="text-[10px] text-neutral-500 mt-1">2-3 ay arası vadesi geçen alacaklar</p>
          </div>
        </div>

        {/* 90+ Days */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">90+ Gün</span>
            <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold rounded text-[9px] flex items-center gap-0.5">
              <ShieldAlert className="h-3 w-3" />
              Takip Gerekli
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-rose-450">{formatLira(bucketTotals.t90Plus)}</h3>
            <p className="text-[10px] text-rose-500 font-medium mt-1">3 aydan eski, riskli alacaklar</p>
          </div>
        </div>
      </div>

      {/* Main Analysis Rankings Table */}
      <div className="bg-[#111111] rounded-2xl border border-neutral-800 shadow-xs overflow-hidden" id="aging-ranking-table">
        <div className="p-4 border-b border-neutral-800 bg-[#0a0a0a] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <ArrowDownWideNarrow className="h-4 w-4 text-neutral-500" />
            En Yüksek Borçludan Aşağı Doğru Sıralama (Borç Yaşlandırma)
          </span>
          <span className="text-[10px] text-neutral-500 font-semibold">{agingAnalysis.length} Borçlu Cari Bulundu</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950/30 border-b border-neutral-800 text-xs">
                <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-wider">Firma Unvanı</th>
                <th className="px-4 py-4 font-bold text-neutral-500 uppercase tracking-wider text-right">Toplam Borç</th>
                <th className="px-4 py-4 font-bold text-neutral-500 uppercase tracking-wider text-right">0-30 Gün</th>
                <th className="px-4 py-4 font-bold text-neutral-500 uppercase tracking-wider text-right">31-60 Gün</th>
                <th className="px-4 py-4 font-bold text-neutral-500 uppercase tracking-wider text-right">61-90 Gün</th>
                <th className="px-4 py-4 font-bold text-rose-400 uppercase tracking-wider text-right">90+ Gün</th>
                <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-wider text-center">En Eski Borç</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-xs font-medium">
              {agingAnalysis.length > 0 ? (
                agingAnalysis.map((f) => (
                  <tr key={f.id} className="hover:bg-[#1a1a1a]/30 transition-colors">
                    {/* Firm Name */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white text-sm">{f.name}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5 uppercase font-bold">{f.invoiceType}</div>
                    </td>

                    {/* Total Debt */}
                    <td className="px-4 py-4 text-right text-sm font-extrabold text-white">
                      {formatLira(f.balance)}
                    </td>

                    {/* 0-30 */}
                    <td className="px-4 py-4 text-right text-neutral-300">
                      {f.bucket30 > 0 ? formatLira(f.bucket30) : <span className="text-neutral-750">—</span>}
                    </td>

                    {/* 31-60 */}
                    <td className="px-4 py-4 text-right text-neutral-300">
                      {f.bucket60 > 0 ? formatLira(f.bucket60) : <span className="text-neutral-750">—</span>}
                    </td>

                    {/* 61-90 */}
                    <td className="px-4 py-4 text-right text-neutral-300">
                      {f.bucket90 > 0 ? formatLira(f.bucket90) : <span className="text-neutral-750">—</span>}
                    </td>

                    {/* 90+ */}
                    <td className="px-4 py-4 text-right text-rose-400 font-bold">
                      {f.bucket90Plus > 0 ? formatLira(f.bucket90Plus) : <span className="text-neutral-750">—</span>}
                    </td>

                    {/* Oldest Debt In Days */}
                    <td className="px-6 py-4 text-center">
                      {f.oldestUnpaidDays > 0 ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          f.oldestUnpaidDays > 90 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                            : f.oldestUnpaidDays > 30 
                              ? 'bg-amber-500/10 text-amber-450 border-amber-500/20' 
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          <Clock className="h-3 w-3" />
                          {f.oldestUnpaidDays} Gün Önce
                        </span>
                      ) : (
                        <span className="text-neutral-750">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 text-xs font-semibold">
                    Borç bakiyesi olan firma bulunmamaktadır.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
