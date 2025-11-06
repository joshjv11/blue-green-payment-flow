import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, AlertCircle } from "lucide-react";
import { validateGSTIN } from "@/utils/gst";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IndianState {
  state_name: string;
  state_code: string;
}

export function BusinessSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<IndianState[]>([]);
  const [formData, setFormData] = useState({
    company: "",
    business_legal_name: "",
    company_gstin: "",
    company_pan: "",
    company_address: "",
    company_state: "",
    company_state_code: "",
    tax_regime: "IND_GST",
  });
  const [gstinError, setGstinError] = useState("");

  useEffect(() => {
    fetchStates();
    fetchBusinessSettings();
  }, []);

  const fetchStates = async () => {
    try {
      const { data, error } = await supabase
        .from("indian_states")
        .select("state_name, state_code")
        .order("state_name");

      if (error) throw error;
      setStates(data || []);
    } catch (error: any) {
      console.error("Error fetching states:", error);
    }
  };

  const fetchBusinessSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          company: data.company || "",
          business_legal_name: data.business_legal_name || "",
          company_gstin: data.company_gstin || "",
          company_pan: data.company_pan || "",
          company_address: data.company_address || "",
          company_state: data.company_state || "",
          company_state_code: data.company_state_code || "",
          tax_regime: data.tax_regime || "IND_GST",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStateChange = (stateName: string) => {
    const state = states.find((s) => s.state_name === stateName);
    setFormData({
      ...formData,
      company_state: stateName,
      company_state_code: state?.state_code || "",
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
    if (formData.company_gstin && !validateGSTIN(formData.company_gstin)) {
      toast({
        title: "Invalid GSTIN",
        description: "Please enter a valid 15-character GSTIN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          company: formData.company,
          business_legal_name: formData.business_legal_name,
          company_gstin: formData.company_gstin,
          company_pan: formData.company_pan,
          company_address: formData.company_address,
          company_state: formData.company_state,
          company_state_code: formData.company_state_code,
          tax_regime: formData.tax_regime,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Business settings updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <CardTitle>Business & Tax Information</CardTitle>
        </div>
        <CardDescription>
          Configure your business details for GST-compliant invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            These details will appear on all your invoices. Ensure GSTIN and business information are accurate.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Business Trading Name *</Label>
            <Input
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Your Business Name"
              required
            />
          </div>

          <div>
            <Label>Legal Business Name</Label>
            <Input
              value={formData.business_legal_name}
              onChange={(e) => setFormData({ ...formData, business_legal_name: e.target.value })}
              placeholder="As per GST Registration"
            />
          </div>

          <div>
            <Label>GSTIN *</Label>
            <Input
              value={formData.company_gstin}
              onChange={(e) => handleGstinChange(e.target.value)}
              placeholder="29ABCDE1234F1Z5"
              maxLength={15}
              required
            />
            {gstinError && (
              <p className="text-xs text-destructive mt-1">{gstinError}</p>
            )}
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
        </div>

        <div>
          <Label>Business Address *</Label>
          <Textarea
            value={formData.company_address}
            onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
            placeholder="Enter complete business address"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>State *</Label>
            <Select value={formData.company_state} onValueChange={handleStateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state.state_code} value={state.state_name}>
                    {state.state_name} ({state.state_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>State Code</Label>
            <Input
              value={formData.company_state_code}
              readOnly
              placeholder="Auto-filled"
              className="bg-muted"
            />
          </div>
        </div>

        <div>
          <Label>Tax Regime</Label>
          <Select value={formData.tax_regime} disabled>
            <SelectTrigger className="bg-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IND_GST">Indian GST</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Tax regime is set to Indian GST for compliance
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto">
          {loading ? "Saving..." : "Save Business Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
