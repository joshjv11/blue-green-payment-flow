import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { exportTaxReportCSV, exportGSTR1CSV, exportGSTR3BCSV, exportUAEVATCSV, exportGenericVATCSV } from "@/utils/taxReportExports";
import { getCurrencySymbol } from "@/utils/taxCalculations";

interface TaxData {
  month: string;
  sales_taxable: number;
  sales_cgst: number;
  sales_sgst: number;
  sales_igst: number;
  sales_vat: number;
  purchase_taxable: number;
  purchase_cgst: number;
  purchase_sgst: number;
  purchase_igst: number;
  purchase_vat: number;
}

export default function TaxSummary() {
  const [taxData, setTaxData] = useState<TaxData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const { toast } = useToast();
  const { settings, loading: settingsLoading } = useBusinessSettings();

  const taxRegime = settings.tax_regime;
  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    if (!settingsLoading) {
      fetchTaxData();
    }
  }, [selectedMonth, settingsLoading]);

  const fetchTaxData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

      // Fetch sales orders
      const { data: salesData, error: salesError } = await supabase
        .from("sales_orders")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"));

      if (salesError) throw salesError;

      // Fetch purchase orders
      const { data: purchaseData, error: purchaseError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"));

      if (purchaseError) throw purchaseError;

      // Aggregate data
      const monthData: TaxData = {
        month: format(selectedMonth, "MMMM yyyy"),
        sales_taxable: salesData?.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) || 0,
        sales_cgst: salesData?.reduce((sum, s) => sum + (Number(s.cgst_amount) || 0), 0) || 0,
        sales_sgst: salesData?.reduce((sum, s) => sum + (Number(s.sgst_amount) || 0), 0) || 0,
        sales_igst: salesData?.reduce((sum, s) => sum + (Number(s.igst_amount) || 0), 0) || 0,
        sales_vat: salesData?.reduce((sum, s) => sum + (Number(s.tax_amount) || 0), 0) || 0,
        purchase_taxable: purchaseData?.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0) || 0,
        purchase_cgst: purchaseData?.reduce((sum, p) => sum + (Number(p.cgst_amount) || 0), 0) || 0,
        purchase_sgst: purchaseData?.reduce((sum, p) => sum + (Number(p.sgst_amount) || 0), 0) || 0,
        purchase_igst: purchaseData?.reduce((sum, p) => sum + (Number(p.igst_amount) || 0), 0) || 0,
        purchase_vat: purchaseData?.reduce((sum, p) => sum + (Number(p.tax_amount) || 0), 0) || 0,
      };

      setTaxData([monthData]);
    } catch (error: any) {
      toast({
        title: "Error loading tax data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || taxData.length === 0) return;

      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

      // Fetch detailed data for export
      const { data: salesData } = await supabase
        .from("sales_orders")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"));

      const { data: purchaseData } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"));

      let csv = "";
      let fileName = "";

      switch (type) {
        case "gstr1":
          csv = exportGSTR1CSV(salesData as any || [], settings);
          fileName = `GSTR1_Draft_${format(selectedMonth, "MMM_yyyy")}.csv`;
          break;
        case "gstr3b":
          csv = exportGSTR3BCSV(salesData as any || [], purchaseData as any || [], settings);
          fileName = `GSTR3B_Draft_${format(selectedMonth, "MMM_yyyy")}.csv`;
          break;
        case "uae_vat":
          csv = exportUAEVATCSV(salesData as any || [], purchaseData as any || [], settings);
          fileName = `UAE_VAT_Return_${format(selectedMonth, "MMM_yyyy")}.csv`;
          break;
        case "generic_vat":
          csv = exportGenericVATCSV(salesData as any || [], purchaseData as any || [], settings);
          fileName = `VAT_Report_${format(selectedMonth, "MMM_yyyy")}.csv`;
          break;
        default:
          csv = exportTaxReportCSV(salesData as any || [], purchaseData as any || [], settings);
          fileName = `Tax_Report_${format(selectedMonth, "MMM_yyyy")}.csv`;
      }

      // Download CSV
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();

      // Log export
      await supabase.from("export_logs").insert({
        user_id: user.id,
        export_type: `tax_${type}`,
        file_name: fileName,
        file_format: "csv",
        date_from: format(startDate, "yyyy-MM-dd"),
        date_to: format(endDate, "yyyy-MM-dd"),
        record_count: (salesData?.length || 0) + (purchaseData?.length || 0),
      });

      toast({ title: "Export successful", description: `Downloaded ${fileName}` });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || settingsLoading) {
    return <div className="text-center py-12">Loading tax summary...</div>;
  }

  const currentData = taxData[0];

  // Regime-specific rendering
  if (taxRegime === "NO_TAX") {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Tax Regime Selected</h3>
          <p className="text-muted-foreground">
            Your business settings indicate no tax is collected under the current regime.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex justify-between items-center">
        <Select
          value={format(selectedMonth, "yyyy-MM")}
          onValueChange={(value) => setSelectedMonth(new Date(value + "-01"))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const date = subMonths(new Date(), i);
              return (
                <SelectItem key={i} value={format(date, "yyyy-MM")}>
                  {format(date, "MMMM yyyy")}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {taxRegime === "IND_GST" && (
            <>
              <Button onClick={() => handleExport("gstr1")} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                GSTR-1 Draft
              </Button>
              <Button onClick={() => handleExport("gstr3b")} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                GSTR-3B Draft
              </Button>
            </>
          )}
          {taxRegime === "UAE_VAT" && (
            <Button onClick={() => handleExport("uae_vat")} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              UAE VAT Return
            </Button>
          )}
          {taxRegime === "GENERIC_VAT" && (
            <Button onClick={() => handleExport("generic_vat")} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              VAT Report CSV
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards - IND_GST */}
      {taxRegime === "IND_GST" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CGST</p>
                  <p className="text-2xl font-bold mt-2">
                    {currencySymbol}
                    {(currentData.sales_cgst - currentData.purchase_cgst).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">SGST</p>
                  <p className="text-2xl font-bold mt-2">
                    {currencySymbol}
                    {(currentData.sales_sgst - currentData.purchase_sgst).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">IGST</p>
                  <p className="text-2xl font-bold mt-2">
                    {currencySymbol}
                    {(currentData.sales_igst - currentData.purchase_igst).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Liability</p>
                  <p className="text-2xl font-bold mt-2 text-primary">
                    {currencySymbol}
                    {(
                      currentData.sales_cgst +
                      currentData.sales_sgst +
                      currentData.sales_igst -
                      currentData.purchase_cgst -
                      currentData.purchase_sgst -
                      currentData.purchase_igst
                    ).toFixed(2)}
                  </p>
                </div>
                <FileText className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Cards - UAE_VAT */}
      {taxRegime === "UAE_VAT" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">VAT on Sales</p>
                  <p className="text-2xl font-bold mt-2">
                    {currencySymbol}
                    {currentData.sales_vat.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">VAT on Purchases</p>
                  <p className="text-2xl font-bold mt-2">
                    {currencySymbol}
                    {currentData.purchase_vat.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net VAT Payable</p>
                  <p className="text-2xl font-bold mt-2 text-primary">
                    {currencySymbol}
                    {(currentData.sales_vat - currentData.purchase_vat).toFixed(2)}
                  </p>
                </div>
                <FileText className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Cards - GENERIC_VAT */}
      {taxRegime === "GENERIC_VAT" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">VAT Collected</p>
                  <p className="text-2xl font-bold mt-2">
                    {currencySymbol}
                    {currentData.sales_vat.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">VAT Paid</p>
                  <p className="text-2xl font-bold mt-2">
                    {currencySymbol}
                    {currentData.purchase_vat.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net VAT</p>
                  <p className="text-2xl font-bold mt-2 text-primary">
                    {currencySymbol}
                    {(currentData.sales_vat - currentData.purchase_vat).toFixed(2)}
                  </p>
                </div>
                <FileText className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              sales: { label: "Sales", color: "hsl(var(--primary))" },
              purchases: { label: "Purchases", color: "hsl(var(--secondary))" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taxData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                {taxRegime === "IND_GST" && (
                  <>
                    <Bar dataKey="sales_cgst" name="CGST (Sales)" fill="hsl(var(--primary))" />
                    <Bar dataKey="sales_sgst" name="SGST (Sales)" fill="hsl(var(--primary))" />
                    <Bar dataKey="sales_igst" name="IGST (Sales)" fill="hsl(var(--primary))" />
                  </>
                )}
                {(taxRegime === "UAE_VAT" || taxRegime === "GENERIC_VAT") && (
                  <>
                    <Bar dataKey="sales_vat" name="VAT Collected" fill="hsl(var(--primary))" />
                    <Bar dataKey="purchase_vat" name="VAT Paid" fill="hsl(var(--secondary))" />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Type</th>
                  <th className="text-right p-4 font-semibold">Taxable Value</th>
                  {taxRegime === "IND_GST" && (
                    <>
                      <th className="text-right p-4 font-semibold">CGST</th>
                      <th className="text-right p-4 font-semibold">SGST</th>
                      <th className="text-right p-4 font-semibold">IGST</th>
                    </>
                  )}
                  {(taxRegime === "UAE_VAT" || taxRegime === "GENERIC_VAT") && (
                    <th className="text-right p-4 font-semibold">VAT</th>
                  )}
                  <th className="text-right p-4 font-semibold">Total Tax</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-background">
                  <td className="p-4 font-medium">Sales</td>
                  <td className="p-4 text-right">
                    {currencySymbol}
                    {currentData.sales_taxable.toFixed(2)}
                  </td>
                  {taxRegime === "IND_GST" && (
                    <>
                      <td className="p-4 text-right">
                        {currencySymbol}
                        {currentData.sales_cgst.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        {currencySymbol}
                        {currentData.sales_sgst.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        {currencySymbol}
                        {currentData.sales_igst.toFixed(2)}
                      </td>
                    </>
                  )}
                  {(taxRegime === "UAE_VAT" || taxRegime === "GENERIC_VAT") && (
                    <td className="p-4 text-right">
                      {currencySymbol}
                      {currentData.sales_vat.toFixed(2)}
                    </td>
                  )}
                  <td className="p-4 text-right font-medium">
                    {currencySymbol}
                    {taxRegime === "IND_GST"
                      ? (currentData.sales_cgst + currentData.sales_sgst + currentData.sales_igst).toFixed(2)
                      : currentData.sales_vat.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-muted/20">
                  <td className="p-4 font-medium">Purchases</td>
                  <td className="p-4 text-right">
                    {currencySymbol}
                    {currentData.purchase_taxable.toFixed(2)}
                  </td>
                  {taxRegime === "IND_GST" && (
                    <>
                      <td className="p-4 text-right">
                        {currencySymbol}
                        {currentData.purchase_cgst.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        {currencySymbol}
                        {currentData.purchase_sgst.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        {currencySymbol}
                        {currentData.purchase_igst.toFixed(2)}
                      </td>
                    </>
                  )}
                  {(taxRegime === "UAE_VAT" || taxRegime === "GENERIC_VAT") && (
                    <td className="p-4 text-right">
                      {currencySymbol}
                      {currentData.purchase_vat.toFixed(2)}
                    </td>
                  )}
                  <td className="p-4 text-right font-medium">
                    {currencySymbol}
                    {taxRegime === "IND_GST"
                      ? (currentData.purchase_cgst + currentData.purchase_sgst + currentData.purchase_igst).toFixed(2)
                      : currentData.purchase_vat.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Filing Information */}
      {taxRegime === "IND_GST" && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">GST Filing Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• CGST and SGST apply to intrastate transactions (within same state)</p>
            <p>• IGST applies to interstate transactions (between different states)</p>
            <p>• Use GSTR-1 export for outward supplies and GSTR-3B for monthly returns</p>
            <p>• Ensure all invoice details match with GSTN portal data</p>
          </CardContent>
        </Card>
      )}

      {taxRegime === "UAE_VAT" && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">UAE VAT Filing Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• Standard VAT rate in UAE is 5%</p>
            <p>• VAT returns are filed quarterly for most businesses</p>
            <p>• Use the UAE VAT Return export for FTA portal submission</p>
            <p>• Registered under UAE Federal Law No. 8 of 2017</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
