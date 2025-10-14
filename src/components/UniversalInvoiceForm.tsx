import { useState, useEffect } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { calculateLineTax, getDefaultTaxRate, formatCurrency, getCurrencySymbol, convertAmount } from "@/utils/taxCalculations";
import { cn } from "@/lib/utils";

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
];

interface LineItem {
  id?: string;
  product_name: string;
  description?: string;
  hsn_sac_code?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  zero_rated: boolean;
  rcm: boolean;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  tax_amount: number;
  total_amount: number;
}

interface UniversalInvoiceFormProps {
  type: "sale" | "purchase";
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  initialData?: any;
  isIGST?: boolean;
}

export function UniversalInvoiceForm({
  type,
  onSubmit,
  onCancel,
  initialData,
  isIGST = false,
}: UniversalInvoiceFormProps) {
  const { settings, loading: settingsLoading } = useBusinessSettings();
  const [submitting, setSubmitting] = useState(false);

  // Header fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [partyState, setPartyState] = useState("");
  const [partyGstin, setPartyGstin] = useState("");
  const [fxCurrency, setFxCurrency] = useState<string>("");
  const [fxRate, setFxRate] = useState(1.0);
  const [notes, setNotes] = useState("");

  // Line items
  const [lines, setLines] = useState<LineItem[]>([
    {
      product_name: "",
      description: "",
      hsn_sac_code: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      zero_rated: false,
      rcm: false,
      subtotal: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      tax_amount: 0,
      total_amount: 0,
    },
  ]);

  useEffect(() => {
    if (settings.currency && !fxCurrency) {
      setFxCurrency(settings.currency);
    }
  }, [settings.currency]);

  useEffect(() => {
    if (initialData) {
      // Load initial data for editing
      setInvoiceNumber(initialData.invoice_number || "");
      setTransactionDate(initialData.transaction_date || new Date().toISOString().split("T")[0]);
      setDueDate(initialData.due_date || "");
      setPartyName(type === "sale" ? initialData.customer_name : initialData.supplier_name || "");
      setPartyAddress(type === "sale" ? initialData.customer_address : initialData.supplier_address || "");
      setPartyState(type === "sale" ? initialData.customer_state : initialData.supplier_state || "");
      setPartyGstin(type === "sale" ? initialData.customer_gstin : initialData.supplier_gstin || "");
      setFxCurrency(initialData.fx_currency || settings.currency);
      setFxRate(initialData.fx_rate_to_base || 1.0);
      setNotes(initialData.notes || "");
    }
  }, [initialData, type, settings.currency]);

  const updateLine = (index: number, field: keyof LineItem, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Recalculate line totals
    const line = newLines[index];
    const subtotal = line.quantity * line.unit_price;
    line.subtotal = subtotal;

    // Calculate tax based on regime
    const taxBreakdown = calculateLineTax(
      {
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        zero_rated: line.zero_rated,
        rcm: line.rcm,
      },
      settings.tax_regime,
      isIGST
    );

    line.cgst_amount = taxBreakdown.cgst;
    line.sgst_amount = taxBreakdown.sgst;
    line.igst_amount = taxBreakdown.igst;
    line.tax_amount = taxBreakdown.total;
    line.total_amount = subtotal + taxBreakdown.total;

    setLines(newLines);
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        product_name: "",
        description: "",
        hsn_sac_code: "",
        quantity: 1,
        unit_price: 0,
        tax_rate: getDefaultTaxRate(settings.tax_regime),
        zero_rated: false,
        rcm: false,
        subtotal: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        tax_amount: 0,
        total_amount: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const cgstTotal = lines.reduce((sum, line) => sum + line.cgst_amount, 0);
    const sgstTotal = lines.reduce((sum, line) => sum + line.sgst_amount, 0);
    const igstTotal = lines.reduce((sum, line) => sum + line.igst_amount, 0);
    const taxTotal = lines.reduce((sum, line) => sum + line.tax_amount, 0);
    const grandTotal = lines.reduce((sum, line) => sum + line.total_amount, 0);

    return { subtotal, cgstTotal, sgstTotal, igstTotal, taxTotal, grandTotal };
  };

  const totals = calculateTotals();
  const grandTotalInBase = convertAmount(totals.grandTotal, fxRate);
  const showFxConversion = fxCurrency !== settings.base_currency && fxRate !== 1.0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!invoiceNumber || !partyName) {
      return;
    }

    if (lines.some((line) => !line.product_name || line.quantity <= 0)) {
      return;
    }

    setSubmitting(true);
    try {
      const invoiceData = {
        invoice_number: invoiceNumber,
        transaction_date: transactionDate,
        due_date: dueDate || null,
        ...(type === "sale"
          ? {
              customer_name: partyName,
              customer_address: partyAddress,
              customer_state: partyState,
              customer_gstin: partyGstin,
            }
          : {
              supplier_name: partyName,
              supplier_address: partyAddress,
              supplier_state: partyState,
              supplier_gstin: partyGstin,
            }),
        fx_currency: fxCurrency !== settings.base_currency ? fxCurrency : null,
        fx_rate_to_base: fxCurrency !== settings.base_currency ? fxRate : 1.0,
        tax_regime: settings.tax_regime,
        total_amount: totals.subtotal,
        tax_amount: totals.taxTotal,
        cgst_amount: totals.cgstTotal,
        sgst_amount: totals.sgstTotal,
        igst_amount: totals.igstTotal,
        grand_total: totals.grandTotal,
        is_igst: isIGST,
        notes,
        lines: lines.map((line) => ({
          product_name: line.product_name,
          description: line.description || "",
          hsn_sac_code: line.hsn_sac_code || null,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          zero_rated: line.zero_rated,
          rcm: line.rcm,
          subtotal: line.subtotal,
          cgst_amount: line.cgst_amount,
          sgst_amount: line.sgst_amount,
          igst_amount: line.igst_amount,
          tax_amount: line.tax_amount,
          total_amount: line.total_amount,
        })),
      };

      await onSubmit(invoiceData);
    } finally {
      setSubmitting(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  const showHSN = settings.tax_regime === "IND_GST";
  const showCGSTSGST = settings.tax_regime === "IND_GST" && !isIGST;
  const showIGST = settings.tax_regime === "IND_GST" && isIGST;
  const showVAT = settings.tax_regime === "UAE_VAT" || settings.tax_regime === "GENERIC_VAT";
  const showTaxColumns = settings.tax_regime !== "NO_TAX";
  const showZeroRated = settings.tax_regime === "UAE_VAT" || settings.tax_regime === "GENERIC_VAT";
  const showRCM = settings.tax_regime === "UAE_VAT";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Regime Banner */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tax Regime:</strong> {settings.tax_regime === "IND_GST" && "India GST"}
          {settings.tax_regime === "UAE_VAT" && "UAE VAT (5%)"}
          {settings.tax_regime === "GENERIC_VAT" && "Generic VAT"}
          {settings.tax_regime === "NO_TAX" && "No Tax"}
          {showTaxColumns && settings.tax_regime === "IND_GST" && (
            <span className="ml-2 text-xs">
              ({isIGST ? "IGST" : "CGST + SGST"} Mode)
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Invoice Header */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Invoice Number *</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
                required
              />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{type === "sale" ? "Customer" : "Supplier"} Name *</Label>
              <Input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="Enter name"
                required
              />
            </div>
            <div>
              <Label>{settings.business_tax_id_label || "Tax ID"}</Label>
              <Input
                value={partyGstin}
                onChange={(e) => setPartyGstin(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <Label>Address</Label>
            <Textarea
              value={partyAddress}
              onChange={(e) => setPartyAddress(e.target.value)}
              placeholder="Address (optional)"
              rows={2}
            />
          </div>

          {settings.tax_regime === "IND_GST" && (
            <div>
              <Label>State</Label>
              <Input
                value={partyState}
                onChange={(e) => setPartyState(e.target.value)}
                placeholder="State name"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currency & FX */}
      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Invoice Currency</Label>
              <Select value={fxCurrency} onValueChange={setFxCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {fxCurrency !== settings.base_currency && (
              <div>
                <Label>FX Rate (to {settings.base_currency})</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={fxRate}
                  onChange={(e) => setFxRate(parseFloat(e.target.value) || 1.0)}
                  min="0.0001"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  1 {fxCurrency} = {fxRate} {settings.base_currency}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button type="button" onClick={addLine} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {settings.tax_regime === "NO_TAX" && (
            <Alert className="mb-4">
              <AlertDescription>
                No tax applied for current tax regime. Only subtotals will be calculated.
              </AlertDescription>
            </Alert>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-semibold">#</th>
                  <th className="text-left p-2 text-sm font-semibold min-w-[150px]">Item</th>
                  {showHSN && (
                    <th className="text-left p-2 text-sm font-semibold">HSN/SAC</th>
                  )}
                  <th className="text-right p-2 text-sm font-semibold">Qty</th>
                  <th className="text-right p-2 text-sm font-semibold">Rate</th>
                  <th className="text-right p-2 text-sm font-semibold">Subtotal</th>
                  {showTaxColumns && (
                    <>
                      <th className="text-center p-2 text-sm font-semibold">Tax%</th>
                      {showCGSTSGST && (
                        <>
                          <th className="text-right p-2 text-sm font-semibold">CGST</th>
                          <th className="text-right p-2 text-sm font-semibold">SGST</th>
                        </>
                      )}
                      {showIGST && (
                        <th className="text-right p-2 text-sm font-semibold">IGST</th>
                      )}
                      {showVAT && (
                        <th className="text-right p-2 text-sm font-semibold">VAT</th>
                      )}
                      {showZeroRated && (
                        <th className="text-center p-2 text-sm font-semibold">Zero-Rated</th>
                      )}
                      {showRCM && (
                        <th className="text-center p-2 text-sm font-semibold">RCM</th>
                      )}
                    </>
                  )}
                  <th className="text-right p-2 text-sm font-semibold">Total</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 text-sm">{index + 1}</td>
                    <td className="p-2">
                      <Input
                        value={line.product_name}
                        onChange={(e) => updateLine(index, "product_name", e.target.value)}
                        placeholder="Product/Service"
                        className="h-9"
                        required
                      />
                    </td>
                    {showHSN && (
                      <td className="p-2">
                        <Input
                          value={line.hsn_sac_code || ""}
                          onChange={(e) => updateLine(index, "hsn_sac_code", e.target.value)}
                          placeholder="Code"
                          className="h-9 w-24"
                        />
                      </td>
                    )}
                    <td className="p-2">
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value) || 0)}
                        className="h-9 w-20 text-right"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={line.unit_price}
                        onChange={(e) => updateLine(index, "unit_price", parseFloat(e.target.value) || 0)}
                        className="h-9 w-24 text-right"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="p-2 text-right text-sm">
                      {formatCurrency(line.subtotal, fxCurrency, settings.number_format)}
                    </td>
                    {showTaxColumns && (
                      <>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={line.tax_rate}
                            onChange={(e) => updateLine(index, "tax_rate", parseFloat(e.target.value) || 0)}
                            className="h-9 w-16 text-center"
                            min="0"
                            max="100"
                            step="0.01"
                          />
                        </td>
                        {showCGSTSGST && (
                          <>
                            <td className="p-2 text-right text-sm">
                              {formatCurrency(line.cgst_amount, fxCurrency, settings.number_format)}
                            </td>
                            <td className="p-2 text-right text-sm">
                              {formatCurrency(line.sgst_amount, fxCurrency, settings.number_format)}
                            </td>
                          </>
                        )}
                        {showIGST && (
                          <td className="p-2 text-right text-sm">
                            {formatCurrency(line.igst_amount, fxCurrency, settings.number_format)}
                          </td>
                        )}
                        {showVAT && (
                          <td className="p-2 text-right text-sm">
                            {formatCurrency(line.tax_amount, fxCurrency, settings.number_format)}
                          </td>
                        )}
                        {showZeroRated && (
                          <td className="p-2 text-center">
                            <Checkbox
                              checked={line.zero_rated}
                              onCheckedChange={(checked) =>
                                updateLine(index, "zero_rated", !!checked)
                              }
                            />
                          </td>
                        )}
                        {showRCM && (
                          <td className="p-2 text-center">
                            <Checkbox
                              checked={line.rcm}
                              onCheckedChange={(checked) => updateLine(index, "rcm", !!checked)}
                            />
                          </td>
                        )}
                      </>
                    )}
                    <td className="p-2 text-right text-sm font-semibold">
                      {formatCurrency(line.total_amount, fxCurrency, settings.number_format)}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        onClick={() => removeLine(index)}
                        size="sm"
                        variant="ghost"
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">Subtotal:</span>
            <span className="font-semibold">
              {getCurrencySymbol(fxCurrency)} {formatCurrency(totals.subtotal, fxCurrency, settings.number_format)}
            </span>
          </div>

          {showTaxColumns && (
            <>
              {showCGSTSGST && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>CGST:</span>
                    <span>{getCurrencySymbol(fxCurrency)} {formatCurrency(totals.cgstTotal, fxCurrency, settings.number_format)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>SGST:</span>
                    <span>{getCurrencySymbol(fxCurrency)} {formatCurrency(totals.sgstTotal, fxCurrency, settings.number_format)}</span>
                  </div>
                </>
              )}
              {showIGST && (
                <div className="flex justify-between text-sm">
                  <span>IGST:</span>
                  <span>{getCurrencySymbol(fxCurrency)} {formatCurrency(totals.igstTotal, fxCurrency, settings.number_format)}</span>
                </div>
              )}
              {showVAT && (
                <div className="flex justify-between text-sm">
                  <span>VAT:</span>
                  <span>{getCurrencySymbol(fxCurrency)} {formatCurrency(totals.taxTotal, fxCurrency, settings.number_format)}</span>
                </div>
              )}
            </>
          )}

          <div className="border-t pt-3 flex justify-between text-lg">
            <span className="font-bold">Grand Total:</span>
            <span className="font-bold">
              {getCurrencySymbol(fxCurrency)} {formatCurrency(totals.grandTotal, fxCurrency, settings.number_format)}
            </span>
          </div>

          {showFxConversion && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>In {settings.base_currency}:</span>
              <span>
                {getCurrencySymbol(settings.base_currency)} {formatCurrency(grandTotalInBase, settings.base_currency, settings.number_format)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <div>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes or terms"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? "Saving..." : initialData ? "Update Invoice" : "Save Invoice"}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}
