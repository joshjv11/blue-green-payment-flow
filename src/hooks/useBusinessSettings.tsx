import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import * as orgsApi from '@/lib/endpoints/orgs';
import { useToast } from '@/hooks/use-toast';

export interface BusinessSettings {
  business_name: string;
  business_address: string;
  country: string;
  currency: string;
  base_currency: string;
  number_format: string;
  tax_regime: 'IND_GST' | 'UAE_VAT' | 'GENERIC_VAT' | 'NO_TAX';
  business_tax_id_label: string;
  business_tax_id_value: string;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  business_name: '',
  business_address: '',
  country: 'IN',
  currency: 'INR',
  base_currency: 'INR',
  number_format: '1,234.56',
  tax_regime: 'IND_GST',
  business_tax_id_label: 'GSTIN',
  business_tax_id_value: '',
};

export function useBusinessSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      if (!user) {
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
        return;
      }

      const org = await orgsApi.getMyOrganization();
      const address = org.address as { line1?: string; city?: string; state?: string } | null;
      const addressStr = address
        ? [address.line1, address.city, address.state].filter(Boolean).join(', ')
        : '';

      setSettings({
        business_name: org.name || '',
        business_address: addressStr,
        country: 'IN',
        currency: 'INR',
        base_currency: 'INR',
        number_format: '1,234.56',
        tax_regime: 'IND_GST',
        business_tax_id_label: 'GSTIN',
        business_tax_id_value: org.gstin || '',
      });
    } catch (error: unknown) {
      console.warn('Business settings fallback to defaults:', error);
      setSettings(DEFAULT_SETTINGS);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error loading business settings',
        description: message,
        variant: 'destructive',
      });
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
