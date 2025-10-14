import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Download, Package, Calendar as CalendarIcon, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/PageTransition";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import {
  convertSalesToTally,
  convertPurchasesToTally,
  generateTallyCSV,
  generateGSTSummaryCSV,
  downloadCSV,
  type SalesOrderExport,
  type PurchaseOrderExport,
} from "@/utils/tallyExport";

interface ExportLog {
  id: string;
  export_type: string;
  file_name: string;
  file_format: string;
  record_count: number;
  created_at: string;
}

export default function Exports() {
  const [loading, setLoading] = useState(false);
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const { toast } = useToast();

  useEffect(() => {
    fetchExportLogs();
  }, []);

  useEffect(() => {
    const date = new Date(selectedMonth + "-01");
    setDateFrom(startOfMonth(date));
    setDateTo(endOfMonth(date));
  }, [selectedMonth]);

  const fetchExportLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("export_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setExportLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching export logs:", error);
    }
  };

  const logExport = async (
    exportType: string,
    fileName: string,
    fileFormat: string,
    recordCount: number
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("export_logs").insert([
        {
          user_id: user.id,
          export_type: exportType,
          file_name: fileName,
          file_format: fileFormat,
          date_from: format(dateFrom, "yyyy-MM-dd"),
          date_to: format(dateTo, "yyyy-MM-dd"),
          record_count: recordCount,
        },
      ]);

      fetchExportLogs();
    } catch (error: any) {
      console.error("Error logging export:", error);
    }
  };

  const exportSalesReport = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch sales orders with order lines
      const { data: salesData, error: salesError } = await supabase
        .from("sales_orders")
        .select(`
          invoice_number,
          transaction_date,
          customer_name,
          customer_gstin
        `)
        .eq("user_id", user.id)
        .gte("transaction_date", format(dateFrom, "yyyy-MM-dd"))
        .lte("transaction_date", format(dateTo, "yyyy-MM-dd"))
        .order("transaction_date", { ascending: true });

      if (salesError) throw salesError;

      // Fetch order lines for each sale
      const salesWithLines: SalesOrderExport[] = await Promise.all(
        (salesData || []).map(async (sale) => {
          const { data: lines } = await supabase
            .from("order_lines")
            .select("*")
            .eq("order_type", "sale")
            .eq("order_id", (await supabase
              .from("sales_orders")
              .select("id")
              .eq("invoice_number", sale.invoice_number)
              .eq("user_id", user.id)
              .single()).data?.id || "");

          return {
            ...sale,
            order_lines: lines || [],
          };
        })
      );

      const tallyData = convertSalesToTally(salesWithLines);
      const csv = generateTallyCSV(tallyData);
      const fileName = `Sales_Report_${format(dateFrom, "dd-MMM-yyyy")}_to_${format(dateTo, "dd-MMM-yyyy")}.csv`;
      
      downloadCSV(csv, fileName);
      await logExport("sales", fileName, "csv", tallyData.length);

      toast({
        title: "Sales Report Exported",
        description: `${tallyData.length} records exported successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportPurchasesReport = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: purchaseData, error: purchaseError } = await supabase
        .from("purchase_orders")
        .select(`
          invoice_number,
          transaction_date,
          supplier_name,
          supplier_gstin
        `)
        .eq("user_id", user.id)
        .gte("transaction_date", format(dateFrom, "yyyy-MM-dd"))
        .lte("transaction_date", format(dateTo, "yyyy-MM-dd"))
        .order("transaction_date", { ascending: true });

      if (purchaseError) throw purchaseError;

      const purchasesWithLines: PurchaseOrderExport[] = await Promise.all(
        (purchaseData || []).map(async (purchase) => {
          const { data: lines } = await supabase
            .from("order_lines")
            .select("*")
            .eq("order_type", "purchase")
            .eq("order_id", (await supabase
              .from("purchase_orders")
              .select("id")
              .eq("invoice_number", purchase.invoice_number)
              .eq("user_id", user.id)
              .single()).data?.id || "");

          return {
            ...purchase,
            order_lines: lines || [],
          };
        })
      );

      const tallyData = convertPurchasesToTally(purchasesWithLines);
      const csv = generateTallyCSV(tallyData);
      const fileName = `Purchases_Report_${format(dateFrom, "dd-MMM-yyyy")}_to_${format(dateTo, "dd-MMM-yyyy")}.csv`;
      
      downloadCSV(csv, fileName);
      await logExport("purchases", fileName, "csv", tallyData.length);

      toast({
        title: "Purchases Report Exported",
        description: `${tallyData.length} records exported successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportGSTSummary = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: salesData } = await supabase
        .from("sales_orders")
        .select("cgst_amount, sgst_amount, igst_amount")
        .eq("user_id", user.id)
        .gte("transaction_date", format(dateFrom, "yyyy-MM-dd"))
        .lte("transaction_date", format(dateTo, "yyyy-MM-dd"));

      const { data: purchaseData } = await supabase
        .from("purchase_orders")
        .select("cgst_amount, sgst_amount, igst_amount")
        .eq("user_id", user.id)
        .gte("transaction_date", format(dateFrom, "yyyy-MM-dd"))
        .lte("transaction_date", format(dateTo, "yyyy-MM-dd"));

      const salesTotals = {
        cgst: salesData?.reduce((sum, s) => sum + Number(s.cgst_amount || 0), 0) || 0,
        sgst: salesData?.reduce((sum, s) => sum + Number(s.sgst_amount || 0), 0) || 0,
        igst: salesData?.reduce((sum, s) => sum + Number(s.igst_amount || 0), 0) || 0,
        total: 0,
      };
      salesTotals.total = salesTotals.cgst + salesTotals.sgst + salesTotals.igst;

      const purchaseTotals = {
        cgst: purchaseData?.reduce((sum, p) => sum + Number(p.cgst_amount || 0), 0) || 0,
        sgst: purchaseData?.reduce((sum, p) => sum + Number(p.sgst_amount || 0), 0) || 0,
        igst: purchaseData?.reduce((sum, p) => sum + Number(p.igst_amount || 0), 0) || 0,
        total: 0,
      };
      purchaseTotals.total = purchaseTotals.cgst + purchaseTotals.sgst + purchaseTotals.igst;

      const csv = generateGSTSummaryCSV({
        sales: salesTotals,
        purchases: purchaseTotals,
      });

      const fileName = `GST_Summary_${format(dateFrom, "MMM-yyyy")}.csv`;
      downloadCSV(csv, fileName);
      await logExport("gst_summary", fileName, "csv", 3);

      toast({
        title: "GST Summary Exported",
        description: "Tax summary exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportFullPackage = async () => {
    setLoading(true);
    try {
      await exportSalesReport();
      await exportPurchasesReport();
      await exportGSTSummary();
      
      toast({
        title: "Full Package Exported",
        description: "All reports exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLastExport = (type: string) => {
    const log = exportLogs.find((log) => log.export_type === type);
    return log
      ? `${format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")} (${log.record_count} records)`
      : "Never exported";
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">CA-Ready Exports</h1>
            <p className="text-muted-foreground">Download Tally-compatible reports for your accountant</p>
          </div>

          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
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
          </div>
        </div>

        {/* Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sales Report */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                <Badge variant="outline">Tally Compatible</Badge>
              </div>
              <CardTitle className="mt-4">Sales Report</CardTitle>
              <CardDescription>
                Generate detailed sales report for your CA to review and upload to Tally.
                Includes invoice details, party information, HSN/SAC codes, and GST breakdown.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Last Exported:</span> {getLastExport("sales")}
              </div>
              <Button onClick={exportSalesReport} disabled={loading} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Sales Report
              </Button>
            </CardContent>
          </Card>

          {/* Purchases Report */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Package className="h-8 w-8 text-blue-500" />
                <Badge variant="outline">Tally Compatible</Badge>
              </div>
              <CardTitle className="mt-4">Purchases Report</CardTitle>
              <CardDescription>
                Generate comprehensive purchases report with supplier details, HSN/SAC codes,
                and input tax credit information for GST filing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Last Exported:</span> {getLastExport("purchases")}
              </div>
              <Button onClick={exportPurchasesReport} disabled={loading} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Purchases Report
              </Button>
            </CardContent>
          </Card>

          {/* GST Summary */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-orange-500" />
                <Badge variant="outline">GSTR-1 Ready</Badge>
              </div>
              <CardTitle className="mt-4">GST Summary</CardTitle>
              <CardDescription>
                Monthly GST summary with CGST, SGST, and IGST breakdown. Perfect for filing
                GSTR-1 and GSTR-3B returns with complete tax liability details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Last Exported:</span> {getLastExport("gst_summary")}
              </div>
              <Button onClick={exportGSTSummary} disabled={loading} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export GST Summary
              </Button>
            </CardContent>
          </Card>

          {/* Full Package */}
          <Card className="hover:shadow-lg transition-shadow border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <Badge>Recommended</Badge>
              </div>
              <CardTitle className="mt-4">Full CA Package</CardTitle>
              <CardDescription>
                Export all reports at once - Sales, Purchases, and GST Summary. One-click solution
                for complete monthly records ready for your chartered accountant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Last Exported:</span> {getLastExport("full_package")}
              </div>
              <Button onClick={exportFullPackage} disabled={loading} className="w-full" variant="default">
                <Download className="mr-2 h-4 w-4" />
                Export Full Package
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Export History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Exports</CardTitle>
            <CardDescription>Track your export history and download counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exportLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No exports yet. Start by exporting your first report above.
                </p>
              ) : (
                exportLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{log.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")} · {log.record_count} records
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="uppercase text-xs">
                      {log.file_format}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">About Tally Exports</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• All exports are in CSV format, directly importable into Tally ERP 9 and Tally Prime</p>
            <p>• Includes all mandatory fields: Date, Voucher Type, Party Name, GSTIN, HSN/SAC, Tax breakdown</p>
            <p>• GST calculations follow Indian tax compliance standards (CGST+SGST for intrastate, IGST for interstate)</p>
            <p>• Share these files with your CA for seamless book-keeping and GST return filing</p>
            <p>• Export history is maintained for audit trail purposes</p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
