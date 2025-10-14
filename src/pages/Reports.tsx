import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/PageTransition";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BackToDashboard } from "@/components/BackToDashboard";
import { PremiumGuard } from "@/components/PremiumGuard";
import TaxSummary from "@/components/TaxSummary";
import { useSupabasePlan } from "@/hooks/useSupabasePlan";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import UpgradeModal from "@/components/UpgradeModal";

export default function Reports() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { plan, hasAdvancedAnalytics } = useSupabasePlan();

  return (
    <PremiumGuard requiredPlan="premium" featureName="Tax Reports">
      <PageTransition>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <BackToDashboard />
        <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]} />

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Tax summaries and financial insights</p>
          </div>
          {!hasAdvancedAnalytics && (
            <Button onClick={() => setShowUpgradeModal(true)} className="gap-2">
              <Crown className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          )}
        </div>

        {!hasAdvancedAnalytics ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Premium Feature</CardTitle>
              </div>
              <CardDescription>
                Unlock advanced tax reports, financial analytics, and professional exports with Pro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowUpgradeModal(true)} className="gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Access Reports
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="tax" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="tax">Tax Summary</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="exports">Exports</TabsTrigger>
            </TabsList>

            <TabsContent value="tax" className="space-y-6">
              <TaxSummary />
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Reports</CardTitle>
                  <CardDescription>P&L, Balance Sheet, and Cash Flow</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Coming Soon in Phase 5</p>
                  <p className="text-sm text-muted-foreground">
                    Profit & Loss Statements, Balance Sheets, and Cash Flow Analysis
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Exports</CardTitle>
                  <CardDescription>Export all data for accounting software</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground mb-4">All export options available in Tax Summary tab</p>
                  <p className="text-sm text-muted-foreground">
                    Use regime-specific exports for your accountant
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentBillCount={0}
        aiQueriesUsed={0}
        aiQueriesLimit={3}
        trigger="general"
      />
    </PageTransition>
    </PremiumGuard>
  );
}
