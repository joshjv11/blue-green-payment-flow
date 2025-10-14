import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export const getDateRangePresets = (): DateRange[] => {
  const now = new Date();
  
  return [
    {
      start: startOfMonth(now),
      end: endOfMonth(now),
      label: 'This Month'
    },
    {
      start: startOfMonth(subMonths(now, 1)),
      end: endOfMonth(subMonths(now, 1)),
      label: 'Last Month'
    },
    {
      start: startOfQuarter(now),
      end: endOfQuarter(now),
      label: 'This Quarter'
    },
    {
      start: startOfQuarter(subQuarters(now, 1)),
      end: endOfQuarter(subQuarters(now, 1)),
      label: 'Last Quarter'
    },
    {
      start: startOfYear(now),
      end: endOfYear(now),
      label: 'Year to Date'
    },
    {
      start: startOfYear(subMonths(now, 12)),
      end: endOfYear(subMonths(now, 12)),
      label: 'Last Year'
    }
  ];
};

export interface ProfitLossData {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: {
    total: number;
    byCategory: Record<string, number>;
  };
  operatingIncome: number;
  netProfit: number;
}

export interface BalanceSheetData {
  assets: {
    inventory: number;
    receivables: number;
    total: number;
  };
  liabilities: {
    payables: number;
    total: number;
  };
  equity: {
    retainedEarnings: number;
    total: number;
  };
}

export interface CashFlowData {
  operating: {
    salesReceipts: number;
    purchasePayments: number;
    expensePayments: number;
    net: number;
  };
  investing: {
    inventoryPurchases: number;
    net: number;
  };
  financing: {
    equity: number;
    net: number;
  };
  netCashFlow: number;
}

export const calculateProfitLoss = (
  sales: any[],
  purchases: any[],
  expenses: any[]
): ProfitLossData => {
  // Revenue from sales
  const revenue = sales.reduce((sum, sale) => sum + Number(sale.grand_total || 0), 0);

  // Cost of Goods Sold from purchases
  const cogs = purchases.reduce((sum, purchase) => sum + Number(purchase.grand_total || 0), 0);

  // Gross Profit
  const grossProfit = revenue - cogs;

  // Operating Expenses by category
  const expensesByCategory: Record<string, number> = {};
  expenses.forEach(expense => {
    const category = expense.category || 'Other';
    expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(expense.amount);
  });

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  // Operating Income
  const operatingIncome = grossProfit - totalExpenses;

  return {
    revenue,
    cogs,
    grossProfit,
    operatingExpenses: {
      total: totalExpenses,
      byCategory: expensesByCategory
    },
    operatingIncome,
    netProfit: operatingIncome // Simplified: no tax/interest for now
  };
};

export const calculateBalanceSheet = (
  products: any[],
  sales: any[],
  purchases: any[]
): BalanceSheetData => {
  // Assets: Inventory value
  const inventoryValue = products.reduce((sum, product) => {
    const qty = Number(product.stock_qty || 0);
    const cost = Number(product.purchase_price || 0);
    return sum + (qty * cost);
  }, 0);

  // Assets: Accounts Receivable (unpaid sales)
  const receivables = sales
    .filter(sale => sale.payment_status !== 'paid')
    .reduce((sum, sale) => sum + Number(sale.grand_total || 0), 0);

  // Liabilities: Accounts Payable (unpaid purchases)
  const payables = purchases
    .filter(purchase => purchase.payment_status !== 'paid')
    .reduce((sum, purchase) => sum + Number(purchase.grand_total || 0), 0);

  const totalAssets = inventoryValue + receivables;
  const totalLiabilities = payables;

  // Equity = Assets - Liabilities
  const equity = totalAssets - totalLiabilities;

  return {
    assets: {
      inventory: inventoryValue,
      receivables,
      total: totalAssets
    },
    liabilities: {
      payables,
      total: totalLiabilities
    },
    equity: {
      retainedEarnings: equity,
      total: equity
    }
  };
};

export const calculateCashFlow = (
  sales: any[],
  purchases: any[],
  expenses: any[]
): CashFlowData => {
  // Operating Activities
  const salesReceipts = sales
    .filter(sale => sale.payment_status === 'paid')
    .reduce((sum, sale) => sum + Number(sale.grand_total || 0), 0);

  const purchasePayments = purchases
    .filter(purchase => purchase.payment_status === 'paid')
    .reduce((sum, purchase) => sum + Number(purchase.grand_total || 0), 0);

  const expensePayments = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  const operatingCashFlow = salesReceipts - purchasePayments - expensePayments;

  // Investing Activities (inventory purchases considered here)
  const inventoryPurchases = purchases
    .filter(p => p.payment_status === 'paid')
    .reduce((sum, p) => sum + Number(p.grand_total || 0), 0);

  const investingCashFlow = -inventoryPurchases;

  // Financing Activities (simplified - would include loans, equity)
  const financingCashFlow = 0;

  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  return {
    operating: {
      salesReceipts,
      purchasePayments,
      expensePayments,
      net: operatingCashFlow
    },
    investing: {
      inventoryPurchases,
      net: investingCashFlow
    },
    financing: {
      equity: 0,
      net: financingCashFlow
    },
    netCashFlow
  };
};

export const formatCurrency = (amount: number): string => {
  return `₹${Math.abs(amount).toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

export const isNegative = (amount: number): boolean => amount < 0;
