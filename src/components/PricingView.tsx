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
  const [selectedFirmId, setSelectedFirmId] = useState<string>(''); // '' means New Firm mode
  const [listSearchTerm, setListSearchTerm] = useState('');
  
  // Active form state for selected firm
  const selectedFirm = firms.find(f => f.id === selectedFirmId);

  // Selected config values mapped to local state
  const [name, setName] = useState('');
  const [hazardClass, setHazardClass] = useState<'AZ TEHLİKELİ' | 'TEHLİKELİ' | 'ÇOK TEHLİKELİ' | ''>('');
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
      setHazardClass(selectedFirm.hazardClass || '');
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
    } else {
      // New Firm Defaults
      setName('');
      setHazardClass('');
      setIsVatIncluded(false);
      setInvoiceType('efatura');
      setGroupName('Genel');
      setIsCustomGroup(false);
      setCustomGroupNameInput('');
      setTaxNumber('');
      setAddress('');
      setModelType('standart');
      setParentFirmId('');
      setServiceType('both');
      setStandartBaseCount(10);
      setStandartBaseFee(1000);
      setStandartExtra(50);
      setToleransliBaseCount(10);
      setToleransliBaseFee(1000);
      setToleransliExtra(50);
      setToleransliTolerance(10);
      setKademeliRanges([{ min: 1, max: 10, fee: 1000 }]);
      setYillikFee(12000);
    }
  }, [selectedFirmId, firms]);

  // Handler for adding a new range to the graduated config
  const handleAddKademeRange = () => {
    const lastRange = kademeliRanges[kademeliRanges.length - 1];
    const newMin = lastRange ? lastRange.max + 1 : 1;
    setKademeliRanges([...kademeliRanges, { min: newMin, max: newMin + 19, fee: (lastRange?.fee || 1000) + 500 }]);
  };

  const handleRemoveKademeRange = (index: number) => {
    if (kademeliRanges.length > 1) {
      setKademeliRanges(kademeliRanges.filter((_, idx) => idx !== index));
    }
  };

  const handleUpdateKademeRange = (index: number, key: keyof KademeRange, value: number) => {
    const updated = kademeliRanges.map((range, idx) => {
      if (idx === index) return { ...range, [key]: value };
      return range;
    });
    setKademeliRanges(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pm: PricingModel = { type: modelType };
    if (modelType === 'standart') {
      pm.standartConfig = { baseCount: Number(standartBaseCount), baseFee: Number(standartBaseFee), extraPerPerson: Number(standartExtra) };
    } else if (modelType === 'toleransli') {
      pm.toleransliConfig = { baseCount: Number(toleransliBaseCount), baseFee: Number(toleransliBaseFee), extraPerPerson: Number(toleransliExtra), tolerancePercent: Number(toleransliTolerance) };
    } else if (modelType === 'kademeli') {
      pm.kademeliConfig = { ranges: kademeliRanges.map(r => ({ min: Number(r.min), max: Number(r.max), fee: Number(r.fee) })) };
    } else if (modelType === 'yillik') {
      pm.yillikConfig = { annualFee: Number(yillikFee) };
    }

    const finalGroup = isCustomGroup ? customGroupNameInput.trim() || 'Genel' : groupName;

    if (selectedFirmId) {
      // Update existing firm
      const updatedFirm: Firm = {
        ...selectedFirm!,
        name,
        isVatIncluded,
        invoiceType,
        hazardClass: hazardClass || undefined,
        groupName: finalGroup,
        taxNumber: invoiceType === 'earsiv' ? taxNumber : undefined,
        address: invoiceType === 'earsiv' ? address : undefined,
        pricingModel: pm,
        parentFirmId: parentFirmId || undefined,
        serviceType: serviceType
      };
      onSaveFirm(updatedFirm);
    } else {
      // Add new firm
      const newFirm: Firm = {
        id: `firm-${Date.now()}`,
        name: name.trim(),
        isVatIncluded,
        invoiceType,
        hazardClass: hazardClass || undefined,
        groupName: finalGroup,
        taxNumber: invoiceType === 'earsiv' ? taxNumber : undefined,
        address: invoiceType === 'earsiv' ? address : undefined,
        pricingModel: pm,
        parentFirmId: parentFirmId || undefined,
        serviceType: serviceType
      };
      onAddFirm(newFirm);
      setSelectedFirmId(newFirm.id);
    }
  };

  const filteredFirms = useMemo(() => {
    if (!listSearchTerm.trim()) return firms;
    const term = listSearchTerm.toLocaleLowerCase('tr');
    return firms.filter(f => 
      f.name.toLocaleLowerCase('tr').includes(term) ||
      (f.groupName && f.groupName.toLocaleLowerCase('tr').includes(term))
    );
  }, [firms, listSearchTerm]);

  return (
    <div className="space-y-4" id="pricing-container">
      {/* Main Area: Pricing Configurator */}
      <div id="pricing-main-config">
        <form onSubmit={handleSave} className="bg-[#111111] p-4 rounded-xl border border-neutral-800 shadow-xs space-y-4" id="pricing-config-form">
          <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">{selectedFirmId ? 'Firmayı Düzenle' : 'Yeni Firma Ekle'}</h1>
              <p className="text-[11px] text-neutral-400 mt-0.5">Firma bilgilerini ve fiyatlandırma kurallarını belirleyin</p>
            </div>
            {selectedFirmId && (
              <button
                type="button"
                onClick={() => setSelectedFirmId('')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all"
              >
                <Plus className="h-4 w-4" />
                Yeni Ekle
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Firma Unvanı</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-neutral-900 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tehlike Sınıfı</label>
              <select
                value={hazardClass}
                onChange={(e) => setHazardClass(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Belirtilmemiş</option>
                <option value="AZ TEHLİKELİ">AZ TEHLİKELİ</option>
                <option value="TEHLİKELİ">TEHLİKELİ</option>
                <option value="ÇOK TEHLİKELİ">ÇOK TEHLİKELİ</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Firma Grubu</label>
              {isCustomGroup ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Yeni Grup..."
                    value={customGroupNameInput}
                    onChange={(e) => setCustomGroupNameInput(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500"
                    required
                    autoFocus
                  />
                  <button type="button" onClick={() => setIsCustomGroup(false)} className="px-2 text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg">İptal</button>
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
                  className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white rounded-lg focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  {existingGroups.map(grp => <option key={grp} value={grp}>{grp}</option>)}
                  <option value="__NEW__">+ Yeni Grup...</option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-indigo-950/10 p-3 rounded-xl border border-indigo-500/15">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Şube İlişkisi</label>
              <select
                value={parentFirmId}
                onChange={(e) => setParentFirmId(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-850 text-white rounded-lg focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Bağımsız (Merkez)</option>
                {firms.filter(f => f.id !== selectedFirmId && !f.parentFirmId).map(f => (
                  <option key={f.id} value={f.id}>{f.name} (Merkez)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Hizmet Türü</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as any)}
                className="w-full px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-850 text-white rounded-lg focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="both">İGU + İYH (%60 / %40)</option>
                <option value="expert_only">Sadece İGU (%100)</option>
                <option value="doctor_only">Sadece İYH (%100)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">KDV Durumu</label>
              <div className="flex gap-1 text-xs">
                <button type="button" onClick={() => setIsVatIncluded(true)} className={`flex-1 py-1.5 rounded-lg font-semibold border ${isVatIncluded ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-neutral-900 text-neutral-400 border-neutral-850'}`}>Dahil</button>
                <button type="button" onClick={() => setIsVatIncluded(false)} className={`flex-1 py-1.5 rounded-lg font-semibold border ${!isVatIncluded ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20' : 'bg-neutral-900 text-neutral-400 border-neutral-850'}`}>Hariç</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0a0a0a] p-3 rounded-xl border border-neutral-800">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Fatura Tipi</label>
              <div className="flex gap-1 text-xs">
                <button type="button" onClick={() => setInvoiceType('efatura')} className={`flex-1 py-1.5 rounded-lg font-semibold border ${invoiceType === 'efatura' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}>e-Fatura</button>
                <button type="button" onClick={() => setInvoiceType('earsiv')} className={`flex-1 py-1.5 rounded-lg font-semibold border ${invoiceType === 'earsiv' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}>e-Arşiv</button>
              </div>
            </div>

            {invoiceType === 'earsiv' && (
              <div className="grid grid-cols-2 gap-2 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Vergi No / TCKN</label>
                  <input type="text" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500 focus:outline-hidden" required={invoiceType === 'earsiv'} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Fatura Adresi</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500 focus:outline-hidden" required={invoiceType === 'earsiv'} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Ücretlendirme Modeli</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['standart', 'toleransli', 'kademeli', 'yillik'] as PricingModelType[]).map((type) => (
                  <button key={type} type="button" onClick={() => setModelType(type)} className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all border capitalize ${modelType === type ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20' : 'bg-neutral-900 text-neutral-450 border-neutral-850'}`}>
                    {type === 'standart' ? 'Standart' : type === 'toleransli' ? 'Toleranslı' : type === 'kademeli' ? 'Kademeli' : 'Yıllık'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0a] rounded-xl border border-neutral-800">
              {modelType === 'standart' && (
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-[10px] font-bold text-neutral-500 mb-1">Taban Kişi</label><input type="number" value={standartBaseCount} onChange={(e) => setStandartBaseCount(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500" /></div>
                  <div><label className="block text-[10px] font-bold text-neutral-500 mb-1">Taban Ücret</label><input type="number" value={standartBaseFee} onChange={(e) => setStandartBaseFee(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500" /></div>
                  <div><label className="block text-[10px] font-bold text-neutral-500 mb-1">Kişi Başı Ekstra</label><input type="number" value={standartExtra} onChange={(e) => setStandartExtra(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500" /></div>
                </div>
              )}

              {modelType === 'toleransli' && (
                <div className="grid grid-cols-4 gap-2">
                  <div><label className="block text-[10px] font-bold text-neutral-500 mb-1">Taban Kişi</label><input type="number" value={toleransliBaseCount} onChange={(e) => setToleransliBaseCount(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500" /></div>
                  <div><label className="block text-[10px] font-bold text-neutral-500 mb-1">Taban Ücret</label><input type="number" value={toleransliBaseFee} onChange={(e) => setToleransliBaseFee(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500" /></div>
                  <div><label className="block text-[10px] font-bold text-neutral-500 mb-1">Tolerans (%)</label><input type="number" value={toleransliTolerance} onChange={(e) => setToleransliTolerance(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500" /></div>
                  <div><label className="block text-[10px] font-bold text-neutral-500 mb-1">Ekstra</label><input type="number" value={toleransliExtra} onChange={(e) => setToleransliExtra(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg focus:border-indigo-500" /></div>
                </div>
              )}

              {modelType === 'kademeli' && (
                <div className="space-y-2">
                  {kademeliRanges.map((range, index) => (
                    <div key={index} className="flex items-center gap-2 bg-neutral-900 p-2 rounded-lg border border-neutral-850">
                      <span className="text-[10px] font-bold text-neutral-500 w-12">Kademe {index + 1}</span>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input type="number" value={range.min} onChange={(e) => handleUpdateKademeRange(index, 'min', Number(e.target.value))} className="w-full px-2 py-1 text-xs bg-neutral-950 border border-neutral-800 text-white rounded focus:border-indigo-500" placeholder="Min" />
                        <input type="number" value={range.max} onChange={(e) => handleUpdateKademeRange(index, 'max', Number(e.target.value))} className="w-full px-2 py-1 text-xs bg-neutral-950 border border-neutral-800 text-white rounded focus:border-indigo-500" placeholder="Max" />
                        <input type="number" value={range.fee} onChange={(e) => handleUpdateKademeRange(index, 'fee', Number(e.target.value))} className="w-full px-2 py-1 text-xs bg-neutral-950 border border-neutral-800 text-indigo-400 rounded font-semibold focus:border-indigo-500" placeholder="Ücret" />
                      </div>
                      <div className="flex gap-1">
                        {index === kademeliRanges.length - 1 && (
                          <button type="button" onClick={handleAddKademeRange} className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded"><Plus className="h-3.5 w-3.5" /></button>
                        )}
                        {kademeliRanges.length > 1 && (
                          <button type="button" onClick={() => handleRemoveKademeRange(index)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"><Trash className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {modelType === 'yillik' && (
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Yıllık Sabit Ücret (TL)</label>
                  <input type="number" value={yillikFee} onChange={(e) => setYillikFee(Number(e.target.value))} className="w-48 px-2 py-1.5 text-xs border border-neutral-800 bg-neutral-900 text-white rounded-lg font-semibold focus:border-indigo-500" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800">
            {onDeleteFirm && selectedFirmId ? (
              <button type="button" onClick={() => onDeleteFirm(selectedFirmId)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all">
                <Trash className="h-4 w-4" />
                Firmayı Sil
              </button>
            ) : <div />}

            <button type="submit" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-md">
              <Save className="h-4 w-4" />
              {selectedFirmId ? 'Değişiklikleri Kaydet' : 'Yeni Firmayı Ekle'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3 pt-2" id="firm-list-under-parameters">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Firma Listesi ({filteredFirms.length})
          </h2>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-neutral-500" />
            <input type="text" placeholder="Ara..." value={listSearchTerm} onChange={(e) => setListSearchTerm(e.target.value)} className="w-full pl-8 pr-2 py-1 text-xs bg-neutral-900 border border-neutral-800 text-white rounded-lg focus:border-indigo-500 focus:outline-hidden" />
          </div>
        </div>

        <div className="bg-[#111111] rounded-xl border border-neutral-800 overflow-hidden" id="pricing-firm-list">
          {filteredFirms.length > 0 ? (
            <div className="divide-y divide-neutral-900 max-h-96 overflow-y-auto">
              {filteredFirms.map((f) => {
                const isSelected = selectedFirmId === f.id;
                return (
                  <button key={f.id} type="button" onClick={() => setSelectedFirmId(f.id)} className={`w-full text-left px-3 py-2 transition-colors flex items-center justify-between gap-2 ${isSelected ? 'bg-indigo-600/15 border-l-4 border-indigo-500 text-white' : 'hover:bg-neutral-900/50 text-neutral-300'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-indigo-400' : 'bg-neutral-700'}`} />
                      <span className="font-semibold text-xs truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {f.hazardClass && (
                         <span className="bg-amber-500/10 text-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20">{f.hazardClass}</span>
                      )}
                      <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/20">{f.groupName || 'Genel'}</span>
                      <span className="bg-neutral-900 text-neutral-400 text-[9px] font-medium px-1.5 py-0.5 rounded border border-neutral-800 capitalize">{f.pricingModel.type}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-neutral-500 font-medium">Bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );
}
