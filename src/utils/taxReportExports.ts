import { format } from "date-fns";
import type { BusinessSettings } from "@/hooks/useBusinessSettings";

interface OrderData {
  id: string;
  transaction_date: string;
  invoice_number: string;
  customer_name?: string;
  supplier_name?: string;
  billing_snapshot?: any;
  shipping_snapshot?: any;
  total_amount: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  grand_total: number;
  order_lines?: Array<{
    product_name: string;
    hsn_sac_code?: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    zero_rated?: boolean;
    rcm?: boolean;
  }>;
}

export function exportTaxReportCSV(
  salesData: OrderData[],
  purchaseData: OrderData[],
  settings: BusinessSettings
): string {
  const headers = [
    "Type",
    "Date",
    "Invoice No",
    "Party Name",
    "Party Tax ID",
    "Item",
    "HSN/SAC",
    "Qty",
    "Rate",
    "Tax %",
    "Tax Amount",
    "Total",
    "Zero-Rated",
    "RCM",
    "Currency",
  ];

  const rows: string[][] = [];

  // Add sales data
  salesData.forEach((sale) => {
    const gstin = sale.billing_snapshot?.gstin || '';
    sale.order_lines?.forEach((line) => {
      rows.push([
        "Sale",
        format(new Date(sale.transaction_date), "dd-MMM-yyyy"),
        sale.invoice_number,
        sale.customer_name || "",
        gstin,
        line.product_name,
        line.hsn_sac_code || "",
        line.quantity.toString(),
        line.unit_price.toFixed(2),
        line.tax_rate.toString(),
        (line.quantity * line.unit_price * line.tax_rate / 100).toFixed(2),
        (line.quantity * line.unit_price * (1 + line.tax_rate / 100)).toFixed(2),
        line.zero_rated ? "Yes" : "No",
        line.rcm ? "Yes" : "No",
        settings.currency,
      ]);
    });
  });

  // Add purchase data
  purchaseData.forEach((purchase) => {
    const gstin = purchase.shipping_snapshot?.gstin || '';
    purchase.order_lines?.forEach((line) => {
      rows.push([
        "Purchase",
        format(new Date(purchase.transaction_date), "dd-MMM-yyyy"),
        purchase.invoice_number,
        purchase.supplier_name || "",
        gstin,
        line.product_name,
        line.hsn_sac_code || "",
        line.quantity.toString(),
        line.unit_price.toFixed(2),
        line.tax_rate.toString(),
        (line.quantity * line.unit_price * line.tax_rate / 100).toFixed(2),
        (line.quantity * line.unit_price * (1 + line.tax_rate / 100)).toFixed(2),
        line.zero_rated ? "Yes" : "No",
        line.rcm ? "Yes" : "No",
        settings.currency,
      ]);
    });
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function exportGSTR1CSV(salesData: OrderData[], settings: BusinessSettings): string {
  const headers = [
    "GSTIN of Supplier",
    "Invoice Number",
    "Invoice Date",
    "Invoice Value",
    "Place of Supply",
    "Reverse Charge",
    "Invoice Type",
    "Rate",
    "Taxable Value",
    "Integrated Tax Amt",
    "Central Tax Amt",
    "State/UT Tax Amt",
  ];

  const rows: string[][] = [];

  salesData.forEach((sale) => {
    const address = sale.billing_snapshot?.address || '';
    const gstin = sale.billing_snapshot?.gstin || '';
    rows.push([
      settings.business_tax_id_value || "",
      sale.invoice_number,
      format(new Date(sale.transaction_date), "dd-MMM-yyyy"),
      sale.grand_total.toFixed(2),
      address,
      "N",
      "Regular",
      "18", // This should be calculated from line items
      sale.total_amount.toFixed(2),
      sale.igst_amount.toFixed(2),
      sale.cgst_amount.toFixed(2),
      sale.sgst_amount.toFixed(2),
    ]);
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function exportGSTR3BCSV(
  salesData: OrderData[],
  purchaseData: OrderData[],
  settings: BusinessSettings
): string {
  // Calculate aggregated values
  const outwardTaxable = salesData.reduce((sum, s) => sum + s.total_amount, 0);
  const outwardIGST = salesData.reduce((sum, s) => sum + s.igst_amount, 0);
  const outwardCGST = salesData.reduce((sum, s) => sum + s.cgst_amount, 0);
  const outwardSGST = salesData.reduce((sum, s) => sum + s.sgst_amount, 0);

  const inwardTaxable = purchaseData.reduce((sum, p) => sum + p.total_amount, 0);
  const inwardIGST = purchaseData.reduce((sum, p) => sum + p.igst_amount, 0);
  const inwardCGST = purchaseData.reduce((sum, p) => sum + p.cgst_amount, 0);
  const inwardSGST = purchaseData.reduce((sum, p) => sum + p.sgst_amount, 0);

  const headers = [
    "Description",
    "Taxable Value",
    "Integrated Tax",
    "Central Tax",
    "State/UT Tax",
    "Cess",
  ];

  const rows = [
    [
      "3.1 Outward taxable supplies",
      outwardTaxable.toFixed(2),
      outwardIGST.toFixed(2),
      outwardCGST.toFixed(2),
      outwardSGST.toFixed(2),
      "0.00",
    ],
    [
      "4. Eligible ITC",
      inwardTaxable.toFixed(2),
      inwardIGST.toFixed(2),
      inwardCGST.toFixed(2),
      inwardSGST.toFixed(2),
      "0.00",
    ],
    [
      "5. Net Tax Payable",
      "",
      (outwardIGST - inwardIGST).toFixed(2),
      (outwardCGST - inwardCGST).toFixed(2),
      (outwardSGST - inwardSGST).toFixed(2),
      "0.00",
    ],
  ];

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function exportUAEVATCSV(
  salesData: OrderData[],
  purchaseData: OrderData[],
  settings: BusinessSettings
): string {
  const headers = [
    "Box No.",
    "Description",
    "Amount (AED)",
    "VAT Amount (AED)",
    "Adjustments",
  ];

  const salesVAT = salesData.reduce((sum, s) => sum + s.tax_amount, 0);
  const salesTotal = salesData.reduce((sum, s) => sum + s.total_amount, 0);
  const purchaseVAT = purchaseData.reduce((sum, p) => sum + p.tax_amount, 0);
  const purchaseTotal = purchaseData.reduce((sum, p) => sum + p.total_amount, 0);

  const rows = [
    ["1", "Standard rated supplies", salesTotal.toFixed(2), salesVAT.toFixed(2), "0.00"],
    ["2", "Tax refunds provided to tourists", "0.00", "0.00", "0.00"],
    ["3", "Supplies subject to the reverse charge", "0.00", "0.00", "0.00"],
    ["4", "Zero rated supplies", "0.00", "0.00", "0.00"],
    ["5", "Exempt supplies", "0.00", "0.00", "0.00"],
    ["6", "Total VAT due", "", salesVAT.toFixed(2), ""],
    ["7", "Standard rated expenses", purchaseTotal.toFixed(2), purchaseVAT.toFixed(2), "0.00"],
    ["8", "Reverse charge mechanism", "0.00", "0.00", "0.00"],
    ["9", "Total VAT recovery", "", purchaseVAT.toFixed(2), ""],
    ["10", "Net VAT payable", "", (salesVAT - purchaseVAT).toFixed(2), ""],
  ];

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function exportGenericVATCSV(
  salesData: OrderData[],
  purchaseData: OrderData[],
  settings: BusinessSettings
): string {
  const headers = [
    "Type",
    "Date",
    "Invoice No",
    "Party Name",
    "Party VAT ID",
    "Taxable Value",
    "VAT Rate %",
    "VAT Amount",
    "Total Amount",
    "Currency",
  ];

  const rows: string[][] = [];

  // Add sales
  salesData.forEach((sale) => {
    const gstin = sale.billing_snapshot?.gstin || '';
    rows.push([
      "Sale",
      format(new Date(sale.transaction_date), "dd-MMM-yyyy"),
      sale.invoice_number,
      sale.customer_name || "",
      gstin,
      sale.total_amount.toFixed(2),
      "5", // Standard rate - should be calculated from lines
      sale.tax_amount.toFixed(2),
      sale.grand_total.toFixed(2),
      settings.currency,
    ]);
  });

  // Add purchases
  purchaseData.forEach((purchase) => {
    const gstin = purchase.shipping_snapshot?.gstin || '';
    rows.push([
      "Purchase",
      format(new Date(purchase.transaction_date), "dd-MMM-yyyy"),
      purchase.invoice_number,
      purchase.supplier_name || "",
      gstin,
      purchase.total_amount.toFixed(2),
      "5", // Standard rate - should be calculated from lines
      purchase.tax_amount.toFixed(2),
      purchase.grand_total.toFixed(2),
      settings.currency,
    ]);
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
