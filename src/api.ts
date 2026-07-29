import { Firm, Invoice, Transaction, Expense, ExpenseCategory, SystemSettings } from './types';

const API_BASE = '/api';

export const api = {
  // Firms
  getFirms: async (): Promise<Firm[]> => (await fetch(`${API_BASE}/firms`)).json(),
  addFirm: async (firm: Firm) => fetch(`${API_BASE}/firms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(firm) }),
  updateFirm: async (firm: Firm) => fetch(`${API_BASE}/firms/${firm.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(firm) }),
  deleteFirm: async (id: string) => fetch(`${API_BASE}/firms/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: async (): Promise<Invoice[]> => (await fetch(`${API_BASE}/invoices`)).json(),
  addInvoice: async (inv: Invoice) => fetch(`${API_BASE}/invoices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inv) }),
  updateInvoice: async (inv: Invoice) => fetch(`${API_BASE}/invoices/${inv.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inv) }),
  deleteInvoice: async (id: string) => fetch(`${API_BASE}/invoices/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: async (): Promise<Transaction[]> => (await fetch(`${API_BASE}/transactions`)).json(),
  addTransaction: async (tx: Transaction) => fetch(`${API_BASE}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx) }),
  updateTransaction: async (tx: Transaction) => fetch(`${API_BASE}/transactions/${tx.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx) }),
  deleteTransaction: async (id: string) => fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: async (): Promise<Expense[]> => (await fetch(`${API_BASE}/expenses`)).json(),
  addExpense: async (exp: Expense) => fetch(`${API_BASE}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(exp) }),
  updateExpense: async (exp: Expense) => fetch(`${API_BASE}/expenses/${exp.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(exp) }),
  deleteExpense: async (id: string) => fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: async (): Promise<ExpenseCategory[]> => (await fetch(`${API_BASE}/categories`)).json(),
  addCategory: async (cat: ExpenseCategory) => fetch(`${API_BASE}/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cat) }),
  deleteCategory: async (id: string) => fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: async (): Promise<SystemSettings> => (await fetch(`${API_BASE}/settings`)).json(),
  updateSettings: async (settings: SystemSettings) => fetch(`${API_BASE}/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }),

  // Restore (Backup)
  restoreBackup: async (data: any) => fetch(`${API_BASE}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
};
