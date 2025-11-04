import { useState, useEffect } from 'react';
import AppNavigation from '@/components/AppNavigation';
import EnhancedAIAssistantV2 from '@/components/EnhancedAIAssistantV2';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Brain, TrendingUp, Lightbulb, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AICoach() {
  const { user } = useAuth();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBills();
    }
  }, [user]);

  const loadBills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user?.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Error loading bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const context = `User is on the AI Coach page. They have ${bills.length} bills in their system. Provide comprehensive financial coaching and advice.`;

  return (
    <div className="min-h-screen bg-background">
      <AppNavigation />
      
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                AI Financial Coach
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                  New
                </Badge>
              </h1>
              <p className="text-muted-foreground">
                Get personalized financial advice powered by AI
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Smart Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get insights on your spending patterns, bill management, and financial health
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-lg">Personalized Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Receive tailored advice based on your bills, expenses, and financial goals
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">24/7 Available</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Chat with your AI coach anytime, anywhere for instant financial guidance
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* AI Assistant Component */}
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle>Start Your Financial Coaching Session</CardTitle>
            </div>
            <CardDescription>
              Ask questions about your bills, expenses, financial planning, or get personalized advice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnhancedAIAssistantV2 
              bills={bills} 
              context={context}
            />
          </CardContent>
        </Card>

        {/* Example Questions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">💡 Example Questions to Ask</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">📊 Spending Analysis</p>
                <p className="text-xs text-muted-foreground">
                  "How much am I spending on bills this month?"
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">💰 Budget Planning</p>
                <p className="text-xs text-muted-foreground">
                  "Help me create a budget for next month"
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">⚡ Bill Management</p>
                <p className="text-xs text-muted-foreground">
                  "Which bills are due soon and need attention?"
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">🎯 Financial Goals</p>
                <p className="text-xs text-muted-foreground">
                  "How can I save more money on my expenses?"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

