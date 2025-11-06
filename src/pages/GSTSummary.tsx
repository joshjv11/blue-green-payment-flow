import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/PageTransition";
import { BackToDashboard } from "@/components/BackToDashboard";

import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface GSTSummaryData {
  month: string;
  transaction_type: string;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  total_amount: number;
}

export default function GSTSummary() {
  const [summaryData, setSummaryData] = useState<GSTSummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    fetchGSTSummary();
  }, [selectedMonth]);

  const fetchGSTSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

      // Fetch sales data
      const { data: salesData, error: salesError } = await supabase
        .from("sales_orders")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"));

      if (salesError) throw salesError;

      // Fetch purchase data
      const { data: purchaseData, error: purchaseError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"));

      if (purchaseError) throw purchaseError;

      // Aggregate data
      const salesSummary = {
        month: format(selectedMonth, "MMMM yyyy"),
        transaction_type: "Sales",
        total_cgst: salesData?.reduce((sum, s) => sum + (Number(s.cgst_amount) || 0), 0) || 0,
        total_sgst: salesData?.reduce((sum, s) => sum + (Number(s.sgst_amount) || 0), 0) || 0,
        total_igst: salesData?.reduce((sum, s) => sum + (Number(s.igst_amount) || 0), 0) || 0,
        total_tax: salesData?.reduce((sum, s) => sum + (Number(s.tax_amount) || 0), 0) || 0,
        total_amount: salesData?.reduce((sum, s) => sum + (Number(s.grand_total) || 0), 0) || 0,
      };

      const purchaseSummary = {
        month: format(selectedMonth, "MMMM yyyy"),
        transaction_type: "Purchases",
        total_cgst: purchaseData?.reduce((sum, p) => sum + (Number(p.cgst_amount) || 0), 0) || 0,
        total_sgst: purchaseData?.reduce((sum, p) => sum + (Number(p.sgst_amount) || 0), 0) || 0,
        total_igst: purchaseData?.reduce((sum, p) => sum + (Number(p.igst_amount) || 0), 0) || 0,
        total_tax: purchaseData?.reduce((sum, p) => sum + (Number(p.tax_amount) || 0), 0) || 0,
        total_amount: purchaseData?.reduce((sum, p) => sum + (Number(p.grand_total) || 0), 0) || 0,
      };

      setSummaryData([salesSummary, purchaseSummary]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    // Create CSV content
    const headers = ["Type", "CGST", "SGST", "IGST", "Total Tax", "Total Amount"];
    const rows = summaryData.map(row => [
      row.transaction_type,
      row.total_cgst.toFixed(2),
      row.total_sgst.toFixed(2),
      row.total_igst.toFixed(2),
      row.total_tax.toFixed(2),
      row.total_amount.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GST_Summary_${format(selectedMonth, "MMM_yyyy")}.csv`;
    a.click();
    
    toast({ title: "Exported successfully" });
  };

  const totalCGST = summaryData.reduce((sum, d) => sum + d.total_cgst, 0);
  const totalSGST = summaryData.reduce((sum, d) => sum + d.total_sgst, 0);
  const totalIGST = summaryData.reduce((sum, d) => sum + d.total_igst, 0);
  const totalTax = totalCGST + totalSGST + totalIGST;

  return (
    <PageTransition>
    <div className="container mx-auto p-4 md:p-6 space-y-6">
        <BackToDashboard />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">GST Summary Report</h1>
            <p className="text-muted-foreground">Monthly GST breakdown for filing</p>
          </div>

          <div className="flex gap-2">
            <Select
              value={format(selectedMonth, "yyyy-MM")}
              onValueChange={(value) => setSelectedMonth(new Date(value + "-01"))}
            >
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

            <Button onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total CGST</p>
                <p className="text-2xl font-bold mt-2">₹{totalCGST.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-primary opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total SGST</p>
                <p className="text-2xl font-bold mt-2">₹{totalSGST.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-primary opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total IGST</p>
                <p className="text-2xl font-bold mt-2">₹{totalIGST.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-primary opacity-20" />
            </div>
          </Card>

          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tax</p>
                <p className="text-2xl font-bold mt-2 text-primary">₹{totalTax.toFixed(2)}</p>
              </div>
              <FileText className="h-10 w-10 text-primary opacity-20" />
            </div>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Transaction Type</th>
                  <th className="text-right p-4 font-semibold">CGST (₹)</th>
                  <th className="text-right p-4 font-semibold">SGST (₹)</th>
                  <th className="text-right p-4 font-semibold">IGST (₹)</th>
                  <th className="text-right p-4 font-semibold">Total Tax (₹)</th>
                  <th className="text-right p-4 font-semibold">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      Loading GST summary...
                    </td>
                  </tr>
                ) : summaryData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      No transactions found for selected month
                    </td>
                  </tr>
                ) : (
                  <>
                    {summaryData.map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="p-4 font-medium">{row.transaction_type}</td>
                        <td className="p-4 text-right">₹{row.total_cgst.toFixed(2)}</td>
                        <td className="p-4 text-right">₹{row.total_sgst.toFixed(2)}</td>
                        <td className="p-4 text-right">₹{row.total_igst.toFixed(2)}</td>
                        <td className="p-4 text-right font-medium">₹{row.total_tax.toFixed(2)}</td>
                        <td className="p-4 text-right font-bold">₹{row.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                      <td className="p-4">TOTAL</td>
                      <td className="p-4 text-right">₹{totalCGST.toFixed(2)}</td>
                      <td className="p-4 text-right">₹{totalSGST.toFixed(2)}</td>
                      <td className="p-4 text-right">₹{totalIGST.toFixed(2)}</td>
                      <td className="p-4 text-right text-primary">₹{totalTax.toFixed(2)}</td>
                      <td className="p-4 text-right text-primary">
                        ₹{summaryData.reduce((sum, d) => sum + d.total_amount, 0).toFixed(2)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* GST Filing Information */}
        <Card className="p-6 bg-muted/30">
          <h3 className="font-semibold mb-2">GST Filing Information</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• CGST and SGST apply to intrastate transactions (within same state)</p>
            <p>• IGST applies to interstate transactions (between different states)</p>
            <p>• Use this summary for GSTR-1 (outward supplies) and GSTR-3B filing</p>
            <p>• Ensure all invoice details match with GSTN portal data</p>
          </div>
        </Card>
    </div>
  </PageTransition>
  );
}
