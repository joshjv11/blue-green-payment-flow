import { format } from "date-fns";

interface TallyExportItem {
  date: string;
  voucherType: string;
  partyName: string;
  gstin: string;
  hsnSac: string;
  taxRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  invoiceNumber: string;
}

export function generateTallyCSV(data: TallyExportItem[]): string {
  const headers = [
    "Date",
    "Voucher Type",
    "Invoice Number",
    "Party Name",
    "GSTIN",
    "HSN/SAC",
    "Tax Rate (%)",
    "Taxable Value",
    "CGST",
    "SGST",
    "IGST",
    "Total Amount",
  ];

  const rows = data.map((item) => [
    item.date,
    item.voucherType,
    item.invoiceNumber,
    item.partyName,
    item.gstin || "N/A",
    item.hsnSac || "N/A",
    item.taxRate.toFixed(2),
    item.taxableValue.toFixed(2),
    item.cgst.toFixed(2),
    item.sgst.toFixed(2),
    item.igst.toFixed(2),
    item.totalAmount.toFixed(2),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
}

export function downloadCSV(content: string, filename: string): void {
  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export interface SalesOrderLine {
  product_name: string;
  hsn_sac_code?: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

export interface SalesOrderExport {
  invoice_number: string;
  transaction_date: string;
  customer_name: string;
  customer_gstin?: string;
  order_lines?: SalesOrderLine[];
}

export interface PurchaseOrderExport {
  invoice_number: string;
  transaction_date: string;
  supplier_name: string;
  supplier_gstin?: string;
  order_lines?: SalesOrderLine[];
}

export function convertSalesToTally(
  sales: SalesOrderExport[]
): TallyExportItem[] {
  const items: TallyExportItem[] = [];

  sales.forEach((sale) => {
    if (sale.order_lines && sale.order_lines.length > 0) {
      sale.order_lines.forEach((line) => {
        items.push({
          date: format(new Date(sale.transaction_date), "dd/MM/yyyy"),
          voucherType: "Sales",
          invoiceNumber: sale.invoice_number,
          partyName: sale.customer_name,
          gstin: sale.customer_gstin || "",
          hsnSac: line.hsn_sac_code || "",
          taxRate: line.gst_rate,
          taxableValue: line.taxable_amount,
          cgst: line.cgst_amount,
          sgst: line.sgst_amount,
          igst: line.igst_amount,
          totalAmount: line.total_amount,
        });
      });
    } else {
      // Fallback for orders without lines
      items.push({
        date: format(new Date(sale.transaction_date), "dd/MM/yyyy"),
        voucherType: "Sales",
        invoiceNumber: sale.invoice_number,
        partyName: sale.customer_name,
        gstin: sale.customer_gstin || "",
        hsnSac: "",
        taxRate: 0,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalAmount: 0,
      });
    }
  });

  return items;
}

export function convertPurchasesToTally(
  purchases: PurchaseOrderExport[]
): TallyExportItem[] {
  const items: TallyExportItem[] = [];

  purchases.forEach((purchase) => {
    if (purchase.order_lines && purchase.order_lines.length > 0) {
      purchase.order_lines.forEach((line) => {
        items.push({
          date: format(new Date(purchase.transaction_date), "dd/MM/yyyy"),
          voucherType: "Purchase",
          invoiceNumber: purchase.invoice_number,
          partyName: purchase.supplier_name,
          gstin: purchase.supplier_gstin || "",
          hsnSac: line.hsn_sac_code || "",
          taxRate: line.gst_rate,
          taxableValue: line.taxable_amount,
          cgst: line.cgst_amount,
          sgst: line.sgst_amount,
          igst: line.igst_amount,
          totalAmount: line.total_amount,
        });
      });
    } else {
      // Fallback for orders without lines
      items.push({
        date: format(new Date(purchase.transaction_date), "dd/MM/yyyy"),
        voucherType: "Purchase",
        invoiceNumber: purchase.invoice_number,
        partyName: purchase.supplier_name,
        gstin: purchase.supplier_gstin || "",
        hsnSac: "",
        taxRate: 0,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalAmount: 0,
      });
    }
  });

  return items;
}

export function generateGSTSummaryCSV(data: {
  sales: { cgst: number; sgst: number; igst: number; total: number };
  purchases: { cgst: number; sgst: number; igst: number; total: number };
}): string {
  const headers = ["Type", "CGST", "SGST", "IGST", "Total Tax"];

  const rows = [
    [
      "Sales",
      data.sales.cgst.toFixed(2),
      data.sales.sgst.toFixed(2),
      data.sales.igst.toFixed(2),
      data.sales.total.toFixed(2),
    ],
    [
      "Purchases",
      data.purchases.cgst.toFixed(2),
      data.purchases.sgst.toFixed(2),
      data.purchases.igst.toFixed(2),
      data.purchases.total.toFixed(2),
    ],
    [
      "Net Tax Liability",
      (data.sales.cgst - data.purchases.cgst).toFixed(2),
      (data.sales.sgst - data.purchases.sgst).toFixed(2),
      (data.sales.igst - data.purchases.igst).toFixed(2),
      (data.sales.total - data.purchases.total).toFixed(2),
    ],
  ];

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}
