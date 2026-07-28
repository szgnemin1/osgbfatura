import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  TrendingDown, 
  ArrowUpRight,
  ShieldCheck,
  CalendarDays
} from 'lucide-react';
import { Invoice, Transaction, Expense, Firm } from '../types';
import { formatLira } from '../initialData';

interface DashboardViewProps {
  firms: Firm[];
  invoices: Invoice[];
  transactions: Transaction[];
  expenses: Expense[];
}

export default function DashboardView({ firms, invoices, transactions, expenses }: DashboardViewProps) {
  // Current local time simulation (Assume year 2026 as per local time info: 2026-07)
  const currentYear = 2026;
  const currentMonthNum = 7; // July

  // Helper to filter dates for the current month (July 2026)
  const isCurrentMonth = (dateStr: string) => {
    return dateStr.startsWith('2026-07');
  };

  // 1. Calculations for Summary Cards
  // Total Revenue (Toplam Ciro) = Sum of all transactions of type 'invoice'
  const totalCiro = transactions
    .filter(tx => tx.type === 'invoice')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Invoices issued this month (July 2026)
  const currentMonthIssued = transactions
    .filter(tx => tx.type === 'invoice' && isCurrentMonth(tx.date))
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Collected this month (July 2026) - sum of payments in July
  const currentMonthCollected = transactions
    .filter(tx => tx.type === 'payment' && isCurrentMonth(tx.date))
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Total outstanding debt across all firms (Genel yapılması gereken tahsilat / tüm borç tutarı)
  const totalOutstandingDebt = React.useMemo(() => {
    return firms.reduce((sum, f) => {
      const firmTxs = transactions.filter(t => t.firmId === f.id);
      const totalInvoiced = firmTxs
        .filter(t => t.type === 'invoice' || t.type === 'debt_addition')
        .reduce((s, t) => s + t.amount, 0);
      const totalCollected = firmTxs
        .filter(t => t.type === 'payment')
        .reduce((s, t) => s + t.amount, 0);
      const bal = totalInvoiced - totalCollected;
      return bal > 0 ? sum + Math.round(bal * 100) / 100 : sum;
    }, 0);
  }, [firms, transactions]);

  // Current Month Expenses (Aylık Gider tutarı)
  const currentMonthExpenses = expenses
    .filter(exp => isCurrentMonth(exp.date))
    .reduce((sum, exp) => sum + exp.amount, 0);

  // 2. Financial Health (Kesilen fatura ve tahsilat oranı)
  // This calculates the collection rate. If nothing is issued this month, use the global ratio.
  const totalCollectedAllTime = transactions
    .filter(tx => tx.type === 'payment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const collectionRate = currentMonthIssued > 0 
    ? (currentMonthCollected / currentMonthIssued) * 100 
    : totalCiro > 0 
      ? (totalCollectedAllTime / totalCiro) * 100 
      : 0;

  const roundedCollectionRate = Math.min(100, Math.round(collectionRate * 10) / 10 || 0);

  // 3. Last 6 Months Chart Data
  // We need to group invoice amounts and collection amounts for each of the last 6 months:
  // Jan, Feb, Mar, Apr, May, Jun 2026
  const monthsList = [
    { name: 'Ocak', key: '2026-01' },
    { name: 'Şubat', key: '2026-02' },
    { name: 'Mart', key: '2026-03' },
    { name: 'Nisan', key: '2026-04' },
    { name: 'Mayıs', key: '2026-05' },
    { name: 'Haziran', key: '2026-06' }
  ];

  const chartData = monthsList.map(m => {
    // Invoices issued in this month
    const issuedSum = transactions
      .filter(tx => tx.type === 'invoice' && tx.date.startsWith(m.key))
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Payments collected in this month
    const collectedSum = transactions
      .filter(tx => tx.type === 'payment' && tx.date.startsWith(m.key))
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      name: m.name,
      'Kesilen Fatura': Math.round(issuedSum),
      'Tahsil Edilen': Math.round(collectedSum)
    };
  });

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Upper Welcome Header */}
      <div className="flex justify-between items-center bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Finansal Özet Paneli</h1>
          <p className="text-sm text-neutral-400 mt-1">Sistem genelindeki fatura, tahsilat, cari denge ve gider analizleri.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#151515] px-4 py-2 rounded-xl border border-neutral-800 text-sm text-neutral-300 font-medium">
          <CalendarDays className="h-4 w-4 text-neutral-500" />
          <span>Mevcut Dönem: Temmuz 2026</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" id="stats-grid">
        {/* Toplam Ciro */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between" id="stat-card-total-ciro">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Toplam Ciro</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight">{formatLira(totalCiro)}</h3>
            <p className="text-xs text-neutral-500 mt-1">Kuruluştan itibaren toplam hacim</p>
          </div>
        </div>

        {/* Bu Ay Kesilen Fatura */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between" id="stat-card-issued">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Ay İçi Kesilen Fatura</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight">{formatLira(currentMonthIssued)}</h3>
            <p className="text-xs text-amber-400 font-medium flex items-center gap-1 mt-1">
              Temmuz 2026 fatura üretimi
            </p>
          </div>
        </div>

        {/* Bu Ay Tahsil Edilen */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between" id="stat-card-collected">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Bu Ay Tahsil Edilen</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-emerald-400 tracking-tight">{formatLira(currentMonthCollected)}</h3>
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Giren sıcak nakit akışı
            </p>
          </div>
        </div>

        {/* Yapılması Gereken Tahsilat */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between" id="stat-card-pending">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Yapılması Gereken Tahsilat (Tüm Borç)</span>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-amber-500 tracking-tight">{formatLira(totalOutstandingDebt)}</h3>
            <p className="text-xs text-rose-400 font-medium mt-1">
              Tüm borçlulardan beklenen genel bakiye
            </p>
          </div>
        </div>

        {/* Aylık Gider */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between" id="stat-card-expense">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aylık Gider</span>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight">{formatLira(currentMonthExpenses)}</h3>
            <p className="text-xs text-neutral-500 mt-1">Temmuz ayı gerçekleşen giderler</p>
          </div>
        </div>
      </div>

      {/* Chart and Financial Health Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-graphics">
        {/* Recharts Bar Chart */}
        <div className="bg-[#111111] p-6 rounded-2xl border border-neutral-800 shadow-xs lg:col-span-2" id="chart-container">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Fatura & Tahsilat Karşılaştırması</h2>
              <p className="text-xs text-neutral-400">Son 6 aya ait fatura kesim ve tahsilat hacimleri</p>
            </div>
          </div>
          <div className="h-80 w-full" id="recharts-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#737373', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#737373', fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => [formatLira(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#161616', borderRadius: '12px', border: '1px solid #262626', color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="Kesilen Fatura" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Tahsil Edilen" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Health Widget */}
        <div className="bg-[#111111] p-6 rounded-2xl border border-neutral-800 shadow-xs flex flex-col justify-between" id="financial-health-card">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white tracking-tight">Finansal Sağlık İndeksi</h2>
            </div>
            <p className="text-xs text-neutral-400">Kesilen faturaların tahsilatına dönüşme oranı (Bu Aylık)</p>
          </div>

          <div className="my-6 flex flex-col items-center justify-center relative" id="health-percentage-indicator">
            {/* Visual Gauge */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* SVG circular track */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#1f1f1f"
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke={roundedCollectionRate >= 80 ? "#10b981" : roundedCollectionRate >= 50 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * roundedCollectionRate) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              {/* Inner Text */}
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold text-white tracking-tight">%{roundedCollectionRate}</span>
                <p className="text-[10px] text-neutral-500 font-semibold uppercase mt-1">Tahsilat Skoru</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] p-4 rounded-xl border border-neutral-800 text-xs text-neutral-400 space-y-2" id="health-description">
            <div className="flex justify-between">
              <span>Bu Ay Üretilen Fatura:</span>
              <span className="font-semibold text-white">{formatLira(currentMonthIssued)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bu Ay Tahsilat Girişi:</span>
              <span className="font-semibold text-white">{formatLira(currentMonthCollected)}</span>
            </div>
            <div className="border-t border-neutral-800 my-1 pt-1 flex justify-between font-medium">
              <span>Değerlendirme:</span>
              <span className={roundedCollectionRate >= 85 ? "text-emerald-400" : roundedCollectionRate >= 60 ? "text-amber-400" : "text-rose-400"}>
                {roundedCollectionRate >= 85 ? 'Mükemmel Nakit Akışı' : roundedCollectionRate >= 60 ? 'Orta Düzey Nakit Akışı' : 'Tahsilat Takibi Gerekli!'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
