import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { formatCurrency, getCurrencySymbol } from "@/utils/taxCalculations";

// Register fonts (optional - for better typography)
// Font.register({
//   family: 'Inter',
//   src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
// });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #333",
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  column: {
    width: "48%",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottom: "1px solid #ddd",
    paddingBottom: 3,
  },
  text: {
    fontSize: 9,
    marginBottom: 3,
    color: "#333",
  },
  textBold: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 3,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #333",
    padding: 6,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #ddd",
    padding: 6,
    fontSize: 8,
  },
  tableCell: {
    flex: 1,
    textAlign: "left",
  },
  tableCellRight: {
    flex: 1,
    textAlign: "right",
  },
  tableCellCenter: {
    flex: 1,
    textAlign: "center",
  },
  totalsSection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  totalsTable: {
    width: "50%",
    border: "1px solid #333",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    borderBottom: "1px solid #ddd",
  },
  totalsRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    backgroundColor: "#f5f5f5",
    fontWeight: "bold",
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: "1px solid #ddd",
  },
  footerText: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "45%",
    borderTop: "1px solid #333",
    paddingTop: 5,
    marginTop: 40,
  },
  alert: {
    backgroundColor: "#fff3cd",
    border: "1px solid #ffc107",
    padding: 8,
    marginBottom: 15,
    borderRadius: 4,
  },
  alertText: {
    fontSize: 8,
    color: "#856404",
  },
});

interface InvoiceData {
  invoice_number: string;
  transaction_date: string;
  due_date?: string;
  customer_name?: string;
  supplier_name?: string;
  customer_address?: string;
  supplier_address?: string;
  customer_gstin?: string;
  supplier_gstin?: string;
  customer_state?: string;
  supplier_state?: string;
  fx_currency?: string;
  fx_rate_to_base?: number;
  tax_regime: string;
  total_amount: number;
  tax_amount: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  grand_total: number;
  is_igst?: boolean;
  notes?: string;
  lines: Array<{
    product_name: string;
    description?: string;
    hsn_sac_code?: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    zero_rated?: boolean;
    rcm?: boolean;
    subtotal: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    tax_amount: number;
    total_amount: number;
  }>;
}

interface BusinessSettings {
  business_name: string;
  business_address: string;
  country: string;
  currency: string;
  base_currency: string;
  number_format: string;
  tax_regime: string;
  business_tax_id_label: string;
  business_tax_id_value: string;
}

interface PDFProps {
  invoice: InvoiceData;
  businessSettings: BusinessSettings;
  type: "sale" | "purchase";
}

export function InvoicePDFDocument({ invoice, businessSettings, type }: PDFProps) {
  const partyName = type === "sale" ? invoice.customer_name : invoice.supplier_name;
  const partyAddress = type === "sale" ? invoice.customer_address : invoice.supplier_address;
  const partyTaxId = type === "sale" ? invoice.customer_gstin : invoice.supplier_gstin;
  const partyState = type === "sale" ? invoice.customer_state : invoice.supplier_state;
  
  const currency = invoice.fx_currency || businessSettings.currency;
  const symbol = getCurrencySymbol(currency);
  const showFx = invoice.fx_currency && invoice.fx_currency !== businessSettings.base_currency;

  const getInvoiceTitle = () => {
    if (invoice.tax_regime === "NO_TAX") return "COMMERCIAL INVOICE";
    return "TAX INVOICE";
  };

  const renderIndiaGSTTable = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={{ ...styles.tableCell, width: "5%" }}>#</Text>
        <Text style={{ ...styles.tableCell, width: "20%" }}>Item</Text>
        <Text style={{ ...styles.tableCellCenter, width: "10%" }}>HSN/SAC</Text>
        <Text style={{ ...styles.tableCellRight, width: "8%" }}>Qty</Text>
        <Text style={{ ...styles.tableCellRight, width: "12%" }}>Rate</Text>
        <Text style={{ ...styles.tableCellRight, width: "12%" }}>Taxable</Text>
        <Text style={{ ...styles.tableCellCenter, width: "8%" }}>Tax%</Text>
        {!invoice.is_igst && (
          <>
            <Text style={{ ...styles.tableCellRight, width: "10%" }}>CGST</Text>
            <Text style={{ ...styles.tableCellRight, width: "10%" }}>SGST</Text>
          </>
        )}
        {invoice.is_igst && (
          <Text style={{ ...styles.tableCellRight, width: "10%" }}>IGST</Text>
        )}
        <Text style={{ ...styles.tableCellRight, width: "12%" }}>Total</Text>
      </View>
      {invoice.lines.map((line, idx) => (
        <View key={idx} style={styles.tableRow}>
          <Text style={{ ...styles.tableCell, width: "5%" }}>{idx + 1}</Text>
          <Text style={{ ...styles.tableCell, width: "20%" }}>{line.product_name}</Text>
          <Text style={{ ...styles.tableCellCenter, width: "10%" }}>{line.hsn_sac_code || "-"}</Text>
          <Text style={{ ...styles.tableCellRight, width: "8%" }}>{line.quantity}</Text>
          <Text style={{ ...styles.tableCellRight, width: "12%" }}>
            {symbol}{formatCurrency(line.unit_price, currency, businessSettings.number_format)}
          </Text>
          <Text style={{ ...styles.tableCellRight, width: "12%" }}>
            {symbol}{formatCurrency(line.subtotal, currency, businessSettings.number_format)}
          </Text>
          <Text style={{ ...styles.tableCellCenter, width: "8%" }}>{line.tax_rate}%</Text>
          {!invoice.is_igst && (
            <>
              <Text style={{ ...styles.tableCellRight, width: "10%" }}>
                {symbol}{formatCurrency(line.cgst_amount || 0, currency, businessSettings.number_format)}
              </Text>
              <Text style={{ ...styles.tableCellRight, width: "10%" }}>
                {symbol}{formatCurrency(line.sgst_amount || 0, currency, businessSettings.number_format)}
              </Text>
            </>
          )}
          {invoice.is_igst && (
            <Text style={{ ...styles.tableCellRight, width: "10%" }}>
              {symbol}{formatCurrency(line.igst_amount || 0, currency, businessSettings.number_format)}
            </Text>
          )}
          <Text style={{ ...styles.tableCellRight, width: "12%" }}>
            {symbol}{formatCurrency(line.total_amount, currency, businessSettings.number_format)}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderUAEVATTable = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={{ ...styles.tableCell, width: "5%" }}>#</Text>
        <Text style={{ ...styles.tableCell, width: "30%" }}>Item</Text>
        <Text style={{ ...styles.tableCellRight, width: "10%" }}>Qty</Text>
        <Text style={{ ...styles.tableCellRight, width: "15%" }}>Rate (AED)</Text>
        <Text style={{ ...styles.tableCellCenter, width: "10%" }}>VAT%</Text>
        <Text style={{ ...styles.tableCellRight, width: "15%" }}>VAT Amt</Text>
        <Text style={{ ...styles.tableCellRight, width: "15%" }}>Total</Text>
      </View>
      {invoice.lines.map((line, idx) => (
        <View key={idx} style={styles.tableRow}>
          <Text style={{ ...styles.tableCell, width: "5%" }}>{idx + 1}</Text>
          <View style={{ ...styles.tableCell, width: "30%" }}>
            <Text>{line.product_name}</Text>
            {line.zero_rated && <Text style={styles.alertText}>(Zero-Rated)</Text>}
            {line.rcm && <Text style={styles.alertText}>(Reverse Charge)</Text>}
          </View>
          <Text style={{ ...styles.tableCellRight, width: "10%" }}>{line.quantity}</Text>
          <Text style={{ ...styles.tableCellRight, width: "15%" }}>
            {symbol}{formatCurrency(line.unit_price, currency, businessSettings.number_format)}
          </Text>
          <Text style={{ ...styles.tableCellCenter, width: "10%" }}>
            {line.zero_rated || line.rcm ? "0%" : `${line.tax_rate}%`}
          </Text>
          <Text style={{ ...styles.tableCellRight, width: "15%" }}>
            {symbol}{formatCurrency(line.tax_amount, currency, businessSettings.number_format)}
          </Text>
          <Text style={{ ...styles.tableCellRight, width: "15%" }}>
            {symbol}{formatCurrency(line.total_amount, currency, businessSettings.number_format)}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderGenericVATTable = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={{ ...styles.tableCell, width: "5%" }}>#</Text>
        <Text style={{ ...styles.tableCell, width: "35%" }}>Item</Text>
        <Text style={{ ...styles.tableCellRight, width: "10%" }}>Qty</Text>
        <Text style={{ ...styles.tableCellRight, width: "15%" }}>Rate</Text>
        <Text style={{ ...styles.tableCellCenter, width: "10%" }}>VAT%</Text>
        <Text style={{ ...styles.tableCellRight, width: "12%" }}>VAT</Text>
        <Text style={{ ...styles.tableCellRight, width: "13%" }}>Total</Text>
      </View>
      {invoice.lines.map((line, idx) => (
        <View key={idx} style={styles.tableRow}>
          <Text style={{ ...styles.tableCell, width: "5%" }}>{idx + 1}</Text>
          <View style={{ ...styles.tableCell, width: "35%" }}>
            <Text>{line.product_name}</Text>
            {line.zero_rated && <Text style={styles.alertText}>(Zero-Rated)</Text>}
          </View>
          <Text style={{ ...styles.tableCellRight, width: "10%" }}>{line.quantity}</Text>
          <Text style={{ ...styles.tableCellRight, width: "15%" }}>
            {symbol}{formatCurrency(line.unit_price, currency, businessSettings.number_format)}
          </Text>
          <Text style={{ ...styles.tableCellCenter, width: "10%" }}>
            {line.zero_rated ? "0%" : `${line.tax_rate}%`}
          </Text>
          <Text style={{ ...styles.tableCellRight, width: "12%" }}>
            {symbol}{formatCurrency(line.tax_amount, currency, businessSettings.number_format)}
          </Text>
          <Text style={{ ...styles.tableCellRight, width: "13%" }}>
            {symbol}{formatCurrency(line.total_amount, currency, businessSettings.number_format)}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderNoTaxTable = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={{ ...styles.tableCell, width: "5%" }}>#</Text>
        <Text style={{ ...styles.tableCell, width: "45%" }}>Item</Text>
        <Text style={{ ...styles.tableCellRight, width: "15%" }}>Qty</Text>
        <Text style={{ ...styles.tableCellRight, width: "17%" }}>Rate</Text>
        <Text style={{ ...styles.tableCellRight, width: "18%" }}>Total</Text>
      </View>
      {invoice.lines.map((line, idx) => (
        <View key={idx} style={styles.tableRow}>
          <Text style={{ ...styles.tableCell, width: "5%" }}>{idx + 1}</Text>
          <Text style={{ ...styles.tableCell, width: "45%" }}>{line.product_name}</Text>
          <Text style={{ ...styles.tableCellRight, width: "15%" }}>{line.quantity}</Text>
          <Text style={{ ...styles.tableCellRight, width: "17%" }}>
            {symbol}{formatCurrency(line.unit_price, currency, businessSettings.number_format)}
          </Text>
          <Text style={{ ...styles.tableCellRight, width: "18%" }}>
            {symbol}{formatCurrency(line.total_amount, currency, businessSettings.number_format)}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{businessSettings.business_name}</Text>
          <Text style={styles.text}>{businessSettings.business_address}</Text>
          {businessSettings.business_tax_id_value && (
            <Text style={styles.textBold}>
              {businessSettings.business_tax_id_label}: {businessSettings.business_tax_id_value}
            </Text>
          )}
          <Text style={styles.invoiceTitle}>{getInvoiceTitle()}</Text>
        </View>

        {/* Invoice Details & Party Info */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <Text style={styles.text}>Invoice No: {invoice.invoice_number}</Text>
            <Text style={styles.text}>Date: {new Date(invoice.transaction_date).toLocaleDateString()}</Text>
            {invoice.due_date && (
              <Text style={styles.text}>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</Text>
            )}
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>
              {type === "sale" ? "Bill To (Customer)" : "Bill From (Supplier)"}
            </Text>
            <Text style={styles.textBold}>{partyName}</Text>
            {partyAddress && <Text style={styles.text}>{partyAddress}</Text>}
            {partyState && <Text style={styles.text}>State: {partyState}</Text>}
            {partyTaxId && (
              <Text style={styles.text}>
                {businessSettings.business_tax_id_label}: {partyTaxId}
              </Text>
            )}
          </View>
        </View>

        {/* Table based on regime */}
        {invoice.tax_regime === "IND_GST" && renderIndiaGSTTable()}
        {invoice.tax_regime === "UAE_VAT" && renderUAEVATTable()}
        {invoice.tax_regime === "GENERIC_VAT" && renderGenericVATTable()}
        {invoice.tax_regime === "NO_TAX" && renderNoTaxTable()}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.textBold}>Subtotal:</Text>
              <Text style={styles.text}>
                {symbol}{formatCurrency(invoice.total_amount, currency, businessSettings.number_format)}
              </Text>
            </View>
            {invoice.tax_regime !== "NO_TAX" && (
              <>
                {invoice.tax_regime === "IND_GST" && !invoice.is_igst && (
                  <>
                    <View style={styles.totalsRow}>
                      <Text style={styles.text}>CGST:</Text>
                      <Text style={styles.text}>
                        {symbol}{formatCurrency(invoice.cgst_amount || 0, currency, businessSettings.number_format)}
                      </Text>
                    </View>
                    <View style={styles.totalsRow}>
                      <Text style={styles.text}>SGST:</Text>
                      <Text style={styles.text}>
                        {symbol}{formatCurrency(invoice.sgst_amount || 0, currency, businessSettings.number_format)}
                      </Text>
                    </View>
                  </>
                )}
                {invoice.tax_regime === "IND_GST" && invoice.is_igst && (
                  <View style={styles.totalsRow}>
                    <Text style={styles.text}>IGST:</Text>
                    <Text style={styles.text}>
                      {symbol}{formatCurrency(invoice.igst_amount || 0, currency, businessSettings.number_format)}
                    </Text>
                  </View>
                )}
                {(invoice.tax_regime === "UAE_VAT" || invoice.tax_regime === "GENERIC_VAT") && (
                  <View style={styles.totalsRow}>
                    <Text style={styles.text}>VAT:</Text>
                    <Text style={styles.text}>
                      {symbol}{formatCurrency(invoice.tax_amount, currency, businessSettings.number_format)}
                    </Text>
                  </View>
                )}
              </>
            )}
            <View style={styles.totalsRowGrand}>
              <Text style={styles.textBold}>Grand Total:</Text>
              <Text style={styles.textBold}>
                {symbol}{formatCurrency(invoice.grand_total, currency, businessSettings.number_format)}
              </Text>
            </View>
            {showFx && invoice.fx_rate_to_base && (
              <View style={styles.totalsRow}>
                <Text style={styles.footerText}>
                  Approx. {getCurrencySymbol(businessSettings.base_currency)}
                  {formatCurrency(
                    invoice.grand_total * invoice.fx_rate_to_base,
                    businessSettings.base_currency,
                    businessSettings.number_format
                  )}
                </Text>
                <Text style={styles.footerText}>
                  ({businessSettings.base_currency} @ {invoice.fx_rate_to_base})
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Notes:</Text>
            <Text style={styles.text}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {invoice.tax_regime === "IND_GST" && (
            <Text style={styles.footerText}>
              Certified that the particulars given above are true and correct.
            </Text>
          )}
          {invoice.tax_regime === "UAE_VAT" && (
            <Text style={styles.footerText}>
              VAT Registered under UAE Federal Law No. 8 of 2017
            </Text>
          )}
          {invoice.tax_regime === "NO_TAX" && (
            <Text style={styles.footerText}>
              No tax applied under selected tax regime.
            </Text>
          )}
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.footerText}>Customer Signature</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.footerText}>For {businessSettings.business_name}</Text>
            <Text style={styles.footerText}>Authorized Signatory</Text>
          </View>
        </View>

        {/* Digital Note */}
        <View style={{ marginTop: 20, alignItems: "center" }}>
          <Text style={styles.footerText}>
            This is a computer-generated invoice and does not require a physical signature
          </Text>
        </View>
      </Page>
    </Document>
  );
}
