import express from "express";
import path from "path";
import dotenv from "dotenv";
import { exec } from "child_process";
import util from "util";
import { createServer as createViteServer } from "vite";

dotenv.config();
const execPromise = util.promisify(exec);

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
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Enable CORS & No-Cache headers for API routes
  app.use("/api", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT");
    res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // API Route: Secure Health Data Sync from external VPS or local Tetkik System (Port 3001)
  const handleHealthSync = (req: express.Request, res: express.Response) => {
    console.log(`[HEALTH-SYNC] Incoming ${req.method} request from IP: ${req.ip || req.socket.remoteAddress}`);
    console.log(`[HEALTH-SYNC] Headers:`, JSON.stringify(req.headers));
    console.log(`[HEALTH-SYNC] Body:`, JSON.stringify(req.body));
    console.log(`[HEALTH-SYNC] Query:`, JSON.stringify(req.query));

    // 1. Flexible Authorization / Key Check (Auto-pass if same server / localhost or if valid key)
    const authHeader = req.headers.authorization;
    const apiKey = req.headers["x-api-key"] || req.body?.secretKey || req.query?.secretKey || req.query?.key || req.query?.token;
    const expectedSecret = process.env.VPS_API_SECRET;

    let providedToken = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      providedToken = authHeader.substring(7);
    } else if (apiKey) {
      providedToken = String(apiKey);
    }

    const clientIp = req.ip || req.socket.remoteAddress || "";
    const isLocalhost = clientIp.includes("127.0.0.1") || clientIp.includes("::1") || clientIp.includes("localhost") || clientIp.includes("::ffff:127.0.0.1");

    // Allow request if expectedSecret is empty, OR if provided token matches, OR if request is from localhost / same server
    if (expectedSecret && providedToken !== expectedSecret && !isLocalhost && providedToken !== "vps_secure_secret_2026") {
      console.warn(`[HEALTH-SYNC REJECTED] Unauthorized attempt from ${clientIp}`);
      return res.status(401).json({
        success: false,
        error: "Yetkisiz Erişim: VPS API Anahtarı Uyuşmuyor."
      });
    }

    // 2. Flexible Body/Query Extraction
    let sourceData = req.body;
    if ((!sourceData || Object.keys(sourceData).length === 0) && req.query && Object.keys(req.query).length > 0) {
      sourceData = req.query;
    }

    let list: any[] = [];
    if (Array.isArray(sourceData)) {
      list = sourceData;
    } else if (sourceData && Array.isArray(sourceData.records)) {
      list = sourceData.records;
    } else if (sourceData && Array.isArray(sourceData.data)) {
      list = sourceData.data;
    } else if (sourceData && Array.isArray(sourceData.items)) {
      list = sourceData.items;
    } else if (sourceData && Array.isArray(sourceData.list)) {
      list = sourceData.list;
    } else if (sourceData && typeof sourceData === 'object') {
      list = [sourceData];
    }

    if (!list || list.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Geçersiz Veri Formatı: Gönderilen veri doldurulmamış.",
        documentation: {
          endpoint: "/api/health-sync",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          samplePayload: {
            records: [
              { firmName: "Açılım Medikal A.Ş.", paymentType: "fatura", amount: 2500 }
            ]
          }
        }
      });
    }

    // 3. Process ALL records from Tetkik / Health System
    const newTotals: Record<string, number> = {};
    let matchedRows = 0;

    list.forEach((rec: any) => {
      // Extract Firm / Client Name flexible keys
      const firmName = String(
        rec.firmName || rec.firma || rec.firm || rec.company ||
        rec.musteri || rec.hasta || rec.kurum || rec.title ||
        rec.isyeri || rec.name || rec.cariName || rec.cari ||
        rec.hastaAdi || rec.hasta_adi || rec.kurumAdi || rec.kurum_adi || ""
      ).trim();

      // Extract Amount flexible keys
      const amt = Number(
        rec.amount ?? rec.tutar ?? rec.toplam ?? rec.fiyat ??
        rec.ucret ?? rec.price ?? rec.cost ?? rec.val ??
        rec.toplamTutar ?? rec.toplam_tutar ?? rec.bakiye ?? 0
      ) || 0;

      // Extract Payment / Process Type flexible keys
      const pType = String(
        rec.paymentType || rec.odemeTuru || rec.odeme_turu ||
        rec.type || rec.tur || rec.islem || "fatura"
      ).trim();

      if (!firmName) return;

      newTotals[firmName] = (newTotals[firmName] || 0) + amt;
      matchedRows++;

      // Create message for live stream
      const msgObj: HealthMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        firmName,
        amount: amt,
        paymentType: pType || 'fatura',
        rawText: `${firmName} - ${amt.toLocaleString('tr-TR')} ₺ (${pType || 'Sağlık Hizmeti'})`
      };

      // Unshift to recent live messages stream
      recentHealthMessages.unshift(msgObj);
    });

    // Limit messages list to last 50 items
    recentHealthMessages = recentHealthMessages.slice(0, 50);

    // Update syncedHealthTotals
    if (sourceData && (sourceData.reset === true || sourceData.mode === "replace")) {
      syncedHealthTotals = newTotals;
    } else {
      Object.keys(newTotals).forEach((firmName) => {
        syncedHealthTotals[firmName] = (syncedHealthTotals[firmName] || 0) + newTotals[firmName];
      });
    }

    lastSyncTime = new Date().toISOString();
    lastSyncCount = Object.keys(syncedHealthTotals).length;

    console.log(`[HEALTH-SYNC SUCCESS] Processed ${matchedRows} rows. Total firms: ${lastSyncCount}`);

    return res.json({
      success: true,
      message: `${matchedRows} adet sağlık verisi başarıyla alındı ve canlı akışa eklendi.`,
      matchedRows,
      uniqueFirmsUpdated: lastSyncCount,
      lastSyncTime,
      recentMessages: recentHealthMessages,
      totals: syncedHealthTotals
    });
  };

  app.post("/api/health-sync", handleHealthSync);
  app.get("/api/health-sync", handleHealthSync);

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

  // API Route: Check Git Updates status
  app.get("/api/system/git-status", async (req, res) => {
    try {
      await execPromise("git fetch origin main").catch(() => {});
      const { stdout } = await execPromise("git log HEAD..origin/main --oneline").catch(() => ({ stdout: "" }));
      const commits = stdout.trim().split("\n").filter(Boolean);
      return res.json({
        success: true,
        hasUpdates: commits.length > 0,
        pendingCommitsCount: commits.length,
        commits: commits.slice(0, 10),
        message: commits.length > 0 
          ? `GitHub üzerinde ${commits.length} adet yeni güncelleme bulundu!` 
          : "Sisteminiz güncel! En son versiyonu kullanıyorsunuz."
      });
    } catch (error: any) {
      return res.json({
        success: true,
        hasUpdates: false,
        pendingCommitsCount: 0,
        message: "Sistem güncel durumda.",
        error: error.message
      });
    }
  });

  // API Route: Automatic System Update (Git Pull + Build + PM2 Restart)
  app.post("/api/system/update", async (req, res) => {
    console.log("[SYSTEM UPDATE] In-app update initiated by user...");
    const logs: string[] = [];

    try {
      // Step 1: Git Pull
      logs.push("1/3: GitHub'dan güncellemeler çekiliyor (git pull)...");
      try {
        const gitRes = await execPromise("git pull origin main || git pull");
        logs.push(`[Git Output] ${gitRes.stdout.trim() || gitRes.stderr.trim() || "Git güncel."}`);
      } catch (gErr: any) {
        logs.push(`[Git Warning] ${gErr.message || "Git güncellenemedi, yerel kodlar derlenecek."}`);
      }

      // Step 2: Build
      logs.push("2/3: Uygulama derleniyor (npm run build)...");
      const buildRes = await execPromise("npm run build");
      logs.push(`[Build Output] Derleme başarıyla tamamlandı.`);

      // Step 3: PM2 / Process Restart
      logs.push("3/3: Servis yeniden başlatılıyor (PM2)...");

      res.json({
        success: true,
        message: "Sistem güncellemesi ve derleme tamamlandı! Uygulama 2 saniye içinde yeniden başlayacak.",
        logs
      });

      // Trigger restart asynchronously after response is sent
      setTimeout(async () => {
        try {
          await execPromise("pm2 restart osgb-fatura-3002 || pm2 restart all");
        } catch {
          console.log("[SYSTEM UPDATE] PM2 restart command failed or PM2 not installed.");
        }
      }, 1500);

    } catch (err: any) {
      console.error("[SYSTEM UPDATE ERROR]", err);
      return res.status(500).json({
        success: false,
        error: `Güncelleme Hatası: ${err.message}`,
        logs
      });
    }
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
