import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, AlertCircle, Loader2 } from "lucide-react";
import { validateGSTIN, INDIAN_STATES, getStateCode } from "@/utils/gst";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getMyOrganization } from "@/lib/endpoints/orgs";
import { saveBusinessProfile } from "@/lib/endpoints/profile";

interface OrgAddress {
  line1?: string;
  legal_name?: string;
  state?: string;
  state_code?: string;
  pan?: string;
  tax_regime?: string;
}

export function BusinessSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company: "",
    business_legal_name: "",
    company_gstin: "",
    company_pan: "",
    company_address: "",
    company_state: "",
    company_state_code: "",
    upivpa: "",
    tax_regime: "IND_GST",
  });
  const [gstinError, setGstinError] = useState("");

  useEffect(() => {
    fetchBusinessSettings();
  }, [user]);

  const fetchBusinessSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const org = await getMyOrganization();
      const addr = (org.address ?? {}) as OrgAddress;
      setFormData({
        company: org.name || "",
        business_legal_name: addr.legal_name || "",
        company_gstin: org.gstin || "",
        company_pan: addr.pan || "",
        company_address: addr.line1 || "",
        company_state: addr.state || "",
        company_state_code: addr.state_code || "",
        upivpa: org.upivpa || "",
        tax_regime: addr.tax_regime || "IND_GST",
      });
    } catch (error: unknown) {
      toast({
        title: "Error loading settings",
        description: error instanceof Error ? error.message : "Could not load business settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = (stateName: string) => {
    setFormData({
      ...formData,
      company_state: stateName,
      company_state_code: getStateCode(stateName),
    });
  };

  const handleGstinChange = (value: string) => {
    const gstin = value.toUpperCase();
    setFormData({ ...formData, company_gstin: gstin });
    if (gstin && !validateGSTIN(gstin)) {
      setGstinError("Invalid GSTIN format. Must be 15 characters (e.g., 29ABCDE1234F1Z5)");
    } else {
      setGstinError("");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.company.trim()) {
      toast({ title: "Business name required", variant: "destructive" });
      return;
    }
    if (formData.company_gstin && !validateGSTIN(formData.company_gstin)) {
      toast({ title: "Invalid GSTIN", description: "Please enter a valid 15-character GSTIN", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await saveBusinessProfile(user.org_id, {
        name: formData.company.trim(),
        gstin: formData.company_gstin.trim() || null,
        upivpa: formData.upivpa.trim() || null,
        address: {
          line1: formData.company_address.trim(),
          legal_name: formData.business_legal_name.trim(),
          state: formData.company_state,
          state_code: formData.company_state_code,
          pan: formData.company_pan.trim(),
          tax_regime: formData.tax_regime,
        },
      });

      toast({
        title: "Settings saved",
        description: "Business settings updated in your organization profile.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "Save failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <CardTitle>Business & Tax Information</CardTitle>
        </div>
        <CardDescription>
          Saved to your organization record — used on invoices and payment pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            These details appear on invoices. Ensure GSTIN and business information are accurate.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Business trading name *</Label>
            <Input
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Your Business Name"
              required
            />
          </div>
          <div>
            <Label>Legal business name</Label>
            <Input
              value={formData.business_legal_name}
              onChange={(e) => setFormData({ ...formData, business_legal_name: e.target.value })}
              placeholder="As per GST registration"
            />
          </div>
          <div>
            <Label>GSTIN</Label>
            <Input
              value={formData.company_gstin}
              onChange={(e) => handleGstinChange(e.target.value)}
              placeholder="29ABCDE1234F1Z5"
              maxLength={15}
            />
            {gstinError && <p className="text-xs text-destructive mt-1">{gstinError}</p>}
            {formData.company_gstin && !gstinError && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Check className="h-3 w-3" /> Valid GSTIN format
              </p>
            )}
          </div>
          <div>
            <Label>PAN</Label>
            <Input
              value={formData.company_pan}
              onChange={(e) => setFormData({ ...formData, company_pan: e.target.value.toUpperCase() })}
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          </div>
          <div>
            <Label>UPI VPA (for payments)</Label>
            <Input
              value={formData.upivpa}
              onChange={(e) => setFormData({ ...formData, upivpa: e.target.value })}
              placeholder="yourbusiness@upi"
            />
          </div>
        </div>

        <div>
          <Label>Business address</Label>
          <Textarea
            value={formData.company_address}
            onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
            placeholder="Enter complete business address"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>State</Label>
            <Select value={formData.company_state} onValueChange={handleStateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.name}>
                    {state.name} ({state.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>State code</Label>
            <Input value={formData.company_state_code} readOnly className="bg-muted" />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save business settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
