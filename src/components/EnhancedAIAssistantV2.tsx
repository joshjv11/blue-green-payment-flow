import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Send, Bot, Crown, Zap, AlertTriangle, Infinity } from 'lucide-react';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useToast } from '@/hooks/use-toast';
import { trackFeatureUsage } from '@/lib/analytics';
import AIQueryCounter from './AIQueryCounter';
import UpgradeModal from './UpgradeModal';

interface EnhancedAIAssistantV2Props {
  bills: any[];
  context?: string;
  trigger?: React.ReactNode;
}

const EnhancedAIAssistantV2 = ({ bills, context, trigger }: EnhancedAIAssistantV2Props) => {
  const { 
    plan, 
    canMakeAIQuery, 
    getAIQueriesRemaining, 
    trackAIQuery, 
    hasUnlimitedAI,
    aiQueriesUsed,
    aiQueriesLimit 
  } = useSupabasePlan();
  const { messages, isLoading, sendMessage, clearChat, isAvailable } = useAIAssistant();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const queriesRemaining = getAIQueriesRemaining();
  const isPro = hasUnlimitedAI;

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    console.log('🤖 Enhanced AI - Handling message:', { 
      message: message.substring(0, 50) + '...', 
      canQuery: canMakeAIQuery(), 
      hasUnlimited: hasUnlimitedAI,
      queriesRemaining: getAIQueriesRemaining()
    });
    
    setInputMessage('');
    
    // Check if user can make AI queries
    if (!canMakeAIQuery()) {
      console.log('⚠️ AI query limit reached, showing upgrade modal');
      setShowUpgradeModal(true);
      return;
    }

    if (!isAvailable) {
      console.error('❌ AI assistant not available');
      toast({
        title: "AI Assistant Unavailable",
        description: "AI assistant is not configured. Please check your settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Track the AI query for free users
      if (!isPro) {
        console.log('📊 Tracking AI query usage...');
        const success = await trackAIQuery();
        if (!success) {
          console.error('❌ Failed to track AI query');
          setShowUpgradeModal(true);
          return;
        }
        console.log('✅ AI query tracked successfully');
      }

      // Send message with enhanced context for Pro users
      const enhancedContext = isPro 
        ? `Pro user with ${bills.length} bills. Provide detailed financial insights, advanced strategies, and comprehensive bill management advice. Focus on optimization, investment planning, and smart financial decisions. ${context || ''}`
        : `Free user with ${bills.length} bills. Provide helpful but concise advice within free tier limits. Focus on basic bill management and payment reminders. ${context || ''}`;
      
      console.log('🤖 Sending to AI with enhanced context:', { 
        billsCount: bills.length, 
        contextLength: enhancedContext.length,
        isPro 
      });
      
      await sendMessage(message, bills, enhancedContext);
      
      // Track AI query usage
      trackFeatureUsage('ai_coach', 'view', { 
        isPro,
        billsCount: bills.length 
      });
      
    } catch (error) {
      console.error('❌ Error sending message to AI:', error);
      toast({
        title: "Error",
        description: "Failed to send message to AI assistant",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      handleSendMessage(inputMessage.trim());
    }
  };

  const defaultTrigger = (
    <Button 
      size="lg" 
      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
      disabled={!canMakeAIQuery() && !isPro}
    >
      <MessageCircle className="h-5 w-5 mr-2" />
      AI Financial Coach
      {!isPro && queriesRemaining <= 1 && (
        <Crown className="h-4 w-4 ml-2 text-yellow-400" />
      )}
    </Button>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Financial Coach
              {isPro && (
                <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <Crown className="h-3 w-3 mr-1" />
                  Pro
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Query Counter for Free Users */}
            {!isPro && (
              <div className="flex-shrink-0">
                <AIQueryCounter 
                  onUpgrade={() => setShowUpgradeModal(true)} 
                  showButton={false}
                />
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-full p-6 mb-4">
                    <Bot className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">AI Financial Coach</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    {isPro 
                      ? `Get unlimited AI-powered financial insights about your ${bills.length} bills.`
                      : `Ask me about your ${bills.length} bills. ${queriesRemaining} queries remaining this month.`
                    }
                  </p>
                  
                  <div className="space-y-2 w-full max-w-sm">
                    <p className="text-sm font-medium text-left">Try asking:</p>
                    <div className="grid gap-2">
                      {[
                        isPro ? "Create a comprehensive financial plan" : "Summarize my bills",
                        isPro ? "Advanced saving strategies for my situation" : "Quick payment tips",
                        isPro ? "Detailed cash flow analysis" : "Which bills are due soon?",
                        isPro ? "Investment advice based on my expenses" : "How to avoid late fees"
                      ].map((question, index) => (
                        <button
                          key={index}
                          onClick={() => handleSendMessage(question)}
                          className="text-left p-3 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                          disabled={!canMakeAIQuery() || isLoading}
                        >
                          <div className="flex items-center gap-2">
                            "{question}"
                            {isPro && index > 1 && <Crown className="h-3 w-3 text-yellow-500" />}
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    {!canMakeAIQuery() && (
                      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mt-4">
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          You've reached your monthly AI query limit. Upgrade to Pro for unlimited access.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0">
              {!canMakeAIQuery() && !isPro ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                    You've used all {aiQueriesLimit} AI queries this month. 
                    Upgrade to Pro for unlimited AI coaching!
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro - ₹99/month
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={isPro ? "Ask your AI coach anything..." : `Ask me anything (${queriesRemaining} queries left)`}
                    disabled={isLoading || !isAvailable}
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={!inputMessage.trim() || isLoading || !isAvailable}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </div>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={clearChat}>
                  Clear Chat
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentBillCount={bills.length}
        aiQueriesUsed={aiQueriesUsed}
        aiQueriesLimit={aiQueriesLimit}
        trigger="ai"
      />
    </>
  );
};

export default EnhancedAIAssistantV2;