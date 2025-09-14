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
    if (!canMakeAIQuery()) {
      setShowUpgradeModal(true);
      return;
    }

    if (!isAvailable) {
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
        const success = await trackAIQuery();
        if (!success) {
          setShowUpgradeModal(true);
          return;
        }
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
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Welcome to your AI Financial Coach!</p>
                  <div className="text-sm space-y-1">
                    <p>Ask me anything about your bills and finances:</p>
                    <div className="grid grid-cols-1 gap-2 mt-4 text-left">
                      <div className="text-xs bg-muted p-2 rounded">
                        "What bills are due this week?"
                      </div>
                      <div className="text-xs bg-muted p-2 rounded">
                        "Help me create a payment schedule"
                      </div>
                      {isPro && (
                        <div className="text-xs bg-gradient-to-r from-purple-100 to-blue-100 p-2 rounded">
                          "Analyze my spending patterns and suggest optimizations" 
                          <Crown className="h-3 w-3 inline ml-1" />
                        </div>
                      )}
                    </div>
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