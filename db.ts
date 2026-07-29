import Database from 'better-sqlite3';
import path from 'path';

// Define the database path
const dbPath = path.resolve(process.cwd(), 'database.sqlite');

// Initialize database
const db = new Database(dbPath, { verbose: console.log });

// Create Tables
const initDb = () => {
  // Firms Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS firms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isVatIncluded INTEGER NOT NULL DEFAULT 0,
      invoiceType TEXT,
      taxNumber TEXT,
      address TEXT,
      pricingModel TEXT, 
      healthDataFee REAL,
      employeeCount INTEGER,
      parentFirmId TEXT,
      serviceType TEXT,
      hazardClass TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Invoices Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      firmId TEXT NOT NULL,
      firmName TEXT NOT NULL,
      invoiceType TEXT,
      date TEXT,
      employeeCount INTEGER,
      baseAmount REAL,
      healthAmount REAL,
      totalAmount REAL,
      isVatIncluded INTEGER,
      status TEXT,
      specialistFee REAL,
      doctorFee REAL,
      vatRate REAL,
      vatAmount REAL,
      isApproved INTEGER,
      approvalDate TEXT,
      paymentDate TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Transactions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      firmId TEXT NOT NULL,
      firmName TEXT,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Expense Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Expenses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      categoryId TEXT,
      amount REAL NOT NULL,
      description TEXT,
      paymentMethod TEXT,
      documentNumber TEXT,
      isTaxDeductible INTEGER,
      taxRate REAL,
      taxAmount REAL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Settings Table (Key-Value store)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Health Sync Messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS health_sync_messages (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      firmName TEXT,
      amount REAL,
      paymentType TEXT,
      rawText TEXT,
      processed INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('[DB] Database tables initialized successfully.');
};

initDb();

export default db;
