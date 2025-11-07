import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Loader2, Zap, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AnalysisResult {
  category: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  suggestions?: string[];
}

export function AIAssistant() {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [sendingMessage, setSendingMessage] = useState(false);

  const performDeepAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisResults([]);
    setSummary('');

    try {
      toast({
        title: 'Starting Deep Analysis',
        description: 'Analyzing your application... This may take a moment.',
      });

      // Collect comprehensive data
      const analysisData: any = {
        timestamp: new Date().toISOString(),
        users: [],
        plans: [],
        payments: [],
        bills: [],
        expenses: [],
        database: {
          tables: [],
          functions: [],
          policies: [],
        },
      };

      // 1. Get all users
      try {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, email, full_name, created_at, updated_at')
          .order('created_at', { ascending: false });
        analysisData.users = usersData || [];
      } catch (e) {
        console.error('Error fetching users:', e);
      }

      // 2. Get all plans
      try {
        const { data: plansData } = await supabase
          .from('user_plans')
          .select('*');
        analysisData.plans = plansData || [];
      } catch (e) {
        console.error('Error fetching plans:', e);
      }

      // 3. Get all payments
      try {
        const { data: paymentsData } = await supabase
          .from('payment_transactions')
          .select('*');
        analysisData.payments = paymentsData || [];
      } catch (e) {
        console.error('Error fetching payments:', e);
      }

      // 4. Get bills data
      try {
        const { data: billsData } = await supabase
          .from('bills')
          .select('id, user_id, amount, status, due_date, category')
          .limit(100);
        analysisData.bills = billsData || [];
      } catch (e) {
        console.error('Error fetching bills:', e);
      }

      // 5. Get expenses data
      try {
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('id, user_id, amount, category, date')
          .limit(100);
        analysisData.expenses = expensesData || [];
      } catch (e) {
        console.error('Error fetching expenses:', e);
      }

      // Analyze the data and generate insights
      const results: AnalysisResult[] = [];
      const insights: string[] = [];

      // User Analysis
      const totalUsers = analysisData.users.length;
      const activeUsers = analysisData.plans.filter((p: any) => p.is_active).length;
      const freeUsers = analysisData.plans.filter((p: any) => p.plan === 'free').length;
      const proUsers = analysisData.plans.filter((p: any) => p.plan === 'pro').length;
      const premiumUsers = analysisData.plans.filter((p: any) => p.plan === 'premium').length;
      let recentUsersCount = 0;

      if (totalUsers > 0) {
        insights.push(`📊 **User Base**: ${totalUsers} total users`);
        insights.push(`✅ **Active Plans**: ${activeUsers} active subscriptions`);
        insights.push(`💰 **Revenue Tiers**: Free: ${freeUsers}, Pro: ${proUsers}, Premium: ${premiumUsers}`);
        
        const conversionRate = ((proUsers + premiumUsers) / totalUsers) * 100;
        if (conversionRate < 10 && totalUsers > 10) {
          results.push({
            category: 'warning',
            title: 'Low Conversion Rate',
            message: `Only ${conversionRate.toFixed(1)}% of users are on paid plans. Consider improving onboarding or offering incentives.`,
            priority: 'high',
            suggestions: [
              'Add onboarding flow highlighting premium features',
              'Offer limited-time discounts for new users',
              'Implement usage-based upgrade prompts',
            ],
          });
        }
      }

      // Payment Analysis
      const totalPayments = analysisData.payments.length;
      const verifiedPayments = analysisData.payments.filter((p: any) => p.status === 'verified').length;
      const totalRevenue = analysisData.payments
        .filter((p: any) => p.status === 'verified')
        .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

      if (totalPayments > 0) {
        insights.push(`💳 **Payments**: ${verifiedPayments}/${totalPayments} verified (${((verifiedPayments / totalPayments) * 100).toFixed(1)}%)`);
        insights.push(`💰 **Total Revenue**: ₹${totalRevenue.toLocaleString('en-IN')}`);
        
        if (verifiedPayments / totalPayments < 0.8) {
          results.push({
            category: 'warning',
            title: 'Low Payment Verification Rate',
            message: `Only ${((verifiedPayments / totalPayments) * 100).toFixed(1)}% of payments are verified. Review payment processing.`,
            priority: 'high',
            suggestions: [
              'Review payment verification workflow',
              'Add automatic retry for failed verifications',
              'Notify users about pending payments',
            ],
          });
        }
      }

      // Bills Analysis
      const totalBills = analysisData.bills.length;
      const unpaidBills = analysisData.bills.filter((b: any) => b.status === 'unpaid').length;
      const overdueBills = analysisData.bills.filter((b: any) => {
        if (!b.due_date) return false;
        const dueDate = new Date(b.due_date);
        return dueDate < new Date() && b.status === 'unpaid';
      }).length;

      if (totalBills > 0) {
        insights.push(`📋 **Bills**: ${totalBills} total, ${unpaidBills} unpaid`);
        
        if (overdueBills > 0) {
          results.push({
            category: 'warning',
            title: 'Overdue Bills Detected',
            message: `${overdueBills} bills are overdue. Users may need reminders.`,
            priority: 'medium',
            suggestions: [
              'Send automated reminders for overdue bills',
              'Consider implementing late fee notifications',
              'Review bill reminder settings',
            ],
          });
        }
      }

      // Expenses Analysis
      const totalExpenses = analysisData.expenses.length;
      if (totalExpenses > 0) {
        insights.push(`💸 **Expenses**: ${totalExpenses} expense records`);
        
        const expensesByCategory: Record<string, number> = {};
        analysisData.expenses.forEach((e: any) => {
          expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + 1;
        });
        
        const topCategory = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0];
        if (topCategory) {
          insights.push(`📊 **Top Expense Category**: ${topCategory[0]} (${topCategory[1]} entries)`);
        }
      }

      // User Growth Analysis
      if (analysisData.users.length > 0) {
        recentUsersCount = analysisData.users.filter((u: any) => {
          const created = new Date(u.created_at);
          const daysAgo = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 30;
        }).length;

        insights.push(`📈 **New Users (30 days)**: ${recentUsersCount}`);

        if (recentUsersCount === 0 && totalUsers > 0) {
          results.push({
            category: 'warning',
            title: 'No New Users in 30 Days',
            message: 'No new user registrations in the past month. Consider marketing efforts.',
            priority: 'medium',
            suggestions: [
              'Launch marketing campaigns',
              'Improve SEO and discoverability',
              'Add referral program',
            ],
          });
        }
      }

      // Database Health
      if (totalUsers > 0 && analysisData.plans.length === 0) {
        results.push({
          category: 'error',
          title: 'Missing Plan Data',
          message: 'Users exist but no plan records found. This may indicate a data sync issue.',
          priority: 'high',
          suggestions: [
            'Verify plan creation workflow',
            'Check database triggers',
            'Review user registration process',
          ],
        });
      }

      // Generate AI-powered summary
      const analysisPrompt = `You are an expert application analyst. Analyze this InvoiceFlow application data and provide:
1. A comprehensive summary (2-3 paragraphs)
2. Key insights and patterns
3. Critical warnings or issues
4. Actionable recommendations

Application Data:
- Total Users: ${totalUsers}
- Active Plans: ${activeUsers} (Free: ${freeUsers}, Pro: ${proUsers}, Premium: ${premiumUsers})
- Total Payments: ${totalPayments} (Verified: ${verifiedPayments})
- Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}
- Total Bills: ${totalBills} (Unpaid: ${unpaidBills}, Overdue: ${overdueBills})
- Total Expenses: ${totalExpenses}
- New Users (30 days): ${recentUsersCount}

Provide a detailed analysis focusing on:
- User growth and engagement trends
- Revenue and conversion metrics
- Potential issues or bottlenecks
- Optimization opportunities
- Security and data integrity concerns

Be specific, actionable, and prioritize critical issues.`;

      // Try to get AI analysis
      try {
        const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (groqApiKey) {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert application analyst providing detailed insights and recommendations.',
                },
                { role: 'user', content: analysisPrompt },
              ],
              max_tokens: 1000,
              temperature: 0.7,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const aiSummary = data.choices[0]?.message?.content || '';
            setSummary(aiSummary);
          }
        }
      } catch (error) {
        console.warn('AI analysis failed, using basic summary:', error);
      }

      // If AI failed, create basic summary
      if (!summary) {
        const basicSummary = `
# Application Analysis Report

## Overview
Your InvoiceFlow application has ${totalUsers} users with ${activeUsers} active subscriptions generating ₹${totalRevenue.toLocaleString('en-IN')} in revenue.

## Key Metrics
${insights.join('\n')}

## Recommendations
${results.length > 0 ? 'Review the warnings and suggestions below for improvement opportunities.' : 'Your application appears to be running smoothly. Continue monitoring these metrics.'}
        `;
        setSummary(basicSummary);
      }

      setAnalysisResults(results);
      toast({
        title: 'Analysis Complete',
        description: `Found ${results.length} issues to review`,
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to complete analysis',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setSendingMessage(true);

    try {
      // Try Groq API first
      const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (groqApiKey) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-70b-versatile',
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant helping the admin manage their InvoiceFlow application. Provide helpful, actionable advice about the application, users, payments, and technical issues.',
              },
              ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
              { role: 'user', content: userMessage },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.choices[0]?.message?.content || '';
          setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
          return;
        }
      }

      // Fallback to edge function
      const { data, error } = await supabase.functions.invoke('ai-assistant-enhanced', {
        body: {
          message: userMessage,
          taskType: 'admin_assistance',
        },
      });

      if (!error && data?.response) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again or check your API configuration.' 
      }]);
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Deep Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Deep Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive analysis of your application, users, and database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={performDeepAnalysis}
            disabled={analyzing}
            className="w-full gap-2"
            size="lg"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing Application...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Run Deep Analysis
              </>
            )}
          </Button>

          {analyzing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Analyzing users, plans, payments, bills, expenses, and database structure...
              </AlertDescription>
            </Alert>
          )}

          {summary && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full">
                  <div className="whitespace-pre-wrap text-sm">{summary}</div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {analysisResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Issues & Recommendations
              </h3>
              {analysisResults.map((result, index) => (
                <Alert
                  key={index}
                  variant={
                    result.category === 'error' ? 'destructive' :
                    result.category === 'warning' ? 'default' :
                    'default'
                  }
                  className={result.category === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}
                >
                  <div className="flex items-start gap-2">
                    {result.category === 'error' ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : result.category === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold mb-1">{result.title}</div>
                      <div className="text-sm mb-2">{result.message}</div>
                      {result.suggestions && result.suggestions.length > 0 && (
                        <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                          {result.suggestions.map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                          ))}
                        </ul>
                      )}
                      <Badge variant="outline" className="mt-2">
                        {result.priority} priority
                      </Badge>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Chat Assistant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Assistant Chat
          </CardTitle>
          <CardDescription>
            Ask questions about your application, users, or get recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-64 w-full border rounded-lg p-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Start a conversation with your AI assistant</p>
                <p className="text-xs mt-2">Try: "How can I improve user retention?" or "Show me payment trends"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
                {sendingMessage && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2">
            <Textarea
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              placeholder="Ask me anything about your application..."
              className="min-h-[60px]"
            />
            <Button
              onClick={sendChatMessage}
              disabled={!chatMessage.trim() || sendingMessage}
              size="icon"
            >
              {sendingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

