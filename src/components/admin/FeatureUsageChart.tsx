import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/lib/supabase';
import { Loader2, BarChart3 } from 'lucide-react';

interface FeatureUsageData {
  feature: string;
  usage_count: number;
  last_used: string;
}

export function FeatureUsageChart() {
  const [data, setData] = useState<FeatureUsageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatureUsage();
  }, []);

  const loadFeatureUsage = async () => {
    setLoading(true);
    try {
      const { data: stats, error } = await supabase.rpc('get_feature_usage_stats');

      if (error) {
        console.error('Error loading feature usage:', error);
        setData([]);
        return;
      }

      setData((stats as FeatureUsageData[]) || []);
    } catch (error) {
      console.error('Error loading feature usage:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Format data for chart
  const chartData = data.map(item => ({
    name: item.feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    usage: item.usage_count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Feature Usage Heatmap (Last 7 Days)
        </CardTitle>
        <CardDescription>
          Track which features are most used by your users
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No feature usage data available yet</p>
            <p className="text-sm mt-2">Usage tracking will appear here as users interact with features</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'usage') return [value, 'Total Usage'];
                    if (name === 'users') return [value, 'Unique Users'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="usage" fill="#8884d8" name="Total Usage" />
              </BarChart>
            </ResponsiveContainer>

            {/* Detailed Table */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3">Usage Details</h3>
              <div className="space-y-2">
                {data.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium capitalize">
                        {item.feature.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Last used: {new Date(item.last_used).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{item.usage_count.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

