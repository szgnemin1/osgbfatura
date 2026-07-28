import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

interface HealthSyncRecord {
  firmName: string;
  paymentType: string;
  amount: number;
}

interface HealthMessage {
  id: string;
  timestamp: string;
  firmName: string;
  amount: number;
  paymentType: string;
  rawText?: string;
}

// In-memory store for synced health data from VPS & Live Messages
let syncedHealthTotals: Record<string, number> = {};
let recentHealthMessages: HealthMessage[] = [];
let processedMessageIds: Set<string> = new Set();
let lastSyncTime: string | null = null;
let lastSyncCount: number = 0;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

  app.use(express.json({ limit: "10mb" }));

  // Enable CORS & No-Cache headers for API routes
  app.use("/api", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // API Route: Secure Health Data Sync from external VPS or local service
  app.post("/api/health-sync", (req, res) => {
    // 1. Flexible Authorization / Key Check (Seamless for same VPS)
    const authHeader = req.headers.authorization;
    const apiKey = req.headers["x-api-key"] || req.body?.secretKey;
    const expectedSecret = process.env.VPS_API_SECRET; // Only strictly enforced if custom ENV set

    let providedToken = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      providedToken = authHeader.substring(7);
    } else if (apiKey) {
      providedToken = String(apiKey);
    }

    // Security check: Only block if custom VPS_API_SECRET env variable is defined and token doesn't match
    if (expectedSecret && providedToken !== expectedSecret) {
      return res.status(401).json({
        success: false,
        error: "Yetkisiz Erişim: VPS API Anahtarı Uyuşmuyor."
      });
    }

    // 2. Flexible Body Extraction (Accepts raw array [...], {records: [...]}, {data: [...]}, {items: [...]}, {list: [...]}, or single object {...})
    let list: any[] = [];
    if (Array.isArray(req.body)) {
      list = req.body;
    } else if (req.body && Array.isArray(req.body.records)) {
      list = req.body.records;
    } else if (req.body && Array.isArray(req.body.data)) {
      list = req.body.data;
    } else if (req.body && Array.isArray(req.body.items)) {
      list = req.body.items;
    } else if (req.body && Array.isArray(req.body.list)) {
      list = req.body.list;
    } else if (req.body && typeof req.body === 'object' && (req.body.firmName || req.body.firma || req.body.firm || req.body.company)) {
      list = [req.body];
    } else {
      return res.status(400).json({
        success: false,
        error: "Geçersiz Veri Formatı: Gönderilen veri dizi [...], {records: [...]}, {data: [...]} veya tekil obje {firmName, amount} olmalıdır.",
        documentation: {
          endpoint: "/api/health-sync",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer vps_secure_secret_2026 (veya x-api-key)"
          },
          samplePayload: {
            records: [
              { firmName: "Açılım Medikal A.Ş.", paymentType: "fatura", amount: 2500 }
            ]
          }
        }
      });
    }

    // 3. Filter records where paymentType equals or includes 'fatura'
    const newTotals: Record<string, number> = {};
    let matchedRows = 0;
    let filteredOutRows = 0;

    list.forEach((rec: any) => {
      const firmName = String(rec.firmName || rec.firma || rec.firm || rec.company || "").trim();
      const pType = String(rec.paymentType || rec.odemeTuru || rec.type || "fatura").toLowerCase().trim();
      const amt = Number(rec.amount || rec.tutar || rec.toplam) || 0;

      if (!firmName) return;

      // Filter: Only include records where payment type is 'fatura' or default 'fatura'
      if (pType.includes("fatura") || pType.includes("e-fatura") || pType === "fatura") {
        newTotals[firmName] = (newTotals[firmName] || 0) + amt;
        matchedRows++;

        // Add to recent live messages stream
        recentHealthMessages.unshift({
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          firmName,
          amount: amt,
          paymentType: 'fatura',
          rawText: `${firmName} - ${amt.toLocaleString('tr-TR')} ₺ Fatura`
        });
      } else {
        filteredOutRows++;
      }
    });

    // Limit messages list to last 25 items
    recentHealthMessages = recentHealthMessages.slice(0, 25);

    // Update syncedHealthTotals (merge by default, replace if reset/mode=replace)
    if (req.body && (req.body.reset === true || req.body.mode === "replace")) {
      syncedHealthTotals = newTotals;
    } else {
      Object.keys(newTotals).forEach((firmName) => {
        syncedHealthTotals[firmName] = (syncedHealthTotals[firmName] || 0) + newTotals[firmName];
      });
    }

    lastSyncTime = new Date().toISOString();
    lastSyncCount = Object.keys(syncedHealthTotals).length;

    return res.json({
      success: true,
      message: "Sağlık mesajı başarıyla alındı ve canlı akışa eklendi.",
      matchedRows,
      filteredOutRows,
      uniqueFirmsUpdated: lastSyncCount,
      lastSyncTime,
      recentMessages: recentHealthMessages,
      totals: syncedHealthTotals
    });
  });

  // API Route: Mark messages as processed so they are not shown again
  app.post("/api/health-sync/processed", (req, res) => {
    const { ids } = req.body || {};
    if (Array.isArray(ids)) {
      ids.forEach((id: string) => processedMessageIds.add(String(id)));
    } else if (req.body?.id) {
      processedMessageIds.add(String(req.body.id));
    }
    // Also filter out processed from recentHealthMessages
    recentHealthMessages = recentHealthMessages.filter(m => !processedMessageIds.has(m.id));
    return res.json({ success: true, processedCount: processedMessageIds.size, remainingCount: recentHealthMessages.length });
  });

  // API Route: Get latest synced health totals and message stream for client UI
  app.get("/api/health-sync/latest", (req, res) => {
    // If no health data synced yet, initialize sample fatura health data & messages for smooth testing
    if (Object.keys(syncedHealthTotals).length === 0 && recentHealthMessages.length === 0) {
      syncedHealthTotals = {
        "ABC Teknoloji A.Ş.": 2500,
        "XYZ Lojistik ve Ticaret": 1850,
        "Anadolu İnşaat Sanayi": 3200
      };
      const initialMsgs = [
        {
          id: 'msg_sample_1',
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          firmName: 'ABC Teknoloji A.Ş.',
          amount: 2500,
          paymentType: 'fatura',
          rawText: 'ABC Teknoloji A.Ş. - 2.500 ₺ Fatura Sağlık Hizmet Bedeli'
        },
        {
          id: 'msg_sample_2',
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          firmName: 'XYZ Lojistik ve Ticaret',
          amount: 1850,
          paymentType: 'fatura',
          rawText: 'XYZ Lojistik ve Ticaret - 1.850 ₺ Fatura Sağlık Hizmet Bedeli'
        }
      ];
      recentHealthMessages = initialMsgs.filter(m => !processedMessageIds.has(m.id));
      lastSyncTime = new Date().toISOString();
    }

    // Always filter out processed messages
    const unprocessedMessages = recentHealthMessages.filter(m => !processedMessageIds.has(m.id));

    return res.json({
      success: true,
      lastSyncTime,
      uniqueFirmsCount: Object.keys(syncedHealthTotals).length,
      recentMessages: unprocessedMessages,
      totals: syncedHealthTotals
    });
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
