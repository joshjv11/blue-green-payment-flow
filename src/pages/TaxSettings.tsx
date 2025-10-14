import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Globe, DollarSign, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BackToDashboard } from "@/components/BackToDashboard";

const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "SG", name: "Singapore" },
];

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

const NUMBER_FORMATS = [
  { value: "1,234.56", label: "1,234.56 (US/UK)" },
  { value: "1.234,56", label: "1.234,56 (EU)" },
];

const TAX_REGIMES = [
  { value: "IND_GST", label: "India GST", description: "CGST/SGST/IGST with HSN/SAC codes" },
  { value: "UAE_VAT", label: "UAE VAT", description: "5% VAT with TRN" },
  { value: "GENERIC_VAT", label: "Generic VAT", description: "Standard VAT with configurable rates" },
  { value: "NO_TAX", label: "No Tax", description: "Proforma/Commercial invoice only" },
];

export default function TaxSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    business_name: "",
    business_address: "",
    country: "IN",
    currency: "INR",
    base_currency: "INR",
    number_format: "1,234.56",
    tax_regime: "IND_GST",
    business_tax_id_label: "",
    business_tax_id_value: "",
  });

  useEffect(() => {
    fetchBusinessSettings();
  }, []);

  useEffect(() => {
    // Auto-fill tax ID label based on regime
    if (formData.tax_regime === "UAE_VAT" && !formData.business_tax_id_label) {
      setFormData(prev => ({ ...prev, business_tax_id_label: "TRN" }));
    } else if (formData.tax_regime === "GENERIC_VAT" && !formData.business_tax_id_label) {
      setFormData(prev => ({ ...prev, business_tax_id_label: "VAT ID" }));
    } else if (formData.tax_regime === "IND_GST" && !formData.business_tax_id_label) {
      setFormData(prev => ({ ...prev, business_tax_id_label: "GSTIN" }));
    }
  }, [formData.tax_regime]);

  const fetchBusinessSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          business_name: data.business_name || "",
          business_address: data.business_address || "",
          country: data.country || "IN",
          currency: data.currency || "INR",
          base_currency: data.base_currency || "INR",
          number_format: data.number_format || "1,234.56",
          tax_regime: data.tax_regime || "IND_GST",
          business_tax_id_label: data.business_tax_id_label || "",
          business_tax_id_value: data.business_tax_id_value || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("business_settings")
        .upsert({
          user_id: user.id,
          ...formData,
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Tax settings updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const showRegimeWarning = formData.tax_regime === "IND_GST" && formData.country !== "IN";

  const getRegimePreview = () => {
    const regime = TAX_REGIMES.find(r => r.value === formData.tax_regime);
    if (!regime) return null;

    const previews: Record<string, string[]> = {
      IND_GST: [
        "Invoice shows HSN/SAC codes",
        "Tax split: CGST + SGST (intra-state) or IGST (inter-state)",
        "Place of Supply field required",
        "GST Summary reports available",
      ],
      UAE_VAT: [
        "Invoice shows TRN (Tax Registration Number)",
        "Standard VAT rate: 5%",
        "Zero-rated for exports",
        "Reverse charge support",
      ],
      GENERIC_VAT: [
        "Configurable VAT rates per product",
        "Custom tax ID label",
        "Zero-rated & exempt flags",
        "Multi-rate VAT summary",
      ],
      NO_TAX: [
        "No tax columns in invoice",
        "Shows 'Proforma Invoice' or 'Commercial Invoice'",
        "Tax summary hidden",
        "Simplified totals",
      ],
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{regime.label} Preview</CardTitle>
          <CardDescription>{regime.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {previews[formData.tax_regime]?.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 pb-20 md:pb-6">
      <BackToDashboard />
      
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Tax Settings</h1>
          <p className="text-muted-foreground">Configure your business tax regime and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Business Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Business Name *</Label>
                  <Input
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="Your Business Name"
                  />
                </div>

                <div>
                  <Label>Country *</Label>
                  <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Business Address *</Label>
                <Textarea
                  value={formData.business_address}
                  onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                  placeholder="Complete business address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Currency & Format */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <CardTitle>Currency & Number Format</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Currency *</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value, base_currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(curr => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.symbol} {curr.code} - {curr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Base Currency</Label>
                  <Select value={formData.base_currency} onValueChange={(value) => setFormData({ ...formData, base_currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(curr => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.symbol} {curr.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    For multi-currency invoicing (Phase 2)
                  </p>
                </div>

                <div>
                  <Label>Number Format *</Label>
                  <Select value={formData.number_format} onValueChange={(value) => setFormData({ ...formData, number_format: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NUMBER_FORMATS.map(format => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Regime */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Tax Regime</CardTitle>
              </div>
              <CardDescription>
                Select how invoices and reports should handle taxes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showRegimeWarning && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    GST is India-specific. Consider using Generic VAT or No Tax for non-Indian businesses.
                  </AlertDescription>
                </Alert>
              )}

              <RadioGroup value={formData.tax_regime} onValueChange={(value) => setFormData({ ...formData, tax_regime: value })}>
                {TAX_REGIMES.map(regime => (
                  <div key={regime.value} className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={regime.value} id={regime.value} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={regime.value} className="font-semibold cursor-pointer">
                        {regime.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{regime.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <Label>Business Tax ID Label</Label>
                  <Input
                    value={formData.business_tax_id_label}
                    onChange={(e) => setFormData({ ...formData, business_tax_id_label: e.target.value })}
                    placeholder="e.g., GSTIN / TRN / VAT ID"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Label shown on invoices (auto-filled by regime)
                  </p>
                </div>

                <div>
                  <Label>Business Tax ID Value</Label>
                  <Input
                    value={formData.business_tax_id_value}
                    onChange={(e) => setFormData({ ...formData, business_tax_id_value: e.target.value })}
                    placeholder="Enter your tax ID number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            {getRegimePreview()}
          </div>
        </div>
      </div>

      {/* Sticky Save Button (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:hidden z-50">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Desktop Save Button */}
      <div className="hidden md:flex justify-end mt-6">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
