import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BusinessSettings {
  business_name: string;
  business_address: string;
  country: string;
  currency: string;
  base_currency: string;
  number_format: string;
  tax_regime: "IND_GST" | "UAE_VAT" | "GENERIC_VAT" | "NO_TAX";
  business_tax_id_label: string;
  business_tax_id_value: string;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  business_name: "",
  business_address: "",
  country: "IN",
  currency: "INR",
  base_currency: "INR",
  number_format: "1,234.56",
  tax_regime: "IND_GST",
  business_tax_id_label: "GSTIN",
  business_tax_id_value: "",
};

export function useBusinessSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          business_name: data.business_name || "",
          business_address: data.business_address || "",
          country: data.country || "IN",
          currency: data.currency || "INR",
          base_currency: data.base_currency || "INR",
          number_format: data.number_format || "1,234.56",
          tax_regime: (data.tax_regime || "IND_GST") as "IND_GST" | "UAE_VAT" | "GENERIC_VAT" | "NO_TAX",
          business_tax_id_label: data.business_tax_id_label || "GSTIN",
          business_tax_id_value: data.business_tax_id_value || "",
        });
      } else {
        // Create default settings for user
        const { error: insertError } = await supabase
          .from("business_settings")
          .insert({
            user_id: user.id,
            ...DEFAULT_SETTINGS,
          });

        if (insertError) throw insertError;
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error: any) {
      console.error("Error fetching business settings:", error);
      toast({
        title: "Error loading business settings",
        description: error.message,
        variant: "destructive",
      });
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchSettings();
  };

  return {
    settings,
    loading,
    refetch,
    taxRegime: settings.tax_regime,
    currency: settings.currency,
    baseCurrency: settings.base_currency,
    country: settings.country,
  };
}
