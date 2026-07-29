import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronRight, Activity, Users, Send, Settings, FileSpreadsheet, Download, 
  Upload, CheckCircle2, FileCode, Server, ShieldCheck, Lock, RefreshCw, FileText, 
  Info, X, Key, Copy, Check, Filter, Sparkles, Plus, ChevronDown, ChevronUp, Rss 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Firm, Invoice } from '../types';
import { calculateInvoiceFee, formatLira } from '../initialData';

interface InvoicePrepViewProps {
  firms: Firm[];
  vatRate: number; // system settings default VAT
  vatRateExpert?: number;
  vatRateDoctor?: number;
  vatRateHealth?: number;
  vpsServerUrl?: string;
  vpsApiKey?: string;
  onSendToIssue: (invoice: Partial<Invoice>) => void;
  onAddFirm?: (firm: Firm) => void;
  onSaveFirm?: (firm: Firm) => void;
}

export default function InvoicePrepView({ 
  firms, 
  vatRate, 
  vatRateExpert,
  vatRateDoctor,
  vatRateHealth,
  vpsServerUrl,
  vpsApiKey,
  onSendToIssue,
  onAddFirm,
  onSaveFirm
}: InvoicePrepViewProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'efatura' | 'earsiv'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [customCreatedGroups, setCustomCreatedGroups] = useState<string[]>([]);

  // Collapsible state for Fatura Parametreleri & Veri Entegrasyonu
  const [isParamsOpen, setIsParamsOpen] = useState<boolean>(true);
  const [isIntegrationOpen, setIsIntegrationOpen] = useState<boolean>(false);

  // Updated employee counts modal state
  const [updatedEmployeesQueue, setUpdatedEmployeesQueue] = useState<{
    firmId: string;
    firmName: string;
    oldEmployeeCount: number;
    newEmployeeCount: number;
  }[]>([]);
  const [showUpdatedEmployeesModal, setShowUpdatedEmployeesModal] = useState<boolean>(false);
  const [showEmployeeImportModal, setShowEmployeeImportModal] = useState<boolean>(false);

  // VPS & Integration States
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<'employee' | 'health'>('employee');
  const [isSyncingApi, setIsSyncingApi] = useState(false);

  // Health Unmatched Firms Mapping Modal States
  const [healthUnmatchedQueue, setHealthUnmatchedQueue] = useState<{ rawName: string; amount: number }[]>([]);
  const [currentHealthUnmatchedIndex, setCurrentHealthUnmatchedIndex] = useState<number>(-1);
  const [showHealthMappingModal, setShowHealthMappingModal] = useState<boolean>(false);
  
  // Health Mapping Modal Form Inputs
  const [healthMatchAction, setHealthMatchAction] = useState<'existing' | 'new'>('existing');
  const [selectedMatchFirmId, setSelectedMatchFirmId] = useState<string>('');
  const [healthFirmSearchTerm, setHealthFirmSearchTerm] = useState<string>('');
  const [newHealthFirmName, setNewHealthFirmName] = useState<string>('');
  const [newHealthFirmInvoiceType, setNewHealthFirmInvoiceType] = useState<'efatura' | 'earsiv'>('efatura');
  const [newHealthFirmGroup, setNewHealthFirmGroup] = useState<string>('Genel');

  // Copy-Paste Text Area States
  const [pastedText, setPastedText] = useState('');
  const [pastedHealthText, setPastedHealthText] = useState('');
  const [simpleHealthMessageText, setSimpleHealthMessageText] = useState('');

  // Live Messages Stream & Webhook Tester States
  const [liveHealthMessages, setLiveHealthMessages] = useState<Array<{ id: string; timestamp: string; firmName: string; amount: number; paymentType: string; rawText?: string }>>([]);
  const [processedMsgIds, setProcessedMsgIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('processed_health_msg_ids');
      if (!saved) return new Set();
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isFetchingLiveMessages, setIsFetchingLiveMessages] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<'curl' | 'python' | 'csharp' | 'php' | 'js'>('curl');
  const [webhookTestFirm, setWebhookTestFirm] = useState('');
  const [webhookTestAmount, setWebhookTestAmount] = useState('');
  const [isSendingWebhookTest, setIsSendingWebhookTest] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedDevNote, setCopiedDevNote] = useState(false);

  const markMessagesAsProcessed = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    setProcessedMsgIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      try {
        localStorage.setItem('processed_health_msg_ids', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // Instantly remove processed messages from UI live stream
    setLiveHealthMessages(prev => prev.filter(m => !ids.includes(m.id)));

    // Send processed IDs to backend so they persist across sessions
    try {
      await fetch('/api/health-sync/processed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
    } catch (err) {
      console.error("Could not sync processed IDs to server:", err);
    }
  };

  const fetchLiveHealthMessages = async () => {
    setIsFetchingLiveMessages(true);
    try {
      const res = await fetch(`/api/health-sync/latest?_t=${Date.now()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.recentMessages)) {
        // Filter out already processed messages
        const unprocessed = data.recentMessages.filter((m: any) => !processedMsgIds.has(m.id));
        setLiveHealthMessages(unprocessed);
      }
    } catch (err) {
      console.error("Could not fetch live messages:", err);
    } finally {
      setIsFetchingLiveMessages(false);
    }
  };

  useEffect(() => {
    fetchLiveHealthMessages();
  }, [processedMsgIds]);

  // Missing Firm Registration Modal States (When importing worker counts from Excel)
  const [unmatchedQueue, setUnmatchedQueue] = useState<{ name: string; employeeCount: number; healthAmount?: number }[]>([]);
  const [currentUnmatchedIndex, setCurrentUnmatchedIndex] = useState<number>(-1);
  const [showAddMissingFirmModal, setShowAddMissingFirmModal] = useState<boolean>(false);

  // Form fields for adding missing firm via popup
  const [missingFirmName, setMissingFirmName] = useState('');
  const [missingEmployeeCount, setMissingEmployeeCount] = useState(10);
  const [missingInvoiceType, setMissingInvoiceType] = useState<'efatura' | 'earsiv'>('efatura');
  const [missingGroupName, setMissingGroupName] = useState('Genel');
  const [isMissingCustomGroup, setIsMissingCustomGroup] = useState(false);
  const [missingCustomGroupInput, setMissingCustomGroupInput] = useState('');
  const [missingIsVatIncluded, setMissingIsVatIncluded] = useState(false);
  const [missingTaxNumber, setMissingTaxNumber] = useState('');
  const [missingAddress, setMissingAddress] = useState('');
  const [missingBaseCount, setMissingBaseCount] = useState(10);
  const [missingBaseFee, setMissingBaseFee] = useState(1000);
  const [missingExtraPerPerson, setMissingExtraPerPerson] = useState(50);
  const [missingServiceType, setMissingServiceType] = useState<'both' | 'expert_only' | 'doctor_only'>('both');

  // Helper to pre-fill form when loading a missing firm
  const loadMissingFirmToForm = (item: { name: string; employeeCount: number }) => {
    setMissingFirmName(item.name);
    setMissingEmployeeCount(item.employeeCount || 10);
    setMissingInvoiceType('efatura');
    setMissingGroupName('Genel');
    setIsMissingCustomGroup(false);
    setMissingCustomGroupInput('');
    setMissingIsVatIncluded(false);
    setMissingTaxNumber('');
    setMissingAddress('');
    setMissingBaseCount(10);
    setMissingBaseFee(1000);
    setMissingExtraPerPerson(50);
    setMissingServiceType('both');
  };

  // Handler to save missing firm from modal
  const handleSaveMissingFirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!missingFirmName.trim()) return;

    const finalGroup = isMissingCustomGroup ? missingCustomGroupInput.trim() || 'Genel' : missingGroupName;

    const newFirmId = `firm-${Date.now()}`;
    const newFirmObj: Firm = {
      id: newFirmId,
      name: missingFirmName.trim(),
      isVatIncluded: missingIsVatIncluded,
      invoiceType: missingInvoiceType,
      groupName: finalGroup,
      taxNumber: missingTaxNumber,
      address: missingAddress,
      serviceType: missingServiceType,
      employeeCount: missingEmployeeCount,
      pricingModel: {
        type: 'standart',
        standartConfig: {
          baseCount: Number(missingBaseCount),
          baseFee: Number(missingBaseFee),
          extraPerPerson: Number(missingExtraPerPerson)
        }
      }
    };

    // Add to system firms list
    if (onAddFirm) {
      onAddFirm(newFirmObj);
    }

    // Automatically update firmInputs state so employee count shows immediately
    setFirmInputs(prev => ({
      ...prev,
      [newFirmId]: {
        employeeCount: missingEmployeeCount,
        healthAmount: prev[newFirmId]?.healthAmount || 0,
        extraNote: ''
      }
    }));

    // Advance to next missing firm if any
    const nextIndex = currentUnmatchedIndex + 1;
    if (nextIndex < unmatchedQueue.length) {
      setCurrentUnmatchedIndex(nextIndex);
      loadMissingFirmToForm(unmatchedQueue[nextIndex]);
    } else {
      setShowAddMissingFirmModal(false);
      setUnmatchedQueue([]);
      alert(`✅ "${missingFirmName}" firması başarıyla eklendi ve çalışan sayısı güncellendi!`);
    }
  };

  // Handler to skip missing firm
  const handleSkipMissingFirm = () => {
    const nextIndex = currentUnmatchedIndex + 1;
    if (nextIndex < unmatchedQueue.length) {
      setCurrentUnmatchedIndex(nextIndex);
      loadMissingFirmToForm(unmatchedQueue[nextIndex]);
    } else {
      setShowAddMissingFirmModal(false);
      setUnmatchedQueue([]);
    }
  };

  // Dynamic values per firm in a map, initialized from localStorage or current firms list
  const [firmInputs, setFirmInputs] = useState<Record<string, { employeeCount: number; healthAmount: number; extraNote: string }>>(() => {
    try {
      const saved = localStorage.getItem('fcts_firm_inputs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          firms.forEach(f => {
            if (!parsed[f.id]) {
              parsed[f.id] = {
                employeeCount: f.employeeCount || 10,
                healthAmount: 0,
                extraNote: ''
              };
            }
          });
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading firmInputs from localStorage", e);
    }
    const initial: Record<string, { employeeCount: number; healthAmount: number; extraNote: string }> = {};
    firms.forEach(f => {
      initial[f.id] = {
        employeeCount: f.employeeCount || 10,
        healthAmount: 0,
        extraNote: ''
      };
    });
    return initial;
  });

  // Automatically save firmInputs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fcts_firm_inputs', JSON.stringify(firmInputs));
    } catch (e) {
      console.error("Error writing firmInputs to localStorage", e);
    }
  }, [firmInputs]);

  // Synchronize firmInputs whenever firms prop changes (e.g. when new firms are added)
  useEffect(() => {
    setFirmInputs(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      firms.forEach(f => {
        if (!updated[f.id]) {
          updated[f.id] = {
            employeeCount: f.employeeCount || 10,
            healthAmount: 0,
            extraNote: ''
          };
          hasChanges = true;
        }
      });
      return hasChanges ? updated : prev;
    });
  }, [firms]);

  // Handle inputs changes
  const handleInputChange = (firmId: string, field: 'employeeCount' | 'healthAmount' | 'extraNote', value: any) => {
    setFirmInputs(prev => ({
      ...prev,
      [firmId]: {
        ...prev[firmId],
        [field]: value
      }
    }));
  };

  // Handle downloading template
  const handleDownloadTemplate = (type: 'efatura' | 'earsiv') => {
    const filtered = firms.filter(f => f.invoiceType === type && !f.parentFirmId);
    // Semicolon (;) is standard for Turkish Excel to read properly without raw config
    const headers = ["Firma ID (DOKUNMAYIN)", "Firma Adı", "Fatura Tipi", "Mevcut Limit", "Çalışan Sayısı (GİRİNİZ)", "Ekstra Tutar (GİRİNİZ)"];
    const csvRows = [headers.join(';')];
    
    filtered.forEach(f => {
      const inputs = firmInputs[f.id] || { employeeCount: f.employeeCount || 10, healthAmount: 0, extraNote: '' };
      const limit = f.pricingModel.standartConfig?.baseCount || f.pricingModel.toleransliConfig?.baseCount || 10;
      const row = [
        f.id,
        f.name.replace(/;/g, ' '), // sanitize semicolons
        f.invoiceType === 'efatura' ? 'E-Fatura' : 'E-Arşiv',
        limit,
        inputs.employeeCount,
        inputs.healthAmount
      ];
      csvRows.push(row.join(';'));
    });
    
    const csvContent = "\uFEFF" + csvRows.join('\r\n'); // Add BOM for Turkish characters in Excel!
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${type === 'efatura' ? 'E-Fatura' : 'E-Arsiv'}_Sablonu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to normalize Turkish text for matching firm names
  const normalizeString = (str: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/i̇/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Strip corporate fluff and suffixes for flexible firm matching
  const cleanCorporateFluff = (str: string): string => {
    const norm = normalizeString(str);
    return norm
      .replace(/\b(limited|ltd|ltda|sirketi|sirketin|sirketinin|sirketleri|sirket|sti|stii|anonim|as|sanayi|sanayii|sanayide|san|ticaret|ticareti|tic|holding|insaat|ins|saglik|isg|kurum|kurumu|danismanlik|hizmetleri|hizmet|gida|ve)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper to safely parse numeric employee counts
  const parseNumberVal = (val: any): number | null => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return Math.round(val);
    const str = String(val).trim();
    if (!str) return null;
    const clean = str.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    if (isNaN(parsed)) return null;
    return Math.round(parsed);
  };

  // Helper to find firm by flexible name/ID matching
  const findMatchingFirm = (rawName: string, hazardClass?: string) => {
    if (!rawName) return null;
    const trimmed = rawName.trim();
    const normRaw = normalizeString(trimmed);
    const cleanRaw = cleanCorporateFluff(trimmed);

    // 1. Exact ID or exact name match (with hazard class fallback)
    let candidates = firms.filter(f => f.id === trimmed || f.name.toLowerCase().trim() === trimmed.toLowerCase());
    
    // If hazard class is provided, prioritize match with same hazard class
    if (hazardClass && candidates.length > 0) {
      const hazardMatch = candidates.find(f => f.hazardClass === hazardClass);
      if (hazardMatch) return hazardMatch;
    }
    
    if (candidates.length > 0) return candidates[0];

    // 2. Normalized name match
    candidates = firms.filter(f => normalizeString(f.name) === normRaw);
    if (hazardClass && candidates.length > 0) {
      const hazardMatch = candidates.find(f => f.hazardClass === hazardClass);
      if (hazardMatch) return hazardMatch;
    }
    if (candidates.length > 0) return candidates[0];

    // 3. Clean corporate fluff match
    if (cleanRaw.length >= 2) {
      candidates = firms.filter(f => cleanCorporateFluff(f.name) === cleanRaw);
      if (hazardClass && candidates.length > 0) {
        const hazardMatch = candidates.find(f => f.hazardClass === hazardClass);
        if (hazardMatch) return hazardMatch;
      }
      if (candidates.length > 0) return candidates[0];
    }

    // 4. Token overlap match (e.g. "MAZ MEDİKAL GIDA" vs "MAZ MEDİKAL")
    const rawTokens = cleanRaw.split(' ').filter(t => t.length > 2);
    if (rawTokens.length > 0) {
      matched = firms.find(f => {
        const firmClean = cleanCorporateFluff(f.name);
        const firmTokens = firmClean.split(' ').filter(t => t.length > 2);
        if (firmTokens.length === 0) return false;
        
        // Count matching tokens
        const common = rawTokens.filter(t => firmTokens.includes(t));
        if (common.length >= Math.min(rawTokens.length, firmTokens.length) && common.length > 0) {
          return true;
        }
        return false;
      });
      if (matched) return matched;
    }

    // 5. Substring / Inclusion match
    candidates = firms.filter(f => {
      const normFirm = normalizeString(f.name);
      const cleanFirm = cleanCorporateFluff(f.name);
      
      if (normFirm.length >= 3 && normRaw.length >= 3) {
        if (normFirm.includes(normRaw) || normRaw.includes(normFirm)) return true;
      }
      if (cleanFirm.length >= 2 && cleanRaw.length >= 2) {
        if (cleanFirm.includes(cleanRaw) || cleanRaw.includes(cleanFirm)) return true;
      }
      return false;
    });

    if (hazardClass && candidates.length > 0) {
      const hazardMatch = candidates.find(f => f.hazardClass === hazardClass);
      if (hazardMatch) return hazardMatch;
    }

    return candidates.length > 0 ? candidates[0] : null;
  };

  // Smart line splitter for plain text and CSV input
  const splitTextLineToCells = (line: string): string[] => {
    const trimmed = line.trim();
    if (!trimmed) return [];

    // Delimited splits
    if (trimmed.includes('\t')) return trimmed.split('\t').map(s => s.trim()).filter(Boolean);
    if (trimmed.includes(';')) return trimmed.split(';').map(s => s.trim()).filter(Boolean);
    if (trimmed.includes('|')) return trimmed.split('|').map(s => s.trim()).filter(Boolean);
    
    // Comma split
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // Multi-space split
    if (trimmed.match(/\s{2,}/)) {
      return trimmed.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
    }

    // Header line detection and splitting
    const lower = trimmed.toLowerCase();
    if ((lower.includes('unvan') || lower.includes('isyeri') || lower.includes('firma')) && 
        (lower.includes('calisan') || lower.includes('çalışan') || lower.includes('sayisi') || lower.includes('sayı') || lower.includes('odeme') || lower.includes('ödeme'))) {
      const countIdx = Math.max(
        lower.indexOf('hizmet alan işyeri çalışan sayısı'),
        lower.indexOf('çalışan sayısı'),
        lower.indexOf('calisan sayisi'),
        lower.indexOf('personel sayısı'),
        lower.indexOf('çalışan'),
        lower.indexOf('ödeme türü'),
        lower.indexOf('odeme turu')
      );
      if (countIdx > 0) {
        return [trimmed.slice(0, countIdx).trim(), trimmed.slice(countIdx).trim()];
      }
    }

    // Single line text + trailing number (e.g. "MAZ MEDİKAL GIDA SANAYİ TİCARET LİMİTED ŞİRKETİN 1")
    const matchTrailingNum = trimmed.match(/^(.*?)\s+([0-9.,]+)\s*$/);
    if (matchTrailingNum) {
      return [matchTrailingNum[1].trim(), matchTrailingNum[2].trim()];
    }

    // Leading number (e.g. "1 MAZ MEDİKAL GIDA...")
    const matchLeadingNum = trimmed.match(/^([0-9.,]+)\s+(.*?)$/);
    if (matchLeadingNum) {
      return [matchLeadingNum[2].trim(), matchLeadingNum[1].trim()];
    }

    return [trimmed];
  };

  // Process rows extracted from Excel (.xlsx/.xls) or CSV/TXT
  const processParsedRows = (rows: any[][]) => {
    if (!rows || rows.length === 0) {
      alert("Yüklenen dosyada/veride okunabilir içerik bulunamadı.");
      return;
    }

    const validRows = rows.filter(r => Array.isArray(r) && r.some(cell => String(cell || '').trim() !== ''));
    if (validRows.length === 0) {
      alert("Yüklenen veride geçerli satır bulunamadı.");
      return;
    }

    let headerRowIndex = -1;
    let nameColIndex = -1;
    let countColIndex = -1;
    let healthColIndex = -1;
    let hazardClassColIndex = -1;

    // Scan top 10 rows for header keywords
    for (let r = 0; r < Math.min(validRows.length, 10); r++) {
      const row = validRows[r];

      row.forEach((cell, cIndex) => {
        const cellStr = String(cell || '').toLowerCase().trim();
        if (!cellStr) return;

        // Name column triggers
        if (
          cellStr.includes('unvan') ||
          cellStr.includes('unvani') ||
          cellStr.includes('firma') ||
          cellStr.includes('isyeri') ||
          cellStr.includes('işyeri') ||
          cellStr.includes('müşteri') ||
          cellStr.includes('musteri') ||
          cellStr.includes('cari') ||
          cellStr.includes('şirket') ||
          cellStr.includes('sirket') ||
          cellStr.includes('kurum') ||
          cellStr.includes('ad') ||
          cellStr.includes('name') ||
          cellStr.includes('company')
        ) {
          if (nameColIndex === -1) {
            headerRowIndex = r;
            nameColIndex = cIndex;
          }
        }

        // Employee count column triggers
        if (
          cellStr.includes('çalışan') ||
          cellStr.includes('calisan') ||
          cellStr.includes('personel') ||
          cellStr.includes('sayı') ||
          cellStr.includes('sayisi') ||
          cellStr.includes('kisi') ||
          cellStr.includes('kişi') ||
          cellStr.includes('adet') ||
          cellStr.includes('limit') ||
          cellStr.includes('sigortalı') ||
          cellStr.includes('sigortali') ||
          cellStr.includes('sgk') ||
          cellStr.includes('count') ||
          cellStr.includes('emp')
        ) {
          if (countColIndex === -1 && cIndex !== nameColIndex) {
            headerRowIndex = r;
            countColIndex = cIndex;
          }
        }

        // Optional health/extra amount
        if (
          cellStr.includes('ekstra tutar') ||
          cellStr.includes('sağlık tutarı') ||
          cellStr.includes('saYlk tutar') ||
          cellStr.includes('ek tutar') ||
          cellStr.includes('saglik') ||
          cellStr.includes('tutar')
        ) {
          if (healthColIndex === -1) {
            healthColIndex = cIndex;
          }
        }
        
        // Hazard class
        if (
          cellStr.includes('tehlike sınıfı') ||
          cellStr.includes('tehlike snf') ||
          cellStr.includes('tehlike') ||
          cellStr.includes('hazard')
        ) {
          if (hazardClassColIndex === -1) {
            hazardClassColIndex = cIndex;
          }
        }
      });

      if (nameColIndex !== -1 && countColIndex !== -1) {
        break; // Found header row
      }
    }

    const newInputs = { ...firmInputs };
    const unmatchedAcc: Record<string, { name: string; employeeCount: number; healthAmount?: number }> = {};
    const firmCountAcc: Record<string, number> = {};
    const rowMatchCount: Record<string, number> = {};

    // METHOD A: Match by Column Headers
    if (nameColIndex !== -1 && countColIndex !== -1 && headerRowIndex !== -1) {
      const dataRows = validRows.slice(headerRowIndex + 1);

      dataRows.forEach((row) => {
        if (!Array.isArray(row)) return;

        const rawName = String(row[nameColIndex] || '').trim();
        const rawCountStr = row[countColIndex];
        const rawHazardClass = hazardClassColIndex !== -1 ? String(row[hazardClassColIndex] || '').trim() : undefined;

        if (!rawName) return;

        const parsedCount = parseNumberVal(rawCountStr);
        if (parsedCount === null) return;

        const normRaw = normalizeString(rawName);
        const matchedFirm = findMatchingFirm(rawName, rawHazardClass);

        if (matchedFirm) {
          let healthAmount = newInputs[matchedFirm.id]?.healthAmount || 0;
          if (healthColIndex !== -1 && row[healthColIndex] !== undefined) {
            const hVal = parseNumberVal(row[healthColIndex]);
            if (hVal !== null) healthAmount = hVal;
          }

          const newTotal = parsedCount; // Excel employee count is always right
          firmCountAcc[matchedFirm.id] = newTotal;
          rowMatchCount[matchedFirm.id] = (rowMatchCount[matchedFirm.id] || 0) + 1;

          newInputs[matchedFirm.id] = {
            ...newInputs[matchedFirm.id],
            employeeCount: newTotal,
            healthAmount
          };
        } else {
          let hVal = 0;
          if (healthColIndex !== -1 && row[healthColIndex] !== undefined) {
            hVal = parseNumberVal(row[healthColIndex]) || 0;
          }

          if (!unmatchedAcc[normRaw]) {
            unmatchedAcc[normRaw] = { name: rawName, employeeCount: parsedCount, healthAmount: hVal };
          } else {
            unmatchedAcc[normRaw].employeeCount += parsedCount;
          }
        }
      });
    } else {
      // METHOD B: Automatic Intelligent Column Inference (For headerless files or tab/space-separated text)
      validRows.forEach((row, index) => {
        if (!Array.isArray(row) || row.length === 0) return;

        const lineStr = row.join(' ').toLowerCase();
        // Skip obvious header or metadata lines
        if (index === 0 && (lineStr.includes('firma id') || lineStr.includes('dokunmayin') || lineStr.includes('fatura tipi') || lineStr.includes('unvan') || lineStr.includes('çalışan'))) {
          return;
        }

        let rawName = '';
        let parsedCount: number | null = null;
        let healthVal = 0;

        // Try cell 0 as firm name / ID
        const cell0 = String(row[0] || '').trim();
        if (cell0) {
          const num0 = parseNumberVal(cell0);
          if (num0 === null || firms.some(f => f.id === cell0)) {
            rawName = cell0;
          }
        }

        // Search other cells for numeric employee count
        for (let c = 1; c < row.length; c++) {
          const cellValStr = String(row[c] || '').trim();
          if (!cellValStr) continue;

          const num = parseNumberVal(cellValStr);
          if (num !== null && num >= 0) {
            if (parsedCount === null) {
              parsedCount = num;
            } else {
              healthVal = num;
            }
          } else if (!rawName && cellValStr.length > 2) {
            rawName = cellValStr;
          }
        }

        // Swapped column fallback (cell 0 = number, cell 1 = text)
        if (!rawName && row[1]) {
          rawName = String(row[1]).trim();
          if (cell0) {
            const num0 = parseNumberVal(cell0);
            if (num0 !== null) parsedCount = num0;
          }
        }

        if (!rawName || parsedCount === null) return;

        const normRaw = normalizeString(rawName);
        const matchedFirm = findMatchingFirm(rawName);

        if (matchedFirm) {
          const newTotal = parsedCount; // Excel employee count is always right
          firmCountAcc[matchedFirm.id] = newTotal;
          rowMatchCount[matchedFirm.id] = (rowMatchCount[matchedFirm.id] || 0) + 1;

          newInputs[matchedFirm.id] = {
            ...newInputs[matchedFirm.id],
            employeeCount: newTotal,
            healthAmount: healthVal > 0 ? healthVal : (newInputs[matchedFirm.id]?.healthAmount || 0)
          };
        } else {
          if (!unmatchedAcc[normRaw]) {
            unmatchedAcc[normRaw] = { name: rawName, employeeCount: parsedCount, healthAmount: healthVal };
          } else {
            unmatchedAcc[normRaw].employeeCount += parsedCount;
          }
        }
      });
    }

    const uniqueFirmCount = Object.keys(firmCountAcc).length;
    const unmatchedList = Object.values(unmatchedAcc);

    // Track updated employee counts for the popup modal
    const updatedFirmsList: { firmId: string; firmName: string; oldEmployeeCount: number; newEmployeeCount: number }[] = [];
    Object.keys(firmCountAcc).forEach(firmId => {
      const matchedFirm = firms.find(f => f.id === firmId);
      if (matchedFirm) {
        const oldVal = firmInputs[firmId]?.employeeCount ?? (matchedFirm.employeeCount || 0);
        const newVal = newInputs[firmId].employeeCount;
        if (oldVal !== newVal) {
          updatedFirmsList.push({
            firmId,
            firmName: matchedFirm.name,
            oldEmployeeCount: oldVal,
            newEmployeeCount: newVal
          });
        }
      }
    });

    if (uniqueFirmCount > 0 || unmatchedList.length > 0) {
      if (uniqueFirmCount > 0) {
        setFirmInputs(newInputs);
      }

      if (updatedFirmsList.length > 0) {
        setUpdatedEmployeesQueue(updatedFirmsList);
        setShowUpdatedEmployeesModal(true);
      }

      if (unmatchedList.length > 0) {
        setUnmatchedQueue(unmatchedList);
        setCurrentUnmatchedIndex(0);
        loadMissingFirmToForm(unmatchedList[0]);
        // If no updated employee modal is showing, show unmatched modal directly
        if (updatedFirmsList.length === 0) {
          setShowAddMissingFirmModal(true);
        }
      } else if (updatedFirmsList.length === 0) {
        const totalRowsMatched = Object.values(rowMatchCount).reduce((a, b) => a + b, 0);
        alert(`✅ Veri Eşleştirme Başarılı!\n\nToplam ${uniqueFirmCount} firmanın (${totalRowsMatched} satır) çalışan sayıları toplanarak güncellendi.`);
      }
    } else {
      alert("⚠️ Yüklenen veya yapıştırılan veride eşleşen firma/çalışan sayısı algılanamadı.\n\nLütfen listenizde Firma Adı ve Çalışan Sayısı sütunlarının bulunduğundan emin olun.");
    }
  };

  // Handle direct file upload (.xlsx, .xls, .csv, .txt)
  const handleExcelFileUpload = (file: File) => {
    const isBinaryExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;

        let rows: any[][] = [];

        if (isBinaryExcel) {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        } else {
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          rows = lines.map(line => splitTextLineToCells(line));
        }

        processParsedRows(rows);
      } catch (err) {
        console.error("Excel import error:", err);
        alert("Excel dosyası işlenirken hata oluştu. Lütfen dosya biçimini kontrol edin.");
      }
    };

    if (isBinaryExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'utf-8');
    }
  };

  // Handle parsing copy-pasted text
  const parseUploadedText = (text: string) => {
    if (!text || !text.trim()) {
      alert("Lütfen kopyaladığınız Excel verisini kutucuğa yapıştırın.");
      return;
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return;

    const rows = lines.map(line => splitTextLineToCells(line));
    processParsedRows(rows);
  };

  // Process health rows extracted from Excel/CSV (Filtering for Ödeme Türü = Fatura)
  const processParsedHealthRows = (rows: any[][]) => {
    if (!rows || rows.length === 0) {
      alert("Yüklenen dosyada okunabilir sağlık verisi bulunamadı.");
      return;
    }

    let headerRowIndex = -1;
    let nameColIndex = -1;
    let paymentTypeColIndex = -1;
    let amountColIndex = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      row.forEach((cell, cIndex) => {
        const cellStr = String(cell || '').toLowerCase().trim();
        if (!cellStr) return;

        if (
          cellStr.includes('hizmet alan işyeri unvanı') ||
          cellStr.includes('hizmet alan isyeri unvani') ||
          cellStr.includes('işyeri unvanı') ||
          cellStr.includes('isyeri unvani') ||
          cellStr.includes('firma unvanı') ||
          cellStr.includes('firma unvani') ||
          cellStr.includes('unvan') ||
          cellStr.includes('firma adı') ||
          cellStr.includes('firma adi') ||
          cellStr.includes('müşteri')
        ) {
          if (nameColIndex === -1) {
            headerRowIndex = r;
            nameColIndex = cIndex;
          }
        }

        if (
          cellStr.includes('ödeme türü') ||
          cellStr.includes('odeme turu') ||
          cellStr.includes('ödeme tipi') ||
          cellStr.includes('odeme tipi') ||
          cellStr.includes('ödeme şekli') ||
          cellStr.includes('odeme sekli') ||
          cellStr.includes('fatura tipi') ||
          cellStr.includes('ödeme') ||
          cellStr.includes('odeme')
        ) {
          if (paymentTypeColIndex === -1) {
            headerRowIndex = r;
            paymentTypeColIndex = cIndex;
          }
        }

        if (
          cellStr.includes('sağlık tutarı') ||
          cellStr.includes('saglik tutari') ||
          cellStr.includes('sağlık hizmeti tutarı') ||
          cellStr.includes('tutar') ||
          cellStr.includes('ücret') ||
          cellStr.includes('fiyat') ||
          cellStr.includes('toplam tutar') ||
          cellStr.includes('sağlık') ||
          cellStr.includes('saglik')
        ) {
          if (amountColIndex === -1) {
            headerRowIndex = r;
            amountColIndex = cIndex;
          }
        }
      });

      if (nameColIndex !== -1 && (paymentTypeColIndex !== -1 || amountColIndex !== -1)) {
        break;
      }
    }

    if (nameColIndex === -1) nameColIndex = 0;
    if (paymentTypeColIndex === -1) paymentTypeColIndex = 1;
    if (amountColIndex === -1) amountColIndex = 2;
    if (headerRowIndex === -1) headerRowIndex = 0;

    const dataRows = rows.slice(headerRowIndex + 1);
    const healthAcc: Record<string, number> = {};

    let totalScanned = 0;
    let matchedInvoiceRows = 0;
    let skippedNonInvoiceRows = 0;
    const unmatchedItemsAcc: Record<string, number> = {};

    dataRows.forEach((row) => {
      if (!Array.isArray(row) || row.length === 0) return;

      const rawName = String(row[nameColIndex] || '').trim();
      const rawPaymentType = String(row[paymentTypeColIndex] || '').toLowerCase().trim();
      const rawAmountStr = String(row[amountColIndex] || '').trim();

      if (!rawName) return;
      totalScanned++;

      // Filter: Payment type MUST contain 'fatura'
      const isInvoicePayment = rawPaymentType.includes('fatura') || rawPaymentType === '' || rawPaymentType === 'efatura' || rawPaymentType === 'e-fatura';

      if (!isInvoicePayment) {
        skippedNonInvoiceRows++;
        return;
      }

      const cleanAmtStr = rawAmountStr.replace(/[^0-9.,]/g, '').replace(',', '.');
      const parsedAmount = parseFloat(cleanAmtStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return;

      matchedInvoiceRows++;

      const matchedFirm = findMatchingFirm(rawName);

      if (matchedFirm) {
        healthAcc[matchedFirm.id] = (healthAcc[matchedFirm.id] || 0) + parsedAmount;
      } else {
        unmatchedItemsAcc[rawName] = (unmatchedItemsAcc[rawName] || 0) + parsedAmount;
      }
    });

    const uniqueFirmsUpdated = Object.keys(healthAcc).length;
    const unmatchedList = Object.entries(unmatchedItemsAcc).map(([rawName, amount]) => ({ rawName, amount }));

    if (uniqueFirmsUpdated > 0) {
      const newInputs = { ...firmInputs };
      let totalHealthSum = 0;

      Object.entries(healthAcc).forEach(([firmId, sumAmt]) => {
        totalHealthSum += sumAmt;
        newInputs[firmId] = {
          ...newInputs[firmId],
          healthAmount: sumAmt
        };
      });

      setFirmInputs(newInputs);

      let msg = `✅ OLUMLU BİLDİRİM: SAĞLIK VERİLERİ SÜZÜLDÜ VE EŞLEŞTİRİLDİ!\n\n` +
        `• Okunan Satır: ${totalScanned}\n` +
        `• Ödeme Türü 'FATURA' Olan Satırlar: ${matchedInvoiceRows}\n` +
        `• Atlanan Satırlar (Nakit/Kart vb.): ${skippedNonInvoiceRows}\n` +
        `• Güncellenen Firma Sayısı: ${uniqueFirmsUpdated}\n` +
        `• Toplam Aktarılan Sağlık Tutarı: ${formatLira(totalHealthSum)}`;

      if (unmatchedList.length > 0) {
        msg += `\n\nℹ️ Eşleşmeyen ${unmatchedList.length} firma bulundu. Açılan eşleştirme penceresinden bunları seçip mevcut firmalara atayabilirsiniz.`;
      }

      alert(msg);
    } else if (unmatchedList.length === 0) {
      alert(`⚠️ OLUMSUZ BİLDİRİM: 'Ödeme Türü = FATURA' olan geçerli bir sağlık kaydı bulunamadı.\n\nOkunan ${totalScanned} satırdan ${skippedNonInvoiceRows} tanesi Ödeme Türü 'fatura' olmadığı için elendi.`);
    }

    if (unmatchedList.length > 0) {
      setHealthUnmatchedQueue(unmatchedList);
      setCurrentHealthUnmatchedIndex(0);
      const firstUnmatched = unmatchedList[0];
      setNewHealthFirmName(firstUnmatched.rawName);
      setSelectedMatchFirmId(sortedFirms[0]?.id || '');
      setHealthMatchAction('existing');
      setHealthFirmSearchTerm('');
      setShowHealthMappingModal(true);
    }
  };

  const handleHealthFileUpload = (file: File) => {
    const isBinaryExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;

        let rows: any[][] = [];

        if (isBinaryExcel) {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        } else {
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          rows = lines.map(line => splitTextLineToCells(line));
        }

        processParsedHealthRows(rows);
      } catch (err) {
        console.error("Health file import error:", err);
        alert("❌ OLUMSUZ BİLDİRİM: Sağlık verisi dosyası işlenirken hata oluştu.");
      }
    };

    if (isBinaryExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'utf-8');
    }
  };

  const parseHealthPastedText = (text: string) => {
    if (!text || !text.trim()) {
      alert("❌ OLUMSUZ BİLDİRİM: Lütfen kopyaladığınız sağlık verilerini kutucuğa yapıştırın.");
      return;
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return;

    const rows = lines.map(line => splitTextLineToCells(line));
    processParsedHealthRows(rows);
  };

  const handleSyncFromVpsApi = async () => {
    setIsSyncingApi(true);
    try {
      let baseUrl = vpsServerUrl || '/api/health-sync/latest';
      if (baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost')) {
        baseUrl = '/api/health-sync/latest';
      }

      // Append cache buster to prevent browser HTTP caching
      const cacheBuster = `_t=${Date.now()}`;
      const targetUrl = baseUrl.includes('?') ? `${baseUrl}&${cacheBuster}` : `${baseUrl}?${cacheBuster}`;

      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      if (vpsApiKey) {
        headers['Authorization'] = `Bearer ${vpsApiKey}`;
      }

      let res;
      try {
        res = await fetch(targetUrl, { headers, cache: 'no-store' });
      } catch (e) {
        if (baseUrl !== '/api/health-sync/latest') {
          const fallbackUrl = `/api/health-sync/latest?${cacheBuster}`;
          res = await fetch(fallbackUrl, { headers, cache: 'no-store' });
        } else {
          throw e;
        }
      }

      if (!res.ok) {
        alert(`❌ OLUMSUZ BİLDİRİM: Sağlık RSS / Feed sunucusundan yanıt alınamadı! (HTTP ${res.status})\n\nLütfen Ayarlar sayfasındaki Feed Endpoint URL ve Bearer Token bilgilerini kontrol edin.`);
        return;
      }

      const data = await res.json();

      if (data.success && data.totals) {
        const totals: Record<string, number> = data.totals;
        const totalKeys = Object.keys(totals);

        if (totalKeys.length === 0) {
          alert("ℹ️ BİLDİRİM: RSS / JSON Besleme sunucusunda henüz yayınlanan güncel sağlık verisi bulunmuyor.\n\nSağlık otomasyonunuzda 'paymentType: fatura' olarak yeni veri oluştuktan sonra tekrar çekebilirsiniz.");
          return;
        }

        const newInputs = { ...firmInputs };
        let updatedCount = 0;
        let totalSum = 0;
        const unmatchedList: { rawName: string; amount: number }[] = [];

        totalKeys.forEach((rawName) => {
          const amt = totals[rawName];
          if (!amt || amt <= 0) return;

          const matchedFirm = findMatchingFirm(rawName);

          if (matchedFirm) {
            newInputs[matchedFirm.id] = {
              ...newInputs[matchedFirm.id],
              healthAmount: (newInputs[matchedFirm.id]?.healthAmount || 0) + amt
            };
            updatedCount++;
            totalSum += amt;
          } else {
            unmatchedList.push({ rawName, amount: amt });
          }
        });

        if (updatedCount > 0) {
          setFirmInputs(newInputs);
        }

        if (unmatchedList.length > 0) {
          setHealthUnmatchedQueue(unmatchedList);
          setCurrentHealthUnmatchedIndex(0);
          const firstUnmatched = unmatchedList[0];
          setNewHealthFirmName(firstUnmatched.rawName);
          setSelectedMatchFirmId(sortedFirms[0]?.id || '');
          setHealthMatchAction('existing');
          setHealthFirmSearchTerm('');
          setShowHealthMappingModal(true);

          if (updatedCount > 0) {
            alert(`✅ OLUMLU BİLDİRİM: CANLI SAĞLIK BESLEMESİ ALINDI!\n\n• ${updatedCount} firmanın sağlık verisi eşleştirilerek ${formatLira(totalSum)} aktarıldı.\n• Eşleşmeyen ${unmatchedList.length} firma bulundu. Açılan pencereden bunları mevcut firmalarınızla kolayca eşleştirebilirsiniz.`);
          } else {
            alert(`ℹ️ BİLDİRİM: Canlı Sağlık Verileri Alındı!\n\nGelen ${unmatchedList.length} firma ismi cari listenizdekilerle tam eşleşmedi. Açılan pencereden firmaları eşleştirebilir veya yeni cari ekleyebilirsiniz.`);
          }
        } else if (updatedCount > 0) {
          alert(`✅ OLUMLU BİLDİRİM: CANLI SAĞLIK VERİLERİ BAŞARIYLA ÇEKİLDİ!\n\n${updatedCount} firmanın sağlık hizmeti tutarları canlı beslemeden çekilerek fatura tablonuza aktarıldı.\n\nToplam Aktarılan Tutar: ${formatLira(totalSum)}`);
        } else {
          alert("⚠️ OLUMSUZ BİLDİRİM: Besleme sunucusundan gelen verilerdeki tutarlar 0 TL olduğu için aktarılamadı.");
        }
      } else {
        alert(`❌ OLUMSUZ BİLDİRİM: Besleme servisinden veriler alınamadı.\n\nSunucu Yanıtı: ${data.error || 'Geçersiz veri biçimi'}`);
      }
    } catch (err) {
      console.error("API sync error:", err);
      alert("❌ OLUMSUZ BİLDİRİM: Canlı Sağlık Beslemesine Bağlanılamadı!\n\nLütfen internet bağlantınızı ve Ayarlar sayfasındaki RSS / Feed adresi ile API anahtarını doğrulayın.");
    } finally {
      setIsSyncingApi(false);
    }
  };

  // Sort alphabetically
  const sortedFirms = useMemo(() => {
    return [...firms].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [firms]);

  // Handle confirming health firm match (either existing firm or creating new firm)
  const handleConfirmHealthMatch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (currentHealthUnmatchedIndex < 0 || currentHealthUnmatchedIndex >= healthUnmatchedQueue.length) {
      setShowHealthMappingModal(false);
      return;
    }

    const currentItem = healthUnmatchedQueue[currentHealthUnmatchedIndex];

    if (healthMatchAction === 'existing') {
      const firmToAssignId = selectedMatchFirmId || sortedFirms[0]?.id;
      if (!firmToAssignId) {
        alert("Lütfen eşleştirmek istediğiniz mevcut bir firmayı seçin.");
        return;
      }

      setFirmInputs(prev => ({
        ...prev,
        [firmToAssignId]: {
          ...prev[firmToAssignId],
          healthAmount: (prev[firmToAssignId]?.healthAmount || 0) + currentItem.amount
        }
      }));
    } else {
      // Create new firm
      const firmName = newHealthFirmName.trim() || currentItem.rawName;
      if (!firmName) {
        alert("Lütfen geçerli bir firma unvanı girin.");
        return;
      }

      const newFirmObj: Firm = {
        id: `firm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: firmName,
        invoiceType: newHealthFirmInvoiceType,
        groupName: newHealthFirmGroup || 'Genel',
        isVatIncluded: false,
        taxNumber: '',
        address: '',
        serviceType: 'both',
        pricingModel: {
          type: 'standart',
          standartConfig: {
            baseCount: 10,
            baseFee: 1000,
            extraPerPerson: 50
          }
        }
      };

      onAddFirm(newFirmObj);

      setFirmInputs(prev => ({
        ...prev,
        [newFirmObj.id]: {
          employeeCount: 10,
          healthAmount: currentItem.amount
        }
      }));
    }

    // Move to next item in queue or close modal
    const nextIdx = currentHealthUnmatchedIndex + 1;
    if (nextIdx < healthUnmatchedQueue.length) {
      setCurrentHealthUnmatchedIndex(nextIdx);
      const nextItem = healthUnmatchedQueue[nextIdx];
      setNewHealthFirmName(nextItem.rawName);
      setSelectedMatchFirmId(sortedFirms[0]?.id || '');
      setHealthMatchAction('existing');
      setHealthFirmSearchTerm('');
    } else {
      setShowHealthMappingModal(false);
      setCurrentHealthUnmatchedIndex(-1);
      setHealthUnmatchedQueue([]);
      alert("✅ OLUMLU BİLDİRİM: Tüm eşleşmeyen sağlık verileri ve firma atamaları başarıyla tamamlandı!");
    }
  };

  const handleSkipHealthMatch = () => {
    const nextIdx = currentHealthUnmatchedIndex + 1;
    if (nextIdx < healthUnmatchedQueue.length) {
      setCurrentHealthUnmatchedIndex(nextIdx);
      const nextItem = healthUnmatchedQueue[nextIdx];
      setNewHealthFirmName(nextItem.rawName);
      setSelectedMatchFirmId(sortedFirms[0]?.id || '');
      setHealthMatchAction('existing');
      setHealthFirmSearchTerm('');
    } else {
      setShowHealthMappingModal(false);
      setCurrentHealthUnmatchedIndex(-1);
      setHealthUnmatchedQueue([]);
    }
  };

  // Compute available groups for the active Tab (e-Fatura / e-Arşiv / Tümü)
  const availableGroups = useMemo(() => {
    const firmList = sortedFirms.filter(f => activeTab === 'all' || f.invoiceType === activeTab);
    const grps = new Set<string>();
    firmList.forEach(f => {
      grps.add(f.groupName || 'Genel');
    });
    customCreatedGroups.forEach(g => {
      if (g && g.trim()) grps.add(g.trim());
    });
    return Array.from(grps).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [sortedFirms, activeTab, customCreatedGroups]);

  // Apply Search, Invoice Type & Group Filter
  const filteredFirms = useMemo(() => {
    return sortedFirms.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = activeTab === 'all' || f.invoiceType === activeTab;
      const firmGrp = f.groupName || 'Genel';
      const matchesGroup = selectedGroup === 'all' || firmGrp === selectedGroup;
      return matchesSearch && matchesType && matchesGroup;
    });
  }, [sortedFirms, searchTerm, activeTab, selectedGroup]);

  // Handler to bulk invoice all firms in the selected group / active list
  const handleBatchInvoiceGroup = () => {
    if (filteredFirms.length === 0) {
      alert("Faturalaştırılacak firma bulunamadı.");
      return;
    }

    const grpLabel = selectedGroup === 'all' 
      ? (activeTab === 'all' ? 'Tüm Mükellefler' : activeTab === 'efatura' ? 'Tüm e-Fatura Mükellefleri' : 'Tüm e-Arşiv Mükellefleri') 
      : `"${selectedGroup}" Grubu`;

    if (!confirm(`⚡ ${grpLabel} altındaki ${filteredFirms.length} firma için fatura taslağı oluşturulup Kesilecek Faturalar listesine aktarılsın mı?`)) {
      return;
    }

    let successCount = 0;
    let totalAmount = 0;

    filteredFirms.forEach(f => {
      const inputs = firmInputs[f.id] || { employeeCount: 10, healthAmount: 0, extraNote: '' };
      const calc = calculateInvoiceFee(
        f, 
        inputs.employeeCount, 
        inputs.healthAmount, 
        vatRate,
        vatRateExpert,
        vatRateDoctor,
        vatRateHealth,
        firms,
        firmInputs
      );

      const draftInvoice: Partial<Invoice> = {
        firmId: f.id,
        firmName: f.name,
        invoiceType: f.invoiceType,
        employeeCount: inputs.employeeCount,
 baseAmount: calc.baseAmount,
        healthAmount: inputs.healthAmount,
        totalAmount: calc.totalAmount,
        isVatIncluded: f.isVatIncluded,
        specialistFee: calc.specialistFee,
        doctorFee: calc.doctorFee,
        vatRate: vatRate,
        vatAmount: calc.vatAmount,
        status: 'pending_approval',
        isApproved: false
      };

      onSendToIssue(draftInvoice);
      successCount++;
      totalAmount += calc.totalAmount;
    });

    alert(`✅ ${successCount} firmanın faturası başarıyla Kesilecek Faturalar sayfasına aktarıldı!\n\nToplam Fatura Tutarı: ${formatLira(totalAmount)}`);
  };

  // Handler for sending to invoices page
  const handleSend = (firm: Firm) => {
    const inputs = firmInputs[firm.id] || { employeeCount: 10, healthAmount: 0, extraNote: '' };
    
    // Recalculate fee to pass complete invoice properties
    const calc = calculateInvoiceFee(
      firm, 
      inputs.employeeCount, 
      inputs.healthAmount, 
      vatRate,
      vatRateExpert,
      vatRateDoctor,
      vatRateHealth,
      firms,
      firmInputs
    );

    const draftInvoice: Partial<Invoice> = {
      firmId: firm.id,
      firmName: firm.name,
      invoiceType: firm.invoiceType,
      employeeCount: inputs.employeeCount,
      baseAmount: calc.baseAmount,
      healthAmount: inputs.healthAmount,
      totalAmount: calc.totalAmount,
      isVatIncluded: firm.isVatIncluded,
      specialistFee: calc.specialistFee,
      doctorFee: calc.doctorFee,
      vatRate: vatRate,
      vatAmount: calc.vatAmount,
      status: 'pending_approval', // Draft to be approved in Kesilecek Faturalar
      isApproved: false
    };

    onSendToIssue(draftInvoice);
    alert(`${firm.name} faturası "Kesilecek Faturalar" listesine gönderildi.`);
  };

  return (
    <div className="space-y-6" id="invoice-prep-container">
      {/* Consolidated Fatura Parametreleri Section (Açılır - Kapanır) */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-neutral-800 shadow-xs overflow-hidden" id="invoice-parameters-card">
        {/* Header - Clickable for open / close */}
        <div 
          onClick={() => setIsParamsOpen(prev => !prev)}
          className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-900/40 transition-colors select-none"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="h-5 w-5 text-indigo-400 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Fatura Parametreleri
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isParamsOpen 
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}>
                  {isParamsOpen ? 'Açık' : 'Kapanmış (Tıklayıp Açın)'}
                </span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsParamsOpen(prev => !prev);
            }}
            className="p-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            {isParamsOpen ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
          </button>
        </div>

        {/* Collapsible Content Body */}
        {isParamsOpen && (
          <div className="p-4 sm:p-6 border-t border-neutral-800/80 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Search box */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Firma Ara</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Firma Unvanı ile Ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full text-xs border border-neutral-800 rounded-xl bg-neutral-900 focus:outline-hidden focus:border-indigo-500 font-medium text-white"
                  />
                </div>
              </div>

              {/* Invoice type tabs */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Mükellef Türü</label>
                <div className="flex border border-neutral-800 bg-neutral-900 p-1 rounded-xl">
                  <button
                    onClick={() => {
                      setActiveTab('all');
                      setSelectedGroup('all');
                    }}
                    className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      activeTab === 'all' 
                        ? 'bg-neutral-800 text-indigo-400 shadow-xs' 
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Tümü ({sortedFirms.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('efatura');
                      setSelectedGroup('all');
                    }}
                    className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      activeTab === 'efatura' 
                        ? 'bg-neutral-800 text-indigo-400 shadow-xs' 
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    e-Fatura ({sortedFirms.filter(f => f.invoiceType === 'efatura').length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('earsiv');
                      setSelectedGroup('all');
                    }}
                    className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      activeTab === 'earsiv' 
                        ? 'bg-neutral-800 text-indigo-400 shadow-xs' 
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    e-Arşiv ({sortedFirms.filter(f => f.invoiceType === 'earsiv').length})
                  </button>
                </div>
              </div>
            </div>

            {/* Firma Gurupları Yan Yana Seçenek Butonları & Hepsini Faturalaştır Butonu */}
            <div className="pt-4 border-t border-neutral-850 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    📁 Firma Grupları
                  </span>
                  <p className="text-[10px] text-neutral-400">
                    {activeTab === 'all' ? 'Tüm' : activeTab === 'efatura' ? 'e-Fatura' : 'e-Arşiv'} mükellefleri altındaki guruplar
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSyncFromVpsApi}
                    disabled={isSyncingApi}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-950/40 cursor-pointer shrink-0"
                    title="Otomasyondan gelen sağlık tetkik verilerini çek, eşleşen firmalara yaz ve eşleşmeyenleri sor"
                  >
                    <Activity className={`h-3.5 w-3.5 text-teal-300 ${isSyncingApi ? 'animate-spin' : ''}`} />
                    {isSyncingApi ? 'İşleniyor...' : 'Sağlık Tetkiki'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmployeeImportModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                    title="Excel yükleyerek veya yapıştırarak çalışan sayılarını aktarın"
                  >
                    <Users className="h-3.5 w-3.5 text-emerald-400" />
                    Çalışan Sayıları
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchInvoiceGroup}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/40 cursor-pointer shrink-0"
                  >
                    ⚡ {selectedGroup === 'all' ? 'Tüm Gösterilenleri Faturalaştır' : `"${selectedGroup}" Grubunu Faturalaştır`} ({filteredFirms.length})
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setSelectedGroup('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedGroup === 'all'
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-xs'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  Tüm Gruplar ({sortedFirms.filter(f => activeTab === 'all' || f.invoiceType === activeTab).length})
                </button>

                {availableGroups.map(grp => {
                  const countInGrp = sortedFirms.filter(f => (activeTab === 'all' || f.invoiceType === activeTab) && (f.groupName || 'Genel') === grp).length;
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setSelectedGroup(grp)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        selectedGroup === grp
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                      }`}
                    >
                      {grp} <span className="opacity-75 text-[10px] font-mono font-bold">({countInGrp})</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    const newGrp = prompt("Yeni Oluşturulacak Grup Adını Girin:");
                    if (newGrp && newGrp.trim()) {
                      const trimmed = newGrp.trim();
                      if (!customCreatedGroups.includes(trimmed)) {
                        setCustomCreatedGroups(prev => [...prev, trimmed]);
                      }
                      setSelectedGroup(trimmed);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  + Yeni Grup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Firma Listesi (Company List) under parameters */}
      <div className="space-y-3" id="firm-list-under-parameters">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-indigo-400" />
            Firma Listesi
          </h2>
          <span className="text-[11px] text-neutral-400 font-semibold bg-[#0a0a0a] px-3 py-1.5 rounded-xl border border-neutral-800">
            Gösterilen: <strong className="text-white font-bold">{filteredFirms.length}</strong> Firma
          </span>
        </div>

        <div className="bg-[#111111] rounded-2xl border border-neutral-800 shadow-xs overflow-hidden" id="prep-table-wrapper">
          <div className="overflow-x-auto text-neutral-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950/40 border-b border-neutral-800">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-neutral-500 tracking-wider">Firma Unvanı</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase text-neutral-500 tracking-wider">Fatura Tipi</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase text-neutral-500 tracking-wider">Çalışan Sayısı</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase text-neutral-500 tracking-wider">Ekstra / Sağlık Ücreti</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase text-neutral-500 tracking-wider text-right">Hesaplanan Tutar</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-neutral-500 tracking-wider text-center">Fatura Emri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredFirms.length > 0 ? (
                  filteredFirms.map((f) => {
                    const inputs = firmInputs[f.id] || { employeeCount: 10, healthAmount: 0, extraNote: '' };
                    
                    // Live dynamic calculation for displays
                    const calcResult = calculateInvoiceFee(
                      f, 
                      inputs.employeeCount, 
                      inputs.healthAmount, 
                      vatRate,
                      vatRateExpert,
                      vatRateDoctor,
                      vatRateHealth,
                      firms,
                      firmInputs
                    );

                    const isBranch = !!f.parentFirmId;
                    const parentFirm = isBranch ? firms.find(p => p.id === f.parentFirmId) : null;
                    
                    const childFirms = firms.filter(c => c.parentFirmId === f.id);
                    const hasChildren = childFirms.length > 0;

                    return (
                      <tr key={f.id} className={`hover:bg-neutral-900/30 transition-colors ${isBranch ? 'opacity-70 bg-neutral-950/20' : ''}`}>
                        {/* Company name & model details */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white text-sm flex items-center gap-2">
                            {f.name}
                            {isBranch && (
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                Şube
                              </span>
                            )}
                            {hasChildren && (
                              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                Havuz / Merkez
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 items-center mt-1 text-[10px] text-neutral-500 font-semibold">
                            <span className="bg-neutral-850 px-1.5 py-0.5 rounded text-neutral-400 capitalize border border-neutral-800">
                              Model: {f.pricingModel.type === 'standart' ? 'Standart' : f.pricingModel.type === 'toleransli' ? 'Toleranslı' : f.pricingModel.type === 'kademeli' ? 'Kademeli' : 'Yıllık'}
                            </span>
                            <span>{f.isVatIncluded ? 'KDV Dahil' : 'KDV Hariç'}</span>
                            {isBranch && parentFirm && (
                              <span className="text-amber-500/80">→ {parentFirm.name}</span>
                            )}
                            {hasChildren && (
                              <span className="text-indigo-400/80">({childFirms.length} Şube bağlı)</span>
                            )}
                          </div>
                        </td>

                        {/* Invoice type */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border ${
                            f.invoiceType === 'efatura'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {f.invoiceType === 'efatura' ? 'e-Fatura' : 'e-Arşiv'}
                          </span>
                        </td>

                        {/* Employee count input */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 max-w-[120px]">
                            <Users className="h-3.5 w-3.5 text-neutral-500" />
                            <input
                              type="number"
                              min="1"
                              value={inputs.employeeCount}
                              onChange={(e) => handleInputChange(f.id, 'employeeCount', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-neutral-900 border border-neutral-800 rounded-lg text-center text-white focus:outline-hidden focus:border-indigo-500"
                              disabled={f.pricingModel.type === 'yillik'} // Annual model is unaffected by count
                            />
                          </div>
                        </td>

                        {/* Extra health data input */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 max-w-[120px]">
                            <span className="text-xs text-neutral-500 font-semibold">₺</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={inputs.healthAmount || ''}
                              onChange={(e) => handleInputChange(f.id, 'healthAmount', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-right font-medium text-white focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>
                        </td>

                        {/* Total calculated amount */}
                        <td className="px-4 py-4 text-right">
                          {isBranch ? (
                            <div className="text-xs text-amber-500 font-bold bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/10 inline-block">
                              Merkeze Devredildi
                            </div>
                          ) : (
                            <>
                              <div className="font-bold text-white text-sm">
                                {formatLira(calcResult.totalAmount)}
                              </div>
                              <div className="text-[10px] text-neutral-500 mt-0.5">
                                {f.isVatIncluded 
                                  ? `KDV Dahil (Net: ${formatLira(calcResult.subTotal - calcResult.vatAmount)})` 
                                  : `Net: ${formatLira(calcResult.subTotal)} + KDV`
                                }
                              </div>
                            </>
                          )}
                        </td>

                        {/* Send to queues */}
                        <td className="px-6 py-4 text-center">
                          {isBranch ? (
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                              Otomatik Konsolide
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSend(f)}
                              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-550 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm shadow-indigo-650/10 cursor-pointer"
                            >
                              <Send className="h-3 w-3" />
                              Gönder
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 text-xs">
                      Aranan kriterlere uygun veya bu grupta firma bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* Sağlık Verisi Firma Eşleştirme Modalı */}
      {showHealthMappingModal && currentHealthUnmatchedIndex >= 0 && currentHealthUnmatchedIndex < healthUnmatchedQueue.length && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0f0f11] border border-teal-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
                  <Rss className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Sağlık Verisi Firma Eşleştirme
                    <span className="text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 rounded-full font-bold">
                      {currentHealthUnmatchedIndex + 1} / {healthUnmatchedQueue.length}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Gelen sağlık verisindeki firma mevcut cari listenizle otomatik eşleşmedi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSkipHealthMatch}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Kapat / Atla"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Item Card */}
            <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">
                  Gelen Sağlık Verisi Kaydı
                </span>
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-mono">
                  {formatLira(healthUnmatchedQueue[currentHealthUnmatchedIndex].amount)}
                </span>
              </div>
              <div className="text-sm font-bold text-white break-words">
                "{healthUnmatchedQueue[currentHealthUnmatchedIndex].rawName}"
              </div>
            </div>

            {/* Action Mode Toggle Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
              <button
                type="button"
                onClick={() => setHealthMatchAction('existing')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  healthMatchAction === 'existing'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Users className="h-4 w-4" />
                Mevcut Firma İle Eşleştir
              </button>
              <button
                type="button"
                onClick={() => setHealthMatchAction('new')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  healthMatchAction === 'new'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Plus className="h-4 w-4" />
                Yeni Cari Olarak Ekle
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmHealthMatch} className="space-y-4">
              {healthMatchAction === 'existing' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Mevcut Cari Firmayı Seçin *</label>
                    
                    {/* Search inside firms */}
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="Firma Ara..."
                        value={healthFirmSearchTerm}
                        onChange={(e) => setHealthFirmSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <select
                      value={selectedMatchFirmId}
                      onChange={(e) => setSelectedMatchFirmId(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer font-medium"
                      required
                    >
                      {sortedFirms
                        .filter(f => f.name.toLowerCase().includes(healthFirmSearchTerm.toLowerCase()))
                        .map(firm => (
                          <option key={firm.id} value={firm.id}>
                            {firm.name} ({firm.groupName || 'Genel'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <p className="text-[11px] text-neutral-400 leading-relaxed bg-teal-500/5 border border-teal-500/10 p-2.5 rounded-xl">
                    💡 Seçtiğiniz firmanın sağlık tutarına <strong className="text-emerald-400">{formatLira(healthUnmatchedQueue[currentHealthUnmatchedIndex].amount)}</strong> otomatik olarak eklenecektir.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Yeni Firma Unvanı *</label>
                    <input
                      type="text"
                      required
                      value={newHealthFirmName}
                      onChange={(e) => setNewHealthFirmName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Fatura Tipi</label>
                      <select
                        value={newHealthFirmInvoiceType}
                        onChange={(e) => setNewHealthFirmInvoiceType(e.target.value as 'efatura' | 'earsiv')}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="efatura">E-Fatura</option>
                        <option value="earsiv">E-Arşiv</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Firma Grubu</label>
                      <select
                        value={newHealthFirmGroup}
                        onChange={(e) => setNewHealthFirmGroup(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                      >
                        {availableGroups.map(grp => (
                          <option key={grp} value={grp}>{grp}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={handleSkipHealthMatch}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Pas Geç / Atla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-teal-900/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Eşleştirmeyi Kaydet ve İlerle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Missing Firm Modal / Popup */}
      {showAddMissingFirmModal && currentUnmatchedIndex >= 0 && currentUnmatchedIndex < unmatchedQueue.length && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f0f11] border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Firma Kayıt Sekmesi
                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                      {currentUnmatchedIndex + 1} / {unmatchedQueue.length}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Excel dosyasında tespit edilen firmayı cari listenize ekleyin.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSkipMissingFirm}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Prompt Notice */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 leading-relaxed">
              <strong className="text-amber-300">"{unmatchedQueue[currentUnmatchedIndex].name}"</strong> firması cari kayıtlarınızda bulunamadı. Bu firmayı yeni cari olarak eklemek ister misiniz? Detayları kontrol edip <strong>"Evet, Firmayı Kaydet"</strong> butonuna basabilirsiniz.
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveMissingFirm} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Firma Unvanı / Adı *</label>
                <input
                  type="text"
                  required
                  value={missingFirmName}
                  onChange={(e) => setMissingFirmName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Fatura Tipi</label>
                  <select
                    value={missingInvoiceType}
                    onChange={(e) => setMissingInvoiceType(e.target.value as 'efatura' | 'earsiv')}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="efatura">E-Fatura</option>
                    <option value="earsiv">E-Arşiv</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Firma Grubu</label>
                  {isMissingCustomGroup ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Yeni Grup Adı..."
                        value={missingCustomGroupInput}
                        onChange={(e) => setMissingCustomGroupInput(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsMissingCustomGroup(false)}
                        className="px-2 text-[10px] bg-neutral-800 text-neutral-300 rounded-lg shrink-0"
                      >
                        İptal
                      </button>
                    </div>
                  ) : (
                    <select
                      value={missingGroupName}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsMissingCustomGroup(true);
                          setMissingCustomGroupInput('');
                        } else {
                          setMissingGroupName(e.target.value);
                        }
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {availableGroups.map(grp => (
                        <option key={grp} value={grp}>{grp}</option>
                      ))}
                      <option value="__NEW__">+ Yeni Grup Oluştur...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">KDV Durumu</label>
                  <select
                    value={missingIsVatIncluded ? 'included' : 'excluded'}
                    onChange={(e) => setMissingIsVatIncluded(e.target.value === 'included')}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="excluded">KDV Hariç</option>
                    <option value="included">KDV Dahil</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Hizmet Türü</label>
                  <select
                    value={missingServiceType}
                    onChange={(e) => setMissingServiceType(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="both">İSG Uzmanı + Hekim</option>
                    <option value="expert_only">Sadece İSG Uzmanı</option>
                    <option value="doctor_only">Sadece Hekim</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-2.5">
                <span className="text-xs font-bold text-amber-400 block uppercase tracking-wider">
                  Standart Fiyatlandırma Parametreleri
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 block">Taban Kişi</label>
                    <input
                      type="number"
                      value={missingBaseCount}
                      onChange={(e) => setMissingBaseCount(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 block">Taban Ücret (₺)</label>
                    <input
                      type="number"
                      value={missingBaseFee}
                      onChange={(e) => setMissingBaseFee(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 block">Ekstra Kişi (₺)</label>
                    <input
                      type="number"
                      value={missingExtraPerPerson}
                      onChange={(e) => setMissingExtraPerPerson(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={handleSkipMissingFirm}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Bu Firmayı Atla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Evet, Firmayı Kaydet ve Listeye Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Employee Count Updates Summary Popup Modal */}
      {showUpdatedEmployeesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0d1117] border border-emerald-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    📊 Çalışan Sayıları Güncellenen Firmalar
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                      {updatedEmployeesQueue.length} Firma
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Yüklenen veriden tespit edilen çalışan sayısı değişiklikleri aşağıda listelenmiştir.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUpdatedEmployeesModal(false);
                  if (unmatchedQueue.length > 0 && currentUnmatchedIndex >= 0) {
                    setShowAddMissingFirmModal(true);
                  }
                }}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List Table */}
            <div className="bg-[#161b22] border border-neutral-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 uppercase font-bold tracking-wider">
                    <th className="p-3">Firma İsmi</th>
                    <th className="p-3 text-center">Eski Çalışan Sayısı</th>
                    <th className="p-3 text-center">Yeni Çalışan Sayısı</th>
                    <th className="p-3 text-center">Değişim / Fark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-neutral-200">
                  {updatedEmployeesQueue.map(item => {
                    const diff = item.newEmployeeCount - item.oldEmployeeCount;
                    return (
                      <tr key={item.firmId} className="hover:bg-neutral-900/50 transition-colors">
                        <td className="p-3 font-semibold text-white">{item.firmName}</td>
                        <td className="p-3 text-center font-mono text-neutral-400">{item.oldEmployeeCount}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-400">{item.newEmployeeCount}</td>
                        <td className="p-3 text-center font-mono font-bold">
                          {diff > 0 ? (
                            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                              +{diff}
                            </span>
                          ) : diff < 0 ? (
                            <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                              {diff}
                            </span>
                          ) : (
                            <span className="text-neutral-500">Değişmedi</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <span className="text-xs text-neutral-400">
                {unmatchedQueue.length > 0 ? `⚠️ Ayrıca eklenmeyi bekleyen ${unmatchedQueue.length} yeni firma var.` : '✅ Tüm veriler başarıyla güncellendi.'}
              </span>
              <button
                onClick={() => {
                  setShowUpdatedEmployeesModal(false);
                  if (unmatchedQueue.length > 0 && currentUnmatchedIndex >= 0) {
                    setShowAddMissingFirmModal(true);
                  }
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                Tamam / Devam Et
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Webhook Entegrasyonu & Yazılımcı Rehberi Modalı */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0e0e12] border border-indigo-500/40 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Send className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    ⚡ Webhook Entegrasyon Rehberi & Kod Örnekleri
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-bold">
                      Geliştirici Dokümanı
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Sağlık otomasyonunuzu yazan diğer geliştirici arkadaş için hazır kod parçacıkları.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Specs Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 font-bold uppercase block">HTTP Metodu & Adres</span>
                <span className="text-xs font-mono font-bold text-indigo-400">POST /api/health-sync</span>
              </div>
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 font-bold uppercase block">Header (Gizli Anahtar)</span>
                <span className="text-xs font-mono font-bold text-emerald-400">Authorization: Bearer {vpsApiKey || 'vps_secure_secret_2026'}</span>
              </div>
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 font-bold uppercase block">Otomatik Süzgeç</span>
                <span className="text-xs font-bold text-amber-300">paymentType = "fatura" olanlar alınır</span>
              </div>
            </div>

            {/* Code Snippet Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
                  {(['curl', 'python', 'csharp', 'php', 'js'] as const).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveDocTab(lang)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        activeDocTab === lang
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      {lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python' : lang === 'csharp' ? 'C# (.NET)' : lang === 'php' ? 'PHP' : 'Node.js / JS'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    let code = '';
                    const domain = typeof window !== 'undefined' ? window.location.origin : 'https://app.domain.com';
                    const key = vpsApiKey || 'vps_secure_secret_2026';

                    if (activeDocTab === 'curl') {
                      code = `curl -X POST ${domain}/api/health-sync \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${key}" \\\n  -d '{\n    "records": [\n      {"firmName": "Kaya Lojistik A.Ş.", "paymentType": "fatura", "amount": 1850.00}\n    ]\n  }'`;
                    } else if (activeDocTab === 'python') {
                      code = `import requests\n\nurl = "${domain}/api/health-sync"\nheaders = {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer ${key}"\n}\npayload = {\n    "records": [\n        {"firmName": "Kaya Lojistik A.Ş.", "paymentType": "fatura", "amount": 1850.00}\n    ]\n}\nres = requests.post(url, json=payload, headers=headers)\nprint(res.json())`;
                    } else if (activeDocTab === 'csharp') {
                      code = `using System.Net.Http.Json;\n\nusing var client = new HttpClient();\nclient.DefaultRequestHeaders.Add("Authorization", "Bearer ${key}");\n\nvar payload = new {\n    records = new[] {\n        new { firmName = "Kaya Lojistik A.Ş.", paymentType = "fatura", amount = 1850.00 }\n    }\n};\n\nvar response = await client.PostAsJsonAsync("${domain}/api/health-sync", payload);`;
                    } else if (activeDocTab === 'php') {
                      code = `<?php\n$url = "${domain}/api/health-sync";\n$data = json_encode([\n    "records" => [\n        ["firmName" => "Kaya Lojistik A.Ş.", "paymentType" => "fatura", "amount" => 1850.00]\n    ]\n]);\n\n$ch = curl_init($url);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    "Content-Type: application/json",\n    "Authorization: Bearer ${key}"\n]);\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, $data);\n$res = curl_exec($ch);\ncurl_close($ch);`;
                    } else {
                      code = `const res = await fetch('${domain}/api/health-sync', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'Authorization': 'Bearer ${key}'\n  },\n  body: JSON.stringify({\n    records: [{ firmName: 'Kaya Lojistik A.Ş.', paymentType: 'fatura', amount: 1850.00 }]\n  })\n});\nconst data = await res.json();`;
                    }

                    navigator.clipboard.writeText(code);
                    setCopiedSnippet(true);
                    setTimeout(() => setCopiedSnippet(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-neutral-400" />}
                  {copiedSnippet ? 'Kopyalandı!' : 'Kodu Kopyala'}
                </button>
              </div>

              {/* Code Display Area */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-mono text-xs text-indigo-300 overflow-x-auto leading-relaxed">
                {activeDocTab === 'curl' && (
                  <pre>{`curl -X POST ${(typeof window !== 'undefined' ? window.location.origin : 'https://app.domain.com')}/api/health-sync \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${vpsApiKey || 'vps_secure_secret_2026'}" \\
  -d '{
    "records": [
      {
        "firmName": "Kaya Lojistik A.Ş.",
        "paymentType": "fatura",
        "amount": 1850.00
      }
    ]
  }'`}</pre>
                )}

                {activeDocTab === 'python' && (
                  <pre>{`import requests

url = "${(typeof window !== 'undefined' ? window.location.origin : 'https://app.domain.com')}/api/health-sync"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${vpsApiKey || 'vps_secure_secret_2026'}"
}
payload = {
    "records": [
        {
            "firmName": "Kaya Lojistik A.Ş.",
            "paymentType": "fatura",
            "amount": 1850.00
        }
    ]
}

res = requests.post(url, json=payload, headers=headers)
print("Status:", res.status_code)
print("Response:", res.json())`}</pre>
                )}

                {activeDocTab === 'csharp' && (
                  <pre>{`using System.Net.Http.Json;

using var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer ${vpsApiKey || 'vps_secure_secret_2026'}");

var payload = new {
    records = new[] {
        new { firmName = "Kaya Lojistik A.Ş.", paymentType = "fatura", amount = 1850.00 }
    }
};

var response = await client.PostAsJsonAsync("${(typeof window !== 'undefined' ? window.location.origin : 'https://app.domain.com')}/api/health-sync", payload);
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);`}</pre>
                )}

                {activeDocTab === 'php' && (
                  <pre>{`<?php
$url = "${(typeof window !== 'undefined' ? window.location.origin : 'https://app.domain.com')}/api/health-sync";
$data = json_encode([
    "records" => [
        [
            "firmName" => "Kaya Lojistik A.Ş.",
            "paymentType" => "fatura",
            "amount" => 1850.00
        ]
    ]
]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer ${vpsApiKey || 'vps_secure_secret_2026'}"
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

$response = curl_exec($ch);
curl_close($ch);
echo $response;`}</pre>
                )}

                {activeDocTab === 'js' && (
                  <pre>{`const response = await fetch('${(typeof window !== 'undefined' ? window.location.origin : 'https://app.domain.com')}/api/health-sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${vpsApiKey || 'vps_secure_secret_2026'}'
  },
  body: JSON.stringify({
    records: [
      {
        firmName: 'Kaya Lojistik A.Ş.',
        paymentType: 'fatura',
        amount: 1850.00
      }
    ]
  })
});

const data = await response.json();
console.log(data);`}</pre>
                )}
              </div>
            </div>

            {/* Note for developer */}
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 leading-relaxed">
              💡 <strong>Yazılımcı Arkadaş İçin Not:</strong> Diğer sisteminizde fatura kesildiği anda yukarıdaki POST isteğini atmanız yeterlidir. Firma unvanı cari listenizde kayıtlıysa tutar doğrudan o firmanın faturasına eklenir. Kayıtlı değilse sistem sizi otomatik uyarır ve tek tıkla eşleştirmenizi sağlar.
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                Anlaşıldı, Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Çalışan Sayıları Popup Modal */}
      {showEmployeeImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0f0f11] border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Çalışan Sayıları Aktarımı</h3>
                  <p className="text-xs text-neutral-400">Excel dosyasından yükleyin veya kopyalayıp yapıştırın</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmployeeImportModal(false)}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Excel File Upload */}
              <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">1. Excel (.xlsx / .xls) Yükle</span>
                  <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                    İçerisinde <strong className="text-emerald-400">Hizmet Alan İşyeri Unvanı</strong> ve <strong className="text-emerald-400">Çalışan Sayısı</strong> başlıkları olan dosyayı sürükleyin.
                  </p>
                </div>

                <div className="relative border-2 border-dashed border-neutral-800 hover:border-emerald-500/50 rounded-xl p-4 transition-colors flex flex-col items-center justify-center min-h-[110px] cursor-pointer bg-neutral-950/50 group">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleExcelFileUpload(file);
                        setShowEmployeeImportModal(false);
                      }
                      e.target.value = '';
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="h-7 w-7 text-emerald-400/80 group-hover:text-emerald-400 mb-1 transition-colors" />
                  <span className="text-xs font-semibold text-neutral-300 group-hover:text-white transition-colors">Excel Dosyası Seçin</span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">Otomatik eşleştirilir</span>
                </div>
              </div>

              {/* Option 2: Copy Paste */}
              <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">2. Excel'den Kopyala-Yapıştır</span>
                  <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                    Excel'den kopyaladığınız Firma Unvanı ve Çalışan Sayısı sütunlarını yapıştırın.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Örn: ABC Lojistik    25..."
                    rows={3}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-neutral-700 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (pastedText.trim()) {
                          parseUploadedText(pastedText);
                          setShowEmployeeImportModal(false);
                        } else {
                          alert("Lütfen kopyaladığınız Excel verisini kutucuğa yapıştırın.");
                        }
                      }}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-xs transition-all shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Kopyalanan Verileri Aktar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowEmployeeImportModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
