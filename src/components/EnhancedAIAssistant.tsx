import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { MessageCircle, Send, Bot, Crown, Zap, TrendingUp, AlertTriangle, Target, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnhancedAIAssistantProps {
  bills: any[];
  context?: string;
}

const EnhancedAIAssistant = ({ bills, context }: EnhancedAIAssistantProps) => {
  const { userPlan, canMakeAIQuery, getAIQueriesRemaining, trackAIQuery } = useSupabaseData();
  const { messages, isLoading, sendMessage, clearChat, isAvailable } = useAIAssistant();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<string>('');

  const queriesRemaining = getAIQueriesRemaining();
  const isPro = userPlan?.plan === 'pro' || userPlan?.plan === 'enterprise';

  // Pro-only AI insights
  const proInsights = [
    {
      id: 'spending-analysis',
      title: 'Spending Analysis',
      description: 'Get personalized insights on your spending patterns and recommendations for optimization',
      icon: TrendingUp,
      prompt: 'Analyze my spending patterns across categories and provide personalized recommendations to optimize my expenses. Include insights on seasonal trends and suggest ways to reduce costs.'
    },
    {
      id: 'payment-coaching',
      title: 'Payment Coaching',
      description: 'Receive custom coaching on improving payment timing and avoiding late fees',
      icon: Target,
      prompt: 'Act as my personal financial coach. Review my bill payment history and provide specific strategies to improve my payment timing, avoid late fees, and build better financial habits.'
    },
    {
      id: 'bulk-reminders',
      title: 'Bulk Reminder Templates',
      description: 'Generate custom reminder templates for all your bills with personalized messaging',
      icon: FileText,
      prompt: 'Create personalized reminder templates for all my bills. Include custom messaging based on bill type, amount, and due date. Format them for email and text message delivery.'
    },
    {
      id: 'financial-forecast',
      title: 'Financial Forecasting',
      description: 'Get 6-month financial forecasts and cash flow predictions',
      icon: TrendingUp,
      prompt: 'Provide a detailed 6-month financial forecast based on my bill history. Include cash flow predictions, identify potential financial stress periods, and suggest preparation strategies.'
    }
  ];

  const handleSendMessage = async (message: string) => {
    if (!canMakeAIQuery()) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      // Track the AI query
      const success = await trackAIQuery('chat', message, '');
      if (!success && !isPro) {
        setShowUpgradeModal(true);
        return;
      }

      // Send message with enhanced context for Pro users
      const enhancedContext = isPro 
        ? `${context || ''} - Pro user with access to advanced insights, spending analysis, and personalized coaching`
        : context;

      await sendMessage(message, bills, enhancedContext);
      setInputMessage('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message to AI assistant",
        variant: "destructive",
      });
    }
  };

  const handleProInsight = async (insight: any) => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    await handleSendMessage(insight.prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputMessage.trim()) {
        handleSendMessage(inputMessage.trim());
      }
    }
  };

  if (!isAvailable) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Financial Assistant
              {isPro && <Badge className="bg-primary/10 text-primary">Pro</Badge>}
            </DialogTitle>
            <div className="flex items-center justify-between">
              <DialogDescription>
                Get personalized financial insights and bill management advice
              </DialogDescription>
              {!isPro && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {queriesRemaining}/{userPlan?.ai_queries_limit || 3} queries remaining
                  </span>
                  <Progress 
                    value={(queriesRemaining / (userPlan?.ai_queries_limit || 3)) * 100} 
                    className="w-16 h-2" 
                  />
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 flex gap-4 min-h-0">
            {/* Pro Insights Sidebar */}
            {isPro && (
              <div className="w-80 border-r pr-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  Pro Insights
                </h3>
                <div className="space-y-2">
                  {proInsights.map((insight) => (
                    <Card 
                      key={insight.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleProInsight(insight)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <insight.icon className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <h4 className="font-medium text-sm">{insight.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Interface */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[300px] max-h-[400px]">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {isPro ? 'Pro AI Assistant Ready' : 'AI Assistant Ready'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {isPro 
                        ? 'Ask me anything about your finances, get spending insights, or use Pro features on the left.'
                        : `Ask me about your bills and finances. You have ${queriesRemaining} queries remaining.`
                      }
                    </p>
                    {!isPro && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowUpgradeModal(true)}
                        className="flex items-center gap-2"
                      >
                        <Crown className="h-4 w-4" />
                        Upgrade for Unlimited Access
                      </Button>
                    )}
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      canMakeAIQuery() 
                        ? "Ask me about your finances..."
                        : "Upgrade to Pro for unlimited AI queries"
                    }
                    disabled={isLoading || !canMakeAIQuery()}
                  />
                  <Button
                    onClick={() => handleSendMessage(inputMessage.trim())}
                    disabled={isLoading || !inputMessage.trim() || !canMakeAIQuery()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {messages.length > 0 && (
                  <div className="flex justify-between items-center mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearChat}
                      disabled={isLoading}
                    >
                      Clear Chat
                    </Button>
                    {!isPro && (
                      <span className="text-xs text-muted-foreground">
                        {queriesRemaining} queries remaining this month
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Upgrade to Pro
            </DialogTitle>
            <DialogDescription>
              Unlock unlimited AI assistance and advanced financial insights
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Unlimited AI Queries</p>
                  <p className="text-sm text-muted-foreground">Ask as many questions as you want</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Advanced Analytics</p>
                  <p className="text-sm text-muted-foreground">Spending forecasts and trend analysis</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Personal Financial Coaching</p>
                  <p className="text-sm text-muted-foreground">Custom recommendations and strategies</p>
                </div>
              </div>
            </div>
            
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <p className="text-sm">
                <span className="font-semibold">Free users:</span> {userPlan?.ai_queries_limit || 3} queries/month
              </p>
              <p className="text-sm">
                <span className="font-semibold">Pro users:</span> Unlimited queries + advanced features
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
              Maybe Later
            </Button>
            <Button className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedAIAssistant;