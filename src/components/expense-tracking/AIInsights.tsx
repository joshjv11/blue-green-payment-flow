import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';

interface AIInsight {
  type: 'spending_pattern' | 'budget_warning' | 'savings_opportunity' | 'category_analysis' | 'predictive_alert';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  actionItems?: string[];
  data?: any;
}

interface AIInsightsProps {
  monthlyIncome: number;
  monthlySpent: number;
  categorySpending: Array<{ category: string; total: number; percentage: number; count: number }>;
  todaySpent: number;
  dailyBudget: number;
}

export function AIInsights({
  monthlyIncome,
  monthlySpent,
  categorySpending,
  todaySpent,
  dailyBudget,
}: AIInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    generateInsights();
  }, [monthlyIncome, monthlySpent, categorySpending, todaySpent, dailyBudget]);

  const generateInsights = async () => {
    setLoading(true);
    
    // Generate basic insights immediately
    const basicInsights = generateBasicInsights();
    setInsights(basicInsights);
    
    // Then get AI-powered insights
    await generateAIPoweredInsights();
    
    setLoading(false);
  };

  const generateBasicInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlySpent) / monthlyIncome) * 100 : 0;
    const daysInMonth = differenceInDays(endOfMonth(new Date()), startOfMonth(new Date())) + 1;
    const currentDay = new Date().getDate();
    const expectedSpend = (monthlyIncome / daysInMonth) * currentDay;
    const burnRate = monthlySpent / expectedSpend;
    
    // Burn Rate Analysis
    if (burnRate > 1.2) {
      insights.push({
        type: 'budget_warning',
        title: '⚠️ Spending Faster Than Expected',
        message: `You've spent ${(burnRate * 100).toFixed(0)}% of your expected pace. At this rate, you'll exceed your monthly budget by ₹${((monthlySpent / currentDay) * daysInMonth - monthlyIncome).toFixed(0)}.`,
        severity: 'critical',
        actionItems: [
          'Reduce daily spending to ₹' + (monthlyIncome / daysInMonth * 0.8).toFixed(0) + '/day',
          'Review top spending categories',
          'Consider pausing non-essential expenses',
        ],
      });
    } else if (burnRate < 0.8) {
      insights.push({
        type: 'savings_opportunity',
        title: '✅ Great Spending Control!',
        message: `You're spending ${((1 - burnRate) * 100).toFixed(0)}% less than expected. Keep it up!`,
        severity: 'success',
      });
    }

    // Category Analysis
    const topCategory = categorySpending[0];
    if (topCategory && topCategory.percentage > 40) {
      insights.push({
        type: 'category_analysis',
        title: `💰 ${topCategory.category} Dominates Spending`,
        message: `You're spending ${topCategory.percentage.toFixed(1)}% of your money on ${topCategory.category}. The recommended range is 25-30%.`,
        severity: 'warning',
        actionItems: [
          `Review ${topCategory.category} expenses for non-essential items`,
          'Look for cheaper alternatives',
          'Set a monthly limit for this category',
        ],
        data: { category: topCategory.category, percentage: topCategory.percentage },
      });
    }

    // Daily Budget Status
    if (todaySpent > dailyBudget * 1.1) {
      insights.push({
        type: 'predictive_alert',
        title: '🚨 Daily Budget Exceeded',
        message: `You've spent ₹${todaySpent.toFixed(0)} today, which is ${((todaySpent / dailyBudget) * 100).toFixed(0)}% of your daily budget.`,
        severity: 'critical',
        actionItems: [
          'Avoid additional expenses today',
          'Consider cooking at home instead of ordering',
          'Use public transport if available',
        ],
      });
    }

    // Savings Rate Analysis
    if (savingsRate < 10 && monthlyIncome > 0) {
      insights.push({
        type: 'savings_opportunity',
        title: '💡 Savings Rate Below Recommended',
        message: `Your savings rate is ${savingsRate.toFixed(1)}%. Financial experts recommend saving at least 20% of income.`,
        severity: 'warning',
        actionItems: [
          'Identify recurring expenses you can reduce',
          'Set up automatic savings',
          'Review subscription services',
        ],
      });
    }

    return insights;
  };

  const generateAIPoweredInsights = async () => {
    if (!monthlyIncome || monthlySpent === 0) return;

    setAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prepare context for AI
      const spendingContext = {
        monthlyIncome,
        monthlySpent,
        savingsRate: ((monthlyIncome - monthlySpent) / monthlyIncome) * 100,
        topCategories: categorySpending.slice(0, 3).map(c => ({
          category: c.category,
          amount: c.total,
          percentage: c.percentage,
        })),
        dailyBudget,
        todaySpent,
        budgetStatus: todaySpent > dailyBudget ? 'over' : 'under',
      };

      const prompt = `You are a financial coach analyzing spending patterns. Provide personalized, actionable advice.

User's Financial Data:
- Monthly Income: ₹${monthlyIncome.toLocaleString('en-IN')}
- Monthly Spent: ₹${monthlySpent.toLocaleString('en-IN')}
- Savings Rate: ${(((monthlyIncome - monthlySpent) / monthlyIncome) * 100).toFixed(1)}%
- Daily Budget: ₹${dailyBudget.toLocaleString('en-IN')}
- Today's Spending: ₹${todaySpent.toLocaleString('en-IN')}
- Top Categories: ${JSON.stringify(spendingContext.topCategories)}

Provide:
1. One key insight about their spending pattern
2. One actionable recommendation to improve savings
3. One tip specific to their top spending category

Keep it concise (2-3 sentences), friendly, and actionable. Focus on practical steps they can take today.`;

      // Try to use Edge Function first (handles CORS and API keys securely)
      try {
        const { data, error } = await supabase.functions.invoke('ai-assistant-enhanced', {
          body: {
            message: prompt,
            taskType: 'spending_analysis',
            context: JSON.stringify(spendingContext),
          },
        });

        if (!error && data?.response) {
          setAiMessage(data.response);
          return; // Success, no need to try other methods
        }
      } catch (error) {
        console.warn('Edge function error, trying direct API:', error);
      }

      // Fallback: Try Groq API directly (if CORS allows)
      const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (groqApiKey) {
        try {
          // Use proxy in development, direct in production (if CORS configured)
          const apiUrl = import.meta.env.DEV
            ? '/api/groq/openai/v1/chat/completions'
            : 'https://api.groq.com/openai/v1/chat/completions';

          const response = await fetch(apiUrl, {
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
                  content: 'You are a friendly financial coach helping users manage their expenses better. Provide concise, actionable advice.',
                },
                { role: 'user', content: prompt },
              ],
              max_tokens: 300,
              temperature: 0.7,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const aiResponse = data.choices[0]?.message?.content || '';
            if (aiResponse) {
              setAiMessage(aiResponse);
              return;
            }
          }
        } catch (error) {
          console.warn('Groq API error (CORS or other issue):', error);
        }
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlySpent) / monthlyIncome) * 100 : 0;
  const daysInMonth = differenceInDays(endOfMonth(new Date()), startOfMonth(new Date())) + 1;
  const currentDay = new Date().getDate();
  const expectedSpend = (monthlyIncome / daysInMonth) * currentDay;
  const burnRate = expectedSpend > 0 ? monthlySpent / expectedSpend : 0;
  const projectedMonthlySpend = (monthlySpent / currentDay) * daysInMonth;

  return (
    <div className="space-y-6">
      {/* AI Coach Message */}
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Your AI Financial Coach
          </CardTitle>
          <CardDescription>
            Personalized insights based on your spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analyzing ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing your spending patterns...
            </div>
          ) : aiMessage ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed">{aiMessage}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={generateAIPoweredInsights}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Get New Insights
              </Button>
            </div>
          ) : (
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                AI insights require an API key. Add VITE_GROQ_API_KEY to your .env file for free AI-powered recommendations.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Burn Rate Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Burn Rate Tracker
          </CardTitle>
          <CardDescription>
            Are you spending faster or slower than expected?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Day {currentDay} of {daysInMonth}</span>
              <span className="font-medium">
                {burnRate > 1 ? (
                  <span className="text-red-600">{(burnRate * 100).toFixed(0)}% over pace</span>
                ) : (
                  <span className="text-green-600">{(burnRate * 100).toFixed(0)}% of expected pace</span>
                )}
              </span>
            </div>
            <Progress 
              value={Math.min(burnRate * 50, 100)} 
              className={burnRate > 1 ? 'bg-red-200 dark:bg-red-900' : 'bg-green-200 dark:bg-green-900'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="text-sm text-muted-foreground">Expected by now</div>
              <div className="text-lg font-semibold">₹{expectedSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Actual spending</div>
              <div className={`text-lg font-semibold ${monthlySpent > expectedSpend ? 'text-red-600' : 'text-green-600'}`}>
                ₹{monthlySpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {projectedMonthlySpend > monthlyIncome && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                At current pace, you'll spend ₹{projectedMonthlySpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this month, 
                which is ₹{(projectedMonthlySpend - monthlyIncome).toLocaleString('en-IN', { maximumFractionDigits: 0 })} over budget.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Spending Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Category Breakdown
          </CardTitle>
          <CardDescription>
            Top spending categories with recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categorySpending.slice(0, 3).map((category) => {
              const isHigh = category.percentage > 35;
              return (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{category.category}</span>
                    <div className="flex items-center gap-2">
                      {isHigh && (
                        <Badge variant="destructive" className="text-xs">
                          High
                        </Badge>
                      )}
                      <span className="text-sm font-semibold">
                        ₹{category.total.toLocaleString('en-IN')} ({category.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                  {isHigh && (
                    <p className="text-xs text-muted-foreground">
                      💡 Consider reducing {category.category.toLowerCase()} expenses. Target: 25-30% of total spending.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <Alert
                key={index}
                variant={
                  insight.severity === 'critical' ? 'destructive' :
                  insight.severity === 'warning' ? 'default' :
                  'default'
                }
                className={insight.severity === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}
              >
                {insight.severity === 'critical' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : insight.severity === 'success' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <Lightbulb className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="font-semibold mb-1">{insight.title}</div>
                  <div className="text-sm">{insight.message}</div>
                  {insight.actionItems && (
                    <ul className="mt-2 space-y-1 text-xs list-disc list-inside">
                      {insight.actionItems.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

