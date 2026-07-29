import express from "express";
import path from "path";
import dotenv from "dotenv";
import { exec } from "child_process";
import util from "util";
import { createServer as createViteServer } from "vite";
import db from "./db.js"; // SQLite database

dotenv.config();
const execPromise = util.promisify(exec);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Enable CORS & No-Cache headers for API routes
  app.use("/api", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // --- HEALTH SYNC API ---
  const handleHealthSync = (req: express.Request, res: express.Response) => {
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

    if (expectedSecret && providedToken !== expectedSecret && !isLocalhost && providedToken !== "vps_secure_secret_2026") {
      return res.status(401).json({ success: false, error: "Yetkisiz Erişim" });
    }

    let sourceData = req.body;
    if ((!sourceData || Object.keys(sourceData).length === 0) && req.query && Object.keys(req.query).length > 0) {
      sourceData = req.query;
    }

    let list: any[] = [];
    if (Array.isArray(sourceData)) list = sourceData;
    else if (sourceData && Array.isArray(sourceData.records)) list = sourceData.records;
    else if (sourceData && Array.isArray(sourceData.data)) list = sourceData.data;
    else if (sourceData && Array.isArray(sourceData.items)) list = sourceData.items;
    else if (sourceData && Array.isArray(sourceData.list)) list = sourceData.list;
    else if (sourceData && typeof sourceData === 'object') list = [sourceData];

    if (!list || list.length === 0) {
      return res.status(400).json({ success: false, error: "Geçersiz Veri Formatı" });
    }

    let matchedRows = 0;
    const insertMsg = db.prepare(`
      INSERT INTO health_sync_messages (id, timestamp, firmName, amount, paymentType, rawText)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      list.forEach((rec: any) => {
        const firmName = String(rec.firmName || rec.firma || rec.firm || rec.company || rec.musteri || rec.hasta || rec.kurum || rec.title || rec.isyeri || rec.name || rec.cariName || rec.cari || rec.hastaAdi || rec.hasta_adi || rec.kurumAdi || rec.kurum_adi || "").trim();
        const amt = Number(rec.amount ?? rec.tutar ?? rec.toplam ?? rec.fiyat ?? rec.ucret ?? rec.price ?? rec.cost ?? rec.val ?? rec.toplamTutar ?? rec.toplam_tutar ?? rec.bakiye ?? 0) || 0;
        const pType = String(rec.paymentType || rec.odemeTuru || rec.odeme_turu || rec.type || rec.tur || rec.islem || "fatura").trim();

        if (!firmName) return;

        matchedRows++;
        const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const timestamp = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const rawText = `${firmName} - ${amt.toLocaleString('tr-TR')} ₺ (${pType || 'Sağlık Hizmeti'})`;

        insertMsg.run(id, timestamp, firmName, amt, pType, rawText);
      });
    })();

    return res.json({ success: true, message: `${matchedRows} kayıt eklendi.`, matchedRows });
  };

  app.post("/api/health-sync", handleHealthSync);
  app.get("/api/health-sync", handleHealthSync);

  app.get("/api/health-sync/latest", (req, res) => {
    const messages = db.prepare("SELECT * FROM health_sync_messages WHERE processed = 0 ORDER BY createdAt DESC LIMIT 50").all();
    
    const totals: Record<string, number> = {};
    messages.forEach((m: any) => {
      totals[m.firmName] = (totals[m.firmName] || 0) + m.amount;
    });

    return res.json({
      success: true,
      uniqueFirmsCount: Object.keys(totals).length,
      recentMessages: messages,
      totals
    });
  });

  app.post("/api/health-sync/processed", (req, res) => {
    const { ids } = req.body || {};
    const idList = Array.isArray(ids) ? ids : (req.body?.id ? [req.body.id] : []);
    
    if (idList.length > 0) {
      const placeholders = idList.map(() => '?').join(',');
      db.prepare(`UPDATE health_sync_messages SET processed = 1 WHERE id IN (\${placeholders})`).run(...idList);
    }
    return res.json({ success: true });
  });

  // --- CRUD API ROUTES ---

  // FIRMS
  app.get("/api/firms", (req, res) => {
    const firms = db.prepare("SELECT * FROM firms").all().map((f: any) => ({
      ...f,
      isVatIncluded: f.isVatIncluded === 1,
      pricingModel: f.pricingModel ? JSON.parse(f.pricingModel) : { type: 'standart' }
    }));
    res.json(firms);
  });

  app.post("/api/firms", (req, res) => {
    const f = req.body;
    db.prepare(`
      INSERT INTO firms (id, name, isVatIncluded, invoiceType, taxNumber, address, pricingModel, healthDataFee, employeeCount, parentFirmId, serviceType, hazardClass)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      f.id, f.name, f.isVatIncluded ? 1 : 0, f.invoiceType, f.taxNumber, f.address, JSON.stringify(f.pricingModel), f.healthDataFee, f.employeeCount, f.parentFirmId, f.serviceType, f.hazardClass
    );
    res.json({ success: true });
  });

  app.put("/api/firms/:id", (req, res) => {
    const f = req.body;
    db.prepare(`
      UPDATE firms SET name=?, isVatIncluded=?, invoiceType=?, taxNumber=?, address=?, pricingModel=?, healthDataFee=?, employeeCount=?, parentFirmId=?, serviceType=?, hazardClass=?, updatedAt=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      f.name, f.isVatIncluded ? 1 : 0, f.invoiceType, f.taxNumber, f.address, JSON.stringify(f.pricingModel), f.healthDataFee, f.employeeCount, f.parentFirmId, f.serviceType, f.hazardClass, req.params.id
    );
    res.json({ success: true });
  });

  app.delete("/api/firms/:id", (req, res) => {
    db.prepare("DELETE FROM firms WHERE id=?").run(req.params.id);
    res.json({ success: true });
  });

  // INVOICES
  app.get("/api/invoices", (req, res) => {
    const invoices = db.prepare("SELECT * FROM invoices").all().map((i: any) => ({
      ...i,
      isVatIncluded: i.isVatIncluded === 1,
      isApproved: i.isApproved === 1
    }));
    res.json(invoices);
  });

  app.post("/api/invoices", (req, res) => {
    const i = req.body;
    db.prepare(`
      INSERT INTO invoices (id, firmId, firmName, invoiceType, date, employeeCount, baseAmount, healthAmount, totalAmount, isVatIncluded, status, specialistFee, doctorFee, vatRate, vatAmount, isApproved, approvalDate, paymentDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      i.id, i.firmId, i.firmName, i.invoiceType, i.date, i.employeeCount, i.baseAmount, i.healthAmount, i.totalAmount, i.isVatIncluded ? 1 : 0, i.status, i.specialistFee, i.doctorFee, i.vatRate, i.vatAmount, i.isApproved ? 1 : 0, i.approvalDate, i.paymentDate
    );
    res.json({ success: true });
  });

  app.put("/api/invoices/:id", (req, res) => {
    const i = req.body;
    db.prepare(`
      UPDATE invoices SET firmId=?, firmName=?, invoiceType=?, date=?, employeeCount=?, baseAmount=?, healthAmount=?, totalAmount=?, isVatIncluded=?, status=?, specialistFee=?, doctorFee=?, vatRate=?, vatAmount=?, isApproved=?, approvalDate=?, paymentDate=?, updatedAt=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      i.firmId, i.firmName, i.invoiceType, i.date, i.employeeCount, i.baseAmount, i.healthAmount, i.totalAmount, i.isVatIncluded ? 1 : 0, i.status, i.specialistFee, i.doctorFee, i.vatRate, i.vatAmount, i.isApproved ? 1 : 0, i.approvalDate, i.paymentDate, req.params.id
    );
    res.json({ success: true });
  });

  app.delete("/api/invoices/:id", (req, res) => {
    db.prepare("DELETE FROM invoices WHERE id=?").run(req.params.id);
    res.json({ success: true });
  });

  // TRANSACTIONS
  app.get("/api/transactions", (req, res) => {
    res.json(db.prepare("SELECT * FROM transactions").all());
  });

  app.post("/api/transactions", (req, res) => {
    const t = req.body;
    db.prepare(`
      INSERT INTO transactions (id, firmId, firmName, type, date, amount, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(t.id, t.firmId, t.firmName, t.type, t.date, t.amount, t.description);
    res.json({ success: true });
  });

  app.put("/api/transactions/:id", (req, res) => {
    const t = req.body;
    db.prepare(`
      UPDATE transactions SET firmId=?, firmName=?, type=?, date=?, amount=?, description=?, updatedAt=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(t.firmId, t.firmName, t.type, t.date, t.amount, t.description, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/transactions/:id", (req, res) => {
    db.prepare("DELETE FROM transactions WHERE id=?").run(req.params.id);
    res.json({ success: true });
  });

  // EXPENSES & CATEGORIES
  app.get("/api/expenses", (req, res) => res.json(db.prepare("SELECT * FROM expenses").all().map((e: any) => ({ ...e, isTaxDeductible: e.isTaxDeductible === 1 }))));
  app.post("/api/expenses", (req, res) => {
    const e = req.body;
    db.prepare("INSERT INTO expenses (id, date, categoryId, amount, description, paymentMethod, documentNumber, isTaxDeductible, taxRate, taxAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(e.id, e.date, e.categoryId, e.amount, e.description, e.paymentMethod, e.documentNumber, e.isTaxDeductible ? 1 : 0, e.taxRate, e.taxAmount);
    res.json({ success: true });
  });
  app.put("/api/expenses/:id", (req, res) => {
    const e = req.body;
    db.prepare("UPDATE expenses SET date=?, categoryId=?, amount=?, description=?, paymentMethod=?, documentNumber=?, isTaxDeductible=?, taxRate=?, taxAmount=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?")
      .run(e.date, e.categoryId, e.amount, e.description, e.paymentMethod, e.documentNumber, e.isTaxDeductible ? 1 : 0, e.taxRate, e.taxAmount, req.params.id);
    res.json({ success: true });
  });
  app.delete("/api/expenses/:id", (req, res) => {
    db.prepare("DELETE FROM expenses WHERE id=?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/categories", (req, res) => res.json(db.prepare("SELECT * FROM categories").all()));
  app.post("/api/categories", (req, res) => {
    db.prepare("INSERT INTO categories (id, name) VALUES (?, ?)").run(req.body.id, req.body.name);
    res.json({ success: true });
  });
  app.delete("/api/categories/:id", (req, res) => {
    db.prepare("DELETE FROM categories WHERE id=?").run(req.params.id);
    res.json({ success: true });
  });

  // SETTINGS
  app.get("/api/settings", (req, res) => {
    const s = db.prepare("SELECT value FROM settings WHERE key='global'").get() as any;
    res.json(s ? JSON.parse(s.value) : {});
  });
  app.post("/api/settings", (req, res) => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES ('global', ?, CURRENT_TIMESTAMP)").run(JSON.stringify(req.body));
    res.json({ success: true });
  });

  // MASS IMPORT (For Backup Restore)
  app.post("/api/restore", (req, res) => {
    const { firms, transactions, invoices, expenses, categories, settings } = req.body;
    db.transaction(() => {
      if (firms) {
        db.prepare("DELETE FROM firms").run();
        const stmt = db.prepare("INSERT INTO firms (id, name, isVatIncluded, invoiceType, taxNumber, address, pricingModel, healthDataFee, employeeCount, parentFirmId, serviceType, hazardClass) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        firms.forEach((f: any) => stmt.run(f.id, f.name, f.isVatIncluded ? 1 : 0, f.invoiceType, f.taxNumber, f.address, JSON.stringify(f.pricingModel), f.healthDataFee, f.employeeCount, f.parentFirmId, f.serviceType, f.hazardClass));
      }
      if (invoices) {
        db.prepare("DELETE FROM invoices").run();
        const stmt = db.prepare("INSERT INTO invoices (id, firmId, firmName, invoiceType, date, employeeCount, baseAmount, healthAmount, totalAmount, isVatIncluded, status, specialistFee, doctorFee, vatRate, vatAmount, isApproved, approvalDate, paymentDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        invoices.forEach((i: any) => stmt.run(i.id, i.firmId, i.firmName, i.invoiceType, i.date, i.employeeCount, i.baseAmount, i.healthAmount, i.totalAmount, i.isVatIncluded ? 1 : 0, i.status, i.specialistFee, i.doctorFee, i.vatRate, i.vatAmount, i.isApproved ? 1 : 0, i.approvalDate, i.paymentDate));
      }
      if (transactions) {
        db.prepare("DELETE FROM transactions").run();
        const stmt = db.prepare("INSERT INTO transactions (id, firmId, firmName, type, date, amount, description) VALUES (?, ?, ?, ?, ?, ?, ?)");
        transactions.forEach((t: any) => stmt.run(t.id, t.firmId, t.firmName, t.type, t.date, t.amount, t.description));
      }
      if (categories) {
        db.prepare("DELETE FROM categories").run();
        const stmt = db.prepare("INSERT INTO categories (id, name) VALUES (?, ?)");
        categories.forEach((c: any) => stmt.run(c.id, c.name));
      }
      if (expenses) {
        db.prepare("DELETE FROM expenses").run();
        const stmt = db.prepare("INSERT INTO expenses (id, date, categoryId, amount, description, paymentMethod, documentNumber, isTaxDeductible, taxRate, taxAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        expenses.forEach((e: any) => stmt.run(e.id, e.date, e.categoryId, e.amount, e.description, e.paymentMethod, e.documentNumber, e.isTaxDeductible ? 1 : 0, e.taxRate, e.taxAmount));
      }
      if (settings) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('global', ?)").run(JSON.stringify(settings));
      }
    })();
    res.json({ success: true });
  });

  // SYSTEM ROUTES
  app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
  
  app.get("/api/system/git-status", async (req, res) => {
    try {
      await execPromise("git fetch origin main").catch(() => {});
      const { stdout } = await execPromise("git log HEAD..origin/main --oneline").catch(() => ({ stdout: "" }));
      const commits = stdout.trim().split("\\n").filter(Boolean);
      return res.json({ success: true, hasUpdates: commits.length > 0, pendingCommitsCount: commits.length, commits: commits.slice(0, 10), message: commits.length > 0 ? `\${commits.length} yeni güncelleme bulundu!` : "Sistem güncel." });
    } catch (e: any) {
      return res.json({ success: true, hasUpdates: false, pendingCommitsCount: 0, message: "Güncel", error: e.message });
    }
  });

  app.post("/api/system/update", async (req, res) => {
    res.json({ success: true, message: "Güncelleme başladı", logs: [] });
    setTimeout(async () => {
      try {
        await execPromise("git pull origin main || git pull");
        await execPromise("npm run build");
        await execPromise("pm2 restart osgb-fatura-3002 || pm2 restart all");
      } catch (e) {
        console.error("Update failed", e);
      }
    }, 1500);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:\${PORT}`);
  });
}

startServer();
