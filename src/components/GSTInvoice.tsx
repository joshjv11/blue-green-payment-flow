import { forwardRef } from "react";
import { format } from "date-fns";
import { formatGSTIN } from "@/utils/gst";

interface InvoiceItem {
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

interface GSTInvoiceProps {
  invoiceNumber: string;
  invoiceDate: Date;
  companyName: string;
  companyGSTIN?: string;
  companyAddress?: string;
  companyState?: string;
  partyName: string;
  partyGSTIN?: string;
  partyAddress?: string;
  partyState?: string;
  items: InvoiceItem[];
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  isIGST: boolean;
  type: "sale" | "purchase";
}

export const GSTInvoice = forwardRef<HTMLDivElement, GSTInvoiceProps>(
  ({
    invoiceNumber,
    invoiceDate,
    companyName,
    companyGSTIN,
    companyAddress,
    companyState,
    partyName,
    partyGSTIN,
    partyAddress,
    partyState,
    items,
    subtotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    grandTotal,
    isIGST,
    type,
  }, ref) => {
    const partyLabel = type === "sale" ? "Bill To (Customer)" : "Bill From (Supplier)";

    return (
      <div ref={ref} className="bg-white p-8 text-black" style={{ fontFamily: "Arial, sans-serif" }}>
        {/* Header */}
        <div className="border-2 border-black p-4 mb-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold uppercase tracking-wide">{companyName}</h1>
            {companyAddress && <p className="text-sm mt-1">{companyAddress}</p>}
            {companyState && <p className="text-sm">State: {companyState}</p>}
            {companyGSTIN && (
              <p className="text-sm font-semibold mt-1">
                GSTIN: {formatGSTIN(companyGSTIN)}
              </p>
            )}
          </div>

          <div className="border-t-2 border-black pt-3 mt-3">
            <h2 className="text-xl font-bold text-center">
              {type === "sale" ? "TAX INVOICE" : "PURCHASE INVOICE"}
            </h2>
          </div>
        </div>

        {/* Invoice Details and Party Info */}
        <div className="grid grid-cols-2 gap-4 mb-4 border border-black">
          <div className="border-r border-black p-3">
            <p className="font-semibold mb-2">Invoice Details:</p>
            <p className="text-sm">Invoice No: <span className="font-bold">{invoiceNumber}</span></p>
            <p className="text-sm">Date: {format(invoiceDate, "dd/MM/yyyy")}</p>
          </div>
          <div className="p-3">
            <p className="font-semibold mb-2">{partyLabel}:</p>
            <p className="text-sm font-bold">{partyName}</p>
            {partyAddress && <p className="text-sm">{partyAddress}</p>}
            {partyState && <p className="text-sm">State: {partyState}</p>}
            {partyGSTIN && (
              <p className="text-sm">GSTIN: {formatGSTIN(partyGSTIN)}</p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border border-black mb-4 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">#</th>
              <th className="border border-black p-2 text-left">Item Description</th>
              <th className="border border-black p-2 text-center">HSN/SAC</th>
              <th className="border border-black p-2 text-right">Qty</th>
              <th className="border border-black p-2 text-right">Rate</th>
              <th className="border border-black p-2 text-right">Taxable Amt</th>
              <th className="border border-black p-2 text-center">GST%</th>
              {!isIGST ? (
                <>
                  <th className="border border-black p-2 text-right">CGST</th>
                  <th className="border border-black p-2 text-right">SGST</th>
                </>
              ) : (
                <th className="border border-black p-2 text-right">IGST</th>
              )}
              <th className="border border-black p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="border border-black p-2">{index + 1}</td>
                <td className="border border-black p-2">{item.product_name}</td>
                <td className="border border-black p-2 text-center">{item.hsn_sac_code || "-"}</td>
                <td className="border border-black p-2 text-right">{item.quantity}</td>
                <td className="border border-black p-2 text-right">₹{item.unit_price.toFixed(2)}</td>
                <td className="border border-black p-2 text-right">₹{item.taxable_amount.toFixed(2)}</td>
                <td className="border border-black p-2 text-center">{item.gst_rate}%</td>
                {!isIGST ? (
                  <>
                    <td className="border border-black p-2 text-right">₹{item.cgst_amount.toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">₹{item.sgst_amount.toFixed(2)}</td>
                  </>
                ) : (
                  <td className="border border-black p-2 text-right">₹{item.igst_amount.toFixed(2)}</td>
                )}
                <td className="border border-black p-2 text-right font-semibold">
                  ₹{item.total_amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tax Summary */}
        <div className="flex justify-end mb-4">
          <div className="w-1/2 border border-black">
            <div className="grid grid-cols-2 border-b border-black">
              <div className="p-2 font-semibold">Taxable Amount:</div>
              <div className="p-2 text-right border-l border-black">₹{subtotal.toFixed(2)}</div>
            </div>
            {!isIGST ? (
              <>
                <div className="grid grid-cols-2 border-b border-black">
                  <div className="p-2">CGST:</div>
                  <div className="p-2 text-right border-l border-black">₹{cgstTotal.toFixed(2)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-black">
                  <div className="p-2">SGST:</div>
                  <div className="p-2 text-right border-l border-black">₹{sgstTotal.toFixed(2)}</div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-2">IGST:</div>
                <div className="p-2 text-right border-l border-black">₹{igstTotal.toFixed(2)}</div>
              </div>
            )}
            <div className="grid grid-cols-2 bg-gray-100">
              <div className="p-2 font-bold text-lg">Grand Total:</div>
              <div className="p-2 text-right border-l border-black font-bold text-lg">
                ₹{grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black pt-4 mt-8">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-gray-600">Terms & Conditions:</p>
              <p className="text-xs text-gray-600">• Payment within 30 days</p>
              <p className="text-xs text-gray-600">• All disputes subject to local jurisdiction</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold mb-8">For {companyName}</p>
              <p className="text-sm border-t border-black pt-1">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* GST Declaration */}
        <div className="mt-4 text-xs text-center text-gray-600 border-t pt-2">
          <p>This is a computer-generated invoice and does not require a physical signature</p>
        </div>
      </div>
    );
  }
);

GSTInvoice.displayName = "GSTInvoice";
