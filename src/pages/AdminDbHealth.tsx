import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Database, Table as TableIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TableCount {
  name: string;
  count: number | null;
  error?: string;
}

const AdminDbHealth = () => {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [tableCounts, setTableCounts] = useState<TableCount[]>([]);
  const { toast } = useToast();

  const supabaseUrl = "https://fbzfddgqfqjuvpjzvhfi.supabase.co";
  const projectRef = "fbzfddgqfqjuvpjzvhfi";

  const fetchDbHealth = async () => {
    setLoading(true);
    try {
      // Fetch tables from information_schema (using any to bypass type restrictions)
      const { data: tablesData, error: tablesError } = await (supabase as any)
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public");

      if (tablesError) {
        // Fallback: try to query known tables directly
        const knownTables = ["customers", "invoices", "bills", "profiles", "user_plans"];
        setTables(knownTables);
      } else {
        setTables(tablesData?.map((t: any) => t.table_name) || []);
      }

      // Fetch row counts for specific tables
      const tablesToCount = ["customers", "invoices", "delivery_logs", "bills", "profiles"];
      const counts: TableCount[] = [];

      for (const tableName of tablesToCount) {
        try {
          const { count, error } = await (supabase as any)
            .from(tableName)
            .select("*", { count: "exact", head: true });

          counts.push({
            name: tableName,
            count: count,
            error: error?.message,
          });
        } catch (err: any) {
          counts.push({
            name: tableName,
            count: null,
            error: err.message || "Table not found or RLS blocked",
          });
        }
      }

      setTableCounts(counts);
      toast({
        title: "Database health refreshed",
        description: "Successfully fetched database information",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching database health",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Health</h1>
          <p className="text-muted-foreground">
            Verify database connection and check table status
          </p>
        </div>
        <Button onClick={fetchDbHealth} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Connection Info
            </CardTitle>
            <CardDescription>Current Supabase project details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm font-medium">Supabase URL:</span>
              <p className="text-sm text-muted-foreground break-all">{supabaseUrl}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Project Ref:</span>
              <p className="text-sm text-muted-foreground">{projectRef}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Schema:</span>
              <Badge variant="outline">public</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              Tables
            </CardTitle>
            <CardDescription>
              {tables.length > 0
                ? `Found ${tables.length} tables in public schema`
                : "Click Refresh to fetch tables"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tables.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tables.map((table) => (
                  <Badge key={table} variant="secondary">
                    {table}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tables loaded yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Row Counts</CardTitle>
          <CardDescription>
            Number of rows in key tables (may be limited by RLS policies)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tableCounts.length > 0 ? (
            <div className="space-y-3">
              {tableCounts.map((table) => (
                <div
                  key={table.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium">{table.name}</span>
                  <div className="text-right">
                    {table.error ? (
                      <div className="space-y-1">
                        <Badge variant="destructive">Error</Badge>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          {table.error}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-lg">
                        {table.count !== null ? table.count.toLocaleString() : "N/A"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {tableCounts.some((t) => t.error) && (
                <div className="mt-4 p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>Note:</strong> RLS prevented reading rows (or you are not signed
                    in). If SQL editor shows rows but this screen shows none, it's likely an
                    RLS mismatch. Some tables may not exist (e.g., delivery_logs).
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click Refresh to fetch row counts
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDbHealth;
