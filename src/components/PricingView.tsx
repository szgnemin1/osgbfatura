import React, { useState, useMemo } from 'react';
import { Plus, Trash, Check, HelpCircle, Save, Info, Search } from 'lucide-react';
import { Firm, PricingModel, PricingModelType, KademeRange } from '../types';

interface PricingViewProps {
  firms: Firm[];
  onSaveFirm: (firm: Firm) => void;
  onAddFirm: (firm: Firm | string) => void;
  onDeleteFirm?: (firmId: string) => void;
}

export default function PricingView({ firms, onSaveFirm, onAddFirm, onDeleteFirm }: PricingViewProps) {
  const [selectedFirmId, setSelectedFirmId] = useState<string>(firms[0]?.id || '');
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [newFirmName, setNewFirmName] = useState('');
  const [newFirmInvoiceType, setNewFirmInvoiceType] = useState<'efatura' | 'earsiv'>('efatura');
  const [newFirmGroup, setNewFirmGroup] = useState('Genel');
  const [isNewFirmCustomGroup, setIsNewFirmCustomGroup] = useState(false);
  const [newFirmCustomGroupInput, setNewFirmCustomGroupInput] = useState('');
  const [isAddingFirm, setIsAddingFirm] = useState(false);

  // Active form state for selected firm
  const selectedFirm = firms.find(f => f.id === selectedFirmId);

  // Selected config values mapped to local state
  const [name, setName] = useState('');
  const [isVatIncluded, setIsVatIncluded] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'efatura' | 'earsiv'>('efatura');
  const [groupName, setGroupName] = useState('Genel');
  const [isCustomGroup, setIsCustomGroup] = useState(false);
  const [customGroupNameInput, setCustomGroupNameInput] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [modelType, setModelType] = useState<PricingModelType>('standart');
  const [parentFirmId, setParentFirmId] = useState('');
  const [serviceType, setServiceType] = useState<'both' | 'expert_only' | 'doctor_only'>('both');

  // List of all existing groups
  const existingGroups = React.useMemo(() => {
    const grps = new Set<string>();
    firms.forEach(f => {
      if (f.groupName && f.groupName.trim()) grps.add(f.groupName.trim());
    });
    grps.add('Genel');
    return Array.from(grps).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [firms]);

  // Pricing model configs
  const [standartBaseCount, setStandartBaseCount] = useState(10);
  const [standartBaseFee, setStandartBaseFee] = useState(1000);
  const [standartExtra, setStandartExtra] = useState(50);

  const [toleransliBaseCount, setToleransliBaseCount] = useState(10);
  const [toleransliBaseFee, setToleransliBaseFee] = useState(1000);
  const [toleransliExtra, setToleransliExtra] = useState(50);
  const [toleransliTolerance, setToleransliTolerance] = useState(10);

  const [kademeliRanges, setKademeliRanges] = useState<KademeRange[]>([
    { min: 1, max: 10, fee: 1000 }
  ]);

  const [yillikFee, setYillikFee] = useState(12000);

  // Load firm configuration when selection changes
  React.useEffect(() => {
    if (selectedFirm) {
      setName(selectedFirm.name);
      setIsVatIncluded(selectedFirm.isVatIncluded);
      setInvoiceType(selectedFirm.invoiceType);
      setGroupName(selectedFirm.groupName || 'Genel');
      setIsCustomGroup(false);
      setCustomGroupNameInput('');
      setTaxNumber(selectedFirm.taxNumber || '');
      setAddress(selectedFirm.address || '');
      setModelType(selectedFirm.pricingModel.type);
      setParentFirmId(selectedFirm.parentFirmId || '');
      setServiceType(selectedFirm.serviceType || 'both');

      const pm = selectedFirm.pricingModel;
      if (pm.standartConfig) {
        setStandartBaseCount(pm.standartConfig.baseCount);
        setStandartBaseFee(pm.standartConfig.baseFee);
        setStandartExtra(pm.standartConfig.extraPerPerson);
      }
      if (pm.toleransliConfig) {
        setToleransliBaseCount(pm.toleransliConfig.baseCount);
        setToleransliBaseFee(pm.toleransliConfig.baseFee);
        setToleransliExtra(pm.toleransliConfig.extraPerPerson);
        setToleransliTolerance(pm.toleransliConfig.tolerancePercent);
      }
      if (pm.kademeliConfig) {
        setKademeliRanges(pm.kademeliConfig.ranges);
      }
      if (pm.yillikConfig) {
        setYillikFee(pm.yillikConfig.annualFee);
      }
    }
  }, [selectedFirmId, firms]);

  // Handler for adding a new range to the graduated config
  const handleAddKademeRange = () => {
    const lastRange = kademeliRanges[kademeliRanges.length - 1];
    const newMin = lastRange ? lastRange.max + 1 : 1;
    setKademeliRanges([...kademeliRanges, { min: newMin, max: newMin + 19, fee: (lastRange?.fee || 1000) + 500 }]);
  };

  // Handler for deleting a range from graduated config
  const handleRemoveKademeRange = (index: number) => {
    if (kademeliRanges.length > 1) {
      setKademeliRanges(kademeliRanges.filter((_, idx) => idx !== index));
    }
  };

  // Handler for editing range inputs
  const handleUpdateKademeRange = (index: number, key: keyof KademeRange, value: number) => {
    const updated = kademeliRanges.map((range, idx) => {
      if (idx === index) {
        return { ...range, [key]: value };
      }
      return range;
    });
    setKademeliRanges(updated);
  };

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirmId) return;

    const pm: PricingModel = { type: modelType };
    if (modelType === 'standart') {
      pm.standartConfig = {
        baseCount: Number(standartBaseCount),
        baseFee: Number(standartBaseFee),
        extraPerPerson: Number(standartExtra)
      };
    } else if (modelType === 'toleransli') {
      pm.toleransliConfig = {
        baseCount: Number(toleransliBaseCount),
        baseFee: Number(toleransliBaseFee),
        extraPerPerson: Number(toleransliExtra),
        tolerancePercent: Number(toleransliTolerance)
      };
    } else if (modelType === 'kademeli') {
      pm.kademeliConfig = {
        ranges: kademeliRanges.map(r => ({
          min: Number(r.min),
          max: Number(r.max),
          fee: Number(r.fee)
        }))
      };
    } else if (modelType === 'yillik') {
      pm.yillikConfig = {
        annualFee: Number(yillikFee)
      };
    }

    const finalGroup = isCustomGroup ? customGroupNameInput.trim() || 'Genel' : groupName;

    const updatedFirm: Firm = {
      ...selectedFirm!,
      name,
      isVatIncluded,
      invoiceType,
      groupName: finalGroup,
      taxNumber: invoiceType === 'earsiv' ? taxNumber : undefined,
      address: invoiceType === 'earsiv' ? address : undefined,
      pricingModel: pm,
      parentFirmId: parentFirmId || undefined,
      serviceType: serviceType
    };

    onSaveFirm(updatedFirm);
    alert('Firma fiyatlandırma ve fatura ayarları başarıyla kaydedildi.');
  };

  const handleAddNewFirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirmName.trim()) return;

    const finalGroup = isNewFirmCustomGroup ? newFirmCustomGroupInput.trim() || 'Genel' : newFirmGroup;

    const newFirm: Firm = {
      id: `firm-${Date.now()}`,
      name: newFirmName.trim(),
      isVatIncluded: false,
      invoiceType: newFirmInvoiceType,
      groupName: finalGroup,
      pricingModel: {
        type: 'standart',
        standartConfig: {
          baseCount: 10,
          baseFee: 1000,
          extraPerPerson: 50
        }
      }
    };

    onAddFirm(newFirm);
    setNewFirmName('');
    setNewFirmInvoiceType('efatura');
    setNewFirmGroup('Genel');
    setIsNewFirmCustomGroup(false);
    setNewFirmCustomGroupInput('');
    setIsAddingFirm(false);
  };

  // Filter firms by search term
  const filteredFirms = useMemo(() => {
    if (!listSearchTerm.trim()) return firms;
    const term = listSearchTerm.toLocaleLowerCase('tr');
    return firms.filter(f => 
      f.name.toLocaleLowerCase('tr').includes(term) ||
      (f.groupName && f.groupName.toLocaleLowerCase('tr').includes(term))
    );
  }, [firms, listSearchTerm]);

  return (
    <div className="space-y-6" id="pricing-container">
      {/* Main Area: Pricing Configurator */}
      <div id="pricing-main-config">
        {selectedFirm ? (
          <form onSubmit={handleSave} className="bg-[#111111] p-6 rounded-2xl border border-neutral-800 shadow-xs space-y-6" id="pricing-config-form">
            <div className="border-b border-neutral-800 pb-4">
              <h1 className="text-xl font-semibold text-white tracking-tight">Fiyatlandırma & Fatura Parametreleri</h1>
              <p className="text-xs text-neutral-400 mt-1">Seçili firmaya özel faturalandırma kuralları ve ücret modelleri</p>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Firma Unvanı</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Firma Grubu</label>
                {isCustomGroup ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Yeni Grup Adı yazın..."
                      value={customGroupNameInput}
                      onChange={(e) => setCustomGroupNameInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:outline-hidden focus:border-indigo-500"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomGroup(false)}
                      className="px-2.5 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <select
                    value={groupName}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsCustomGroup(true);
                        setCustomGroupNameInput('');
                      } else {
                        setGroupName(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-2.5 text-sm bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium cursor-pointer"
                  >
                    {existingGroups.map(grp => (
                      <option key={grp} value={grp}>{grp}</option>
                    ))}
                    <option value="__NEW__">+ Yeni Grup Oluştur...</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">KDV Durumu</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVatIncluded(true)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      isVatIncluded 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-xs' 
                        : 'bg-neutral-900 text-neutral-400 border-neutral-850 hover:bg-neutral-800'
                    }`}
                  >
                    KDV Dahil
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVatIncluded(false)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      !isVatIncluded 
                        ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-xs' 
                        : 'bg-neutral-900 text-neutral-400 border-neutral-850 hover:bg-neutral-800'
                    }`}
                  >
                    KDV Hariç (Net + KDV)
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Structural Relationships: Havuz / Şube System & Hizmet Türü */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-950/10 p-4 rounded-2xl border border-indigo-500/15">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Ana Firma / Havuz Tanımı (Şube İlişkisi)</label>
                <select
                  value={parentFirmId}
                  onChange={(e) => setParentFirmId(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-neutral-900 border border-neutral-850 text-white rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer font-medium"
                >
                  <option value="">Kendisi Merkez / Bağımsız Firma</option>
                  {firms
                    .filter(f => f.id !== selectedFirmId && !f.parentFirmId)
                    .map(f => (
                      <option key={f.id} value={f.id}>{f.name} (Merkez)</option>
                    ))
                  }
                </select>
                <p className="text-[10px] text-neutral-500 mt-1 italic font-semibold">
                  Eğer şube ise, çalışan sayıları ve KDV hesabı belirlenen Merkez firmada konsolide edilir.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Hizmet Türü ve Hakediş Dağılımı</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as any)}
                  className="w-full px-4 py-2.5 text-sm bg-neutral-900 border border-neutral-850 text-white rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer font-medium"
                >
                  <option value="both">İş Güvenliği Uzmanı + İşyeri Hekimi (%60 / %40)</option>
                  <option value="expert_only">Sadece İş Güvenliği Uzmanı (Uzman %100 / Hekim %0)</option>
                  <option value="doctor_only">Sadece İşyeri Hekimi (Uzman %0 / Hekim %100)</option>
                </select>
                <p className="text-[10px] text-neutral-500 mt-1 italic font-semibold">
                  Hakediş dağılımları ve KDV ayrışması seçilen hizmet türüne göre hesaplanır.
                </p>
              </div>
            </div>

            {/* Fatura Tipi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Fatura Tipi</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceType('efatura')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      invoiceType === 'efatura' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/10' 
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800'
                    }`}
                  >
                    e-Fatura
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceType('earsiv')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      invoiceType === 'earsiv' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/10' 
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800'
                    }`}
                  >
                    e-Arşiv
                  </button>
                </div>
              </div>

              {invoiceType === 'earsiv' && (
                <div className="space-y-4 animate-fade-in md:col-span-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 pt-2 border-t border-neutral-800">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Vergi No / TCKN</label>
                    <input
                      type="text"
                      placeholder="Vergi No / TC Kimlik No yazın"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:outline-hidden focus:border-indigo-500"
                      required={invoiceType === 'earsiv'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Fatura Adresi</label>
                    <input
                      type="text"
                      placeholder="Fatura adresini yazın"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:outline-hidden focus:border-indigo-500"
                      required={invoiceType === 'earsiv'}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Model Seçimi */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Ücretlendirme Modeli</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['standart', 'toleransli', 'kademeli', 'yillik'] as PricingModelType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setModelType(type)}
                      className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all border ${
                        modelType === type
                          ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-2xs'
                          : 'bg-neutral-900 text-neutral-450 border-neutral-850 hover:bg-neutral-800'
                      }`}
                    >
                      <div className="capitalize">{type === 'standart' ? 'Standart' : type === 'toleransli' ? 'Toleranslı' : type === 'kademeli' ? 'Kademeli' : 'Yıllık'}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic model details */}
              <div className="p-5 bg-[#0a0a0a] rounded-2xl border border-neutral-800" id="model-config-panel">
                {/* STANDART */}
                {modelType === 'standart' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs mb-2">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>Standart Model: Belirli bir kişi sayısına kadar taban fiyat, aşılması durumunda kişi başı ekstra fiyat uygulanır.</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Taban Kişi Sayısı</label>
                        <input
                          type="number"
                          value={standartBaseCount}
                          onChange={(e) => setStandartBaseCount(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Taban Ücret (TL)</label>
                        <input
                          type="number"
                          value={standartBaseFee}
                          onChange={(e) => setStandartBaseFee(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Kişi Başı Ekstra Ücret (TL)</label>
                        <input
                          type="number"
                          value={standartExtra}
                          onChange={(e) => setStandartExtra(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TOLERANSLI */}
                {modelType === 'toleransli' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs mb-2">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>Toleranslı Model: Belirlenen taban kişi sayısının tolerans yüzdesi kadar üstü aşılmadıkça ekstra ücret yansıtılmaz. Limit aşıldığında aşan kişi başı ücret eklenir.</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Taban Kişi Sayısı</label>
                        <input
                          type="number"
                          value={toleransliBaseCount}
                          onChange={(e) => setToleransliBaseCount(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Taban Ücret (TL)</label>
                        <input
                          type="number"
                          value={toleransliBaseFee}
                          onChange={(e) => setToleransliBaseFee(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Tolerans Oranı (%)</label>
                        <input
                          type="number"
                          value={toleransliTolerance}
                          onChange={(e) => setToleransliTolerance(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Kişi Başı Ekstra Ücret (TL)</label>
                        <input
                          type="number"
                          value={toleransliExtra}
                          onChange={(e) => setToleransliExtra(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400 mt-1 bg-neutral-900 p-2.5 rounded-lg border border-neutral-850">
                      Örnek hesaplama: {toleransliBaseCount} taban kişi ve %{toleransliTolerance} tolerans ile toplam kişi {Math.floor(toleransliBaseCount * (1 + toleransliTolerance / 100))} kişi limitine tabidir. Bu limiti geçen her bir ek kişi için {toleransliExtra} TL ekstra eklenir.
                    </div>
                  </div>
                )}

                {/* KADEMELİ */}
                {modelType === 'kademeli' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                        <Info className="h-4 w-4 shrink-0" />
                        <span>Kademeli Model: Çalışan sayısı aralıklarına göre belirlenmiş sabit paket ücretleri.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddKademeRange}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-lg transition-colors font-semibold cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Kademe Ekle
                      </button>
                    </div>

                    <div className="space-y-2" id="kademeli-ranges-list">
                      {kademeliRanges.map((range, index) => (
                        <div key={index} className="flex items-center gap-3 bg-neutral-900 p-3 rounded-xl border border-neutral-850 shadow-2xs">
                          <span className="text-xs font-semibold text-neutral-500 w-16">Kademe {index + 1}</span>
                          <div className="flex-1 grid grid-cols-3 gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-neutral-500 font-bold uppercase">Min:</span>
                              <input
                                type="number"
                                value={range.min}
                                onChange={(e) => handleUpdateKademeRange(index, 'min', Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-800 text-white rounded-md focus:border-indigo-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-neutral-500 font-bold uppercase">Max:</span>
                              <input
                                type="number"
                                value={range.max}
                                onChange={(e) => handleUpdateKademeRange(index, 'max', Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-800 text-white rounded-md focus:border-indigo-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-neutral-500 font-bold uppercase">Ücret:</span>
                              <input
                                type="number"
                                value={range.fee}
                                onChange={(e) => handleUpdateKademeRange(index, 'fee', Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-800 text-indigo-400 rounded-md font-semibold focus:border-indigo-500"
                              />
                            </div>
                          </div>
                          {kademeliRanges.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveKademeRange(index)}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* YILLIK */}
                {modelType === 'yillik' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs mb-2">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>Yıllık İşlem Modeli: Sadece yılda bir kez sabit bir toplu ödeme tutarı tahsil edilir. Çalışan sayısı hesaplamayı etkilemez.</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Yıllık Sabit Ücret (TL)</label>
                      <input
                        type="number"
                        value={yillikFee}
                        onChange={(e) => setYillikFee(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg max-w-xs font-semibold focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save & Delete Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-800">
              {onDeleteFirm && selectedFirm ? (
                <button
                  type="button"
                  onClick={() => onDeleteFirm(selectedFirm.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Seçili firmayı kalıcı olarak sistemden sil"
                >
                  <Trash className="h-4 w-4" />
                  Firmayı Sil
                </button>
              ) : <div />}

              <button
                type="submit"
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-650/10 cursor-pointer"
                id="btn-save-pricing"
              >
                <Save className="h-4 w-4" />
                Ayarları Kaydet
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-[#111111] p-12 rounded-2xl border border-neutral-800 shadow-xs flex flex-col items-center justify-center text-center">
            <HelpCircle className="h-12 w-12 text-neutral-700 mb-2" />
            <p className="text-neutral-400 font-semibold">Gösterilecek firma bulunamadı.</p>
            <p className="text-xs text-neutral-500 mt-1">Lütfen aşağıdaki listeden bir firma seçin veya yeni bir firma ekleyin.</p>
          </div>
        )}
      </div>

      {/* Firma Listesi (Company List) under parameters */}
      <div className="space-y-3 pt-4 border-t border-neutral-800/60" id="firm-list-under-parameters">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Save className="h-4 w-4 text-indigo-400" />
              Firma Listesi ({filteredFirms.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Search Bar */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Firma veya grup ara..."
                value={listSearchTerm}
                onChange={(e) => setListSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
              {listSearchTerm && (
                <button
                  type="button"
                  onClick={() => setListSearchTerm('')}
                  className="absolute right-2.5 top-2 text-[10px] text-neutral-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsAddingFirm(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
              id="btn-add-firm-open"
            >
              <Plus className="h-3.5 w-3.5" />
              Ekle
            </button>
          </div>
        </div>

        {/* Add Firm Inline Form */}
        {isAddingFirm && (
          <form onSubmit={handleAddNewFirmSubmit} className="bg-[#0a0a0a] p-4 rounded-xl border border-neutral-800 space-y-3 max-w-lg animate-fade-in" id="new-firm-form">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Yeni Firma Ekle</h3>
            
            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Firma Unvanı</label>
              <input
                type="text"
                placeholder="Firma Unvanı girin..."
                value={newFirmName}
                onChange={(e) => setNewFirmName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Fatura Tipi</label>
                <select
                  value={newFirmInvoiceType}
                  onChange={(e) => setNewFirmInvoiceType(e.target.value as 'efatura' | 'earsiv')}
                  className="w-full px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500 font-medium"
                >
                  <option value="efatura">e-Fatura</option>
                  <option value="earsiv">e-Arşiv</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Firma Grubu</label>
                {isNewFirmCustomGroup ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Yeni Grup Adı..."
                      value={newFirmCustomGroupInput}
                      onChange={(e) => setNewFirmCustomGroupInput(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsNewFirmCustomGroup(false)}
                      className="px-2 text-[10px] bg-neutral-800 text-neutral-300 rounded-lg shrink-0"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <select
                    value={newFirmGroup}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsNewFirmCustomGroup(true);
                        setNewFirmCustomGroupInput('');
                      } else {
                        setNewFirmGroup(e.target.value);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500 font-medium cursor-pointer"
                  >
                    {existingGroups.map(grp => (
                      <option key={grp} value={grp}>{grp}</option>
                    ))}
                    <option value="__NEW__">+ Yeni Grup...</option>
                  </select>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingFirm(false)}
                className="px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800 rounded-md font-medium cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-550 text-white rounded-md font-semibold cursor-pointer shadow-xs"
              >
                Kaydet
              </button>
            </div>
          </form>
        )}

        {/* Firms Selection List (Vertical) */}
        <div className="bg-[#111111] rounded-2xl border border-neutral-800 overflow-hidden" id="pricing-firm-list">
          {filteredFirms.length > 0 ? (
            <div className="divide-y divide-neutral-900">
              {filteredFirms.map((f) => {
                const isSelected = selectedFirmId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFirmId(f.id)}
                    className={`w-full text-left px-4 py-2.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/15 border-l-4 border-indigo-500 text-white font-medium'
                        : 'hover:bg-neutral-900/50 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-400' : 'bg-neutral-700'}`} />
                      <span className="font-semibold text-xs text-white truncate">{f.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/20">
                        {f.groupName || 'Genel'}
                      </span>
                      <span className="bg-neutral-900 text-neutral-400 text-[9px] font-medium px-2 py-0.5 rounded border border-neutral-800">
                        {f.invoiceType === 'efatura' ? 'e-Fatura' : 'e-Arşiv'}
                      </span>
                      <span className="bg-neutral-900 text-neutral-400 text-[9px] font-medium px-2 py-0.5 rounded border border-neutral-800 capitalize">
                        {f.pricingModel.type === 'standart' ? 'Standart' : f.pricingModel.type === 'toleransli' ? 'Toleranslı' : f.pricingModel.type === 'kademeli' ? 'Kademeli' : 'Yıllık'}
                      </span>
                      <span className="bg-neutral-900 text-neutral-400 text-[9px] font-medium px-2 py-0.5 rounded border border-neutral-800">
                        {f.isVatIncluded ? 'KDV Dahil' : 'KDV Hariç'}
                      </span>
                      {onDeleteFirm && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFirm(f.id);
                          }}
                          className="p-1 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded transition-colors ml-1 cursor-pointer"
                          title="Firmayı Sil"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-neutral-500 font-medium">
              Arama kriterlerine uygun firma bulunamadı.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
