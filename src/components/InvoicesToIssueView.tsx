import React, { useState } from 'react';
import { Copy, Check, ShieldAlert, FileCheck, CheckSquare, Square, Clipboard, HelpCircle, Trash2 } from 'lucide-react';
import { Invoice, SystemSettings } from '../types';
import { formatLira } from '../initialData';

interface InvoicesToIssueViewProps {
  pendingInvoices: Invoice[];
  settings: SystemSettings;
  getFirmBalance: (firmId: string) => number; // To check outstanding debt
  onApproveInvoice: (id: string) => void;
  onRemoveInvoice: (id: string) => void;
}

export default function InvoicesToIssueView({
  pendingInvoices,
  settings,
  getFirmBalance,
  onApproveInvoice,
  onRemoveInvoice
}: InvoicesToIssueViewProps) {
  // Checkbox state map to enable Approve button
  const [approvedChecked, setApprovedChecked] = useState<Record<string, boolean>>({});
  
  // Track copied state for visual feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to format date to GG.AA.YYYY
  const getFormattedCurrentDate = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Helper to get period (e.g. Temmuz 2026)
  const getInvoicePeriod = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const TURKISH_MONTHS = [
          'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
          'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        if (monthIndex >= 0 && monthIndex < 12) {
          return `${TURKISH_MONTHS[monthIndex]} ${year}`;
        }
      }
    } catch (e) {
      // fallback
    }
    return 'Temmuz 2026';
  };

  // Helper to copy text to clipboard
  const handleCopyToClipboard = (text: string, elementId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(elementId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Custom function to calculate Net and VAT for a portion of the fee
  const calculateNetAndVatPortion = (amount: number, isVatIncluded: boolean, rate: number) => {
    if (isVatIncluded) {
      const net = amount / (1 + rate / 100);
      const vat = amount - net;
      return {
        net: Math.round(net * 100) / 100,
        vat: Math.round(vat * 100) / 100,
        total: amount
      };
    } else {
      const vat = amount * (rate / 100);
      return {
        net: amount,
        vat: Math.round(vat * 100) / 100,
        total: Math.round((amount + vat) * 100) / 100
      };
    }
  };

  const handleToggleCheck = (id: string) => {
    setApprovedChecked(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-6" id="to-issue-container">
      {/* Upper Info */}
      <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-xs flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Onay Sırasındaki Faturalar</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Resmi portala girmek üzere ayrıştırılmış faturalar. Uzman/Hekim oranları: <span className="font-semibold text-indigo-400">%{settings.uzmanPercentage} / %{settings.hekimPercentage}</span>, Varsayılan KDV oranı: <span className="font-semibold text-indigo-400">%{settings.kdvRate}</span>
          </p>
        </div>
      </div>

      {/* Main Invoices Queue - Flat rows without nested cards */}
      <div className="bg-[#111111] rounded-2xl border border-neutral-800 shadow-xs overflow-hidden" id="pending-queue-list">
        {pendingInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950/30 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  <th className="py-2.5 px-4 min-w-[140px]">Firma & Dönem</th>
                  <th className="py-2.5 px-3 min-w-[115px]">Uzman Matrahı</th>
                  <th className="py-2.5 px-3 min-w-[115px]">Hekim Matrahı</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Sağlık Matrahı</th>
                  <th className="py-2.5 px-3 min-w-[105px] text-right">Fatura Toplamı</th>
                  <th className="py-2.5 px-4 min-w-[155px] text-right">Durum & Onay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {pendingInvoices.map((inv) => {
                  const currentDebt = getFirmBalance(inv.firmId);
                  const isDebtor = currentDebt > 0;
                  const period = getInvoicePeriod(inv.date);

                  const vExpert = settings.vatRateExpert !== undefined ? settings.vatRateExpert : settings.kdvRate;
                  const vDoctor = settings.vatRateDoctor !== undefined ? settings.vatRateDoctor : settings.kdvRate;
                  const vHealth = settings.vatRateHealth !== undefined ? settings.vatRateHealth : settings.kdvRate;

                  // Split fees
                  let uzmanNet = inv.specialistFee !== undefined ? inv.specialistFee : 0;
                  let hekimNet = inv.doctorFee !== undefined ? inv.doctorFee : 0;

                  if (inv.specialistFee === undefined || inv.doctorFee === undefined) {
                    const rawUzmanFee = inv.baseAmount * (settings.uzmanPercentage / 100);
                    const rawHekimFee = inv.baseAmount * (settings.hekimPercentage / 100);
                    const uzmanCalc = calculateNetAndVatPortion(rawUzmanFee, inv.isVatIncluded, vExpert);
                    const hekimCalc = calculateNetAndVatPortion(rawHekimFee, inv.isVatIncluded, vDoctor);
                    uzmanNet = uzmanCalc.net;
                    hekimNet = hekimCalc.net;
                  }

                  const rawSaglikFee = inv.healthAmount;
                  const saglikCalc = calculateNetAndVatPortion(rawSaglikFee, inv.isVatIncluded, vHealth);
                  const saglikNet = saglikCalc.net;

                  // KDV and Total computations
                  const uzmanVat = Math.round((uzmanNet * (vExpert / 100)) * 100) / 100;
                  const uzmanTotal = Math.round((uzmanNet + uzmanVat) * 100) / 100;

                  const hekimVat = Math.round((hekimNet * (vDoctor / 100)) * 100) / 100;
                  const hekimTotal = Math.round((hekimNet + hekimVat) * 100) / 100;

                  const saglikVat = Math.round((saglikNet * (vHealth / 100)) * 100) / 100;
                  const saglikTotal = Math.round((saglikNet + saglikVat) * 100) / 100;

                  const totalInvoiceSum = inv.totalAmount !== undefined ? inv.totalAmount : (uzmanTotal + hekimTotal + saglikTotal);

                  return (
                    <tr key={inv.id} className="hover:bg-neutral-900/10 transition-colors">
                      {/* Company Name & Period */}
                      <td className="py-2 px-4">
                        <div className="font-bold text-white text-xs truncate max-w-[200px]" title={inv.firmName}>{inv.firmName}</div>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[9px] font-semibold text-neutral-450">
                          <span className={`px-1 py-0.2 text-[8px] font-black rounded uppercase border ${
                            inv.invoiceType === 'efatura'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {inv.invoiceType === 'efatura' ? 'e-Fat' : 'e-Arş'}
                          </span>
                          <span className="text-neutral-500">({inv.employeeCount} Kş)</span>
                          <span className="text-neutral-600 font-normal">•</span>
                          <span className="text-neutral-400 font-medium">{period}</span>
                        </div>
                      </td>

                      {/* Specialist split matrah & copy */}
                      <td className="py-2 px-3">
                        <div className="text-xs font-semibold text-neutral-250">
                          {uzmanNet.toFixed(2)} ₺
                        </div>
                        <div className="text-[9px] text-neutral-500 font-medium">
                          KDV (%{vExpert}): {uzmanVat.toFixed(2)} ₺
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => handleCopyToClipboard(uzmanNet.toFixed(2), `${inv.id}-uzman-net`)}
                            className={`px-1 py-0.2 text-[8px] font-bold rounded border transition-all cursor-pointer ${
                              copiedId === `${inv.id}-uzman-net`
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-extrabold'
                                : 'bg-neutral-950/60 text-neutral-400 border-neutral-850 hover:text-white hover:bg-neutral-900'
                            }`}
                          >
                            {copiedId === `${inv.id}-uzman-net` ? 'Kop' : 'Matrah'}
                          </button>
                          <button
                            onClick={() => handleCopyToClipboard(`İş Güvenliği Uzmanlığı Hizmet Bedeli`, `${inv.id}-uzman-text`)}
                            className={`px-1 py-0.2 text-[8px] font-bold rounded border transition-all cursor-pointer ${
                              copiedId === `${inv.id}-uzman-text`
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-extrabold'
                                : 'bg-neutral-950/60 text-neutral-400 border-neutral-850 hover:text-white hover:bg-neutral-900'
                            }`}
                          >
                            {copiedId === `${inv.id}-uzman-text` ? 'Kop' : 'Metin'}
                          </button>
                        </div>
                      </td>

                      {/* Doctor split matrah & copy */}
                      <td className="py-2 px-3">
                        <div className="text-xs font-semibold text-neutral-250">
                          {hekimNet.toFixed(2)} ₺
                        </div>
                        <div className="text-[9px] text-neutral-500 font-medium">
                          KDV (%{vDoctor}): {hekimVat.toFixed(2)} ₺
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => handleCopyToClipboard(hekimNet.toFixed(2), `${inv.id}-hekim-net`)}
                            className={`px-1 py-0.2 text-[8px] font-bold rounded border transition-all cursor-pointer ${
                              copiedId === `${inv.id}-hekim-net`
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-extrabold'
                                : 'bg-neutral-950/60 text-neutral-400 border-neutral-850 hover:text-white hover:bg-neutral-900'
                            }`}
                          >
                            {copiedId === `${inv.id}-hekim-net` ? 'Kop' : 'Matrah'}
                          </button>
                          <button
                            onClick={() => handleCopyToClipboard(`İşyeri Hekimliği Hizmet Bedeli`, `${inv.id}-hekim-text`)}
                            className={`px-1 py-0.2 text-[8px] font-bold rounded border transition-all cursor-pointer ${
                              copiedId === `${inv.id}-hekim-text`
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-extrabold'
                                : 'bg-neutral-950/60 text-neutral-400 border-neutral-850 hover:text-white hover:bg-neutral-900'
                            }`}
                          >
                            {copiedId === `${inv.id}-hekim-text` ? 'Kop' : 'Metin'}
                          </button>
                        </div>
                      </td>

                      {/* Extra health matrah & copy */}
                      <td className="py-2 px-3">
                        <div className="text-xs font-semibold text-neutral-250">
                          {saglikNet.toFixed(2)} ₺
                        </div>
                        <div className="text-[9px] text-neutral-500 font-medium">
                          KDV (%{vHealth}): {saglikVat.toFixed(2)} ₺
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => handleCopyToClipboard(saglikNet.toFixed(2), `${inv.id}-saglik-net`)}
                            className={`px-1 py-0.2 text-[8px] font-bold rounded border transition-all cursor-pointer ${
                              copiedId === `${inv.id}-saglik-net`
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-extrabold'
                                : 'bg-neutral-950/60 text-neutral-400 border-neutral-850 hover:text-white hover:bg-neutral-900'
                            }`}
                            disabled={rawSaglikFee === 0}
                          >
                            {copiedId === `${inv.id}-saglik-net` ? 'Kop' : 'Matrah'}
                          </button>
                          <button
                            onClick={() => handleCopyToClipboard(`Ekstra Sağlık Gideri Bedeli`, `${inv.id}-saglik-text`)}
                            className={`px-1 py-0.2 text-[8px] font-bold rounded border transition-all cursor-pointer ${
                              copiedId === `${inv.id}-saglik-text`
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-extrabold'
                                : 'bg-neutral-950/60 text-neutral-400 border-neutral-850 hover:text-white hover:bg-neutral-900'
                            }`}
                            disabled={rawSaglikFee === 0}
                          >
                            {copiedId === `${inv.id}-saglik-text` ? 'Kop' : 'Metin'}
                          </button>
                        </div>
                      </td>

                      {/* Total calculated amount */}
                      <td className="py-2 px-3 text-right">
                        <div className="text-xs font-extrabold text-white">
                          {formatLira(totalInvoiceSum)}
                        </div>
                        <div className="text-[9px] text-neutral-500 font-bold">
                          {inv.isVatIncluded ? 'KDV Dahil' : 'KDV Hariç'}
                        </div>
                        
                        <div className="flex justify-end gap-1 mt-1">
                          <button
                            onClick={() => handleCopyToClipboard(totalInvoiceSum.toFixed(2), `${inv.id}-total`)}
                            className={`px-1 py-0.2 text-[8px] font-bold rounded border transition-all cursor-pointer ${
                              copiedId === `${inv.id}-total`
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-extrabold'
                                : 'bg-neutral-950/60 text-neutral-400 border-neutral-850 hover:text-white hover:bg-neutral-900'
                            }`}
                          >
                            {copiedId === `${inv.id}-total` ? 'Kop' : 'Genel Toplam'}
                          </button>
                        </div>
                      </td>

                      {/* Approvals & Actions */}
                      <td className="py-2 pl-2 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isDebtor && (
                            <button
                              onClick={() => {
                                const dateStr = getFormattedCurrentDate();
                                const debtString = `${dateStr} Tarihi ile Toplam Borç: ${currentDebt} TL`;
                                handleCopyToClipboard(debtString, `${inv.id}-debt`);
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                copiedId === `${inv.id}-debt`
                                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 shadow-md shadow-emerald-500/30 scale-105'
                                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                              }`}
                              title="Borç Bilgisini Kopyala"
                            >
                              {copiedId === `${inv.id}-debt` ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-300 animate-bounce" />
                                  <span className="text-[10px] font-extrabold text-emerald-300">Borç Kopyalandı!</span>
                                </>
                              ) : (
                                <>
                                  <Clipboard className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline text-[9px] font-semibold">Borç</span>
                                </>
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm('Faturayı listeden silmek istediğinize emin misiniz?')) {
                                onRemoveInvoice(inv.id);
                              }
                            }}
                            className="p-1.5 bg-neutral-950 hover:bg-rose-950/35 border border-neutral-800 hover:border-rose-900 text-neutral-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                            title="Kuyruktan Çıkar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => onApproveInvoice(inv.id)}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-555 border border-emerald-500 text-white px-2 py-1 rounded-lg text-[11px] font-bold transition-all shadow-sm shadow-emerald-650/15 cursor-pointer"
                            title="Kesildi Olarak Onayla"
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                            Onayla
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Check className="h-12 w-12 text-emerald-400 bg-emerald-500/10 p-2.5 rounded-full mb-3 border border-emerald-500/20" />
            <p className="text-white font-semibold text-sm">Onay Bekleyen Fatura Yok</p>
            <p className="text-xs text-neutral-500 mt-1">
              "Fatura Hazırlık" sayfasından fatura hazırlayıp buraya gönderebilirsiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
