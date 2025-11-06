import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { motion, AnimatePresence } from 'framer-motion';
import { Locale, t } from '@/utils/locale';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
}

const getTourSteps = (locale: Locale): TourStep[] => [
  {
    id: 'add-bill',
    title: t('add_new_bill', locale),
    description: locale === 'hi-IN' 
      ? '"Add" बटन पर क्लिक करें और अपना पहला बिल बनाएं। अपने खर्चों को आसानी से ट्रैक करें!'
      : 'Click the "Add" button to create a bill. Track your expenses easily!',
    target: '[data-tour="add-bill"]',
  },
  {
    id: 'set-reminder',
    title: t('reminder', locale),
    description: locale === 'hi-IN'
      ? 'ईमेल अनुस्मारक सक्षम करें ताकि आप कभी भुगतान की समय सीमा न चूकें।'
      : 'Enable email reminders to never miss a payment deadline.',
    target: '[data-tour="reminder"]',
  },
  {
    id: 'mark-paid',
    title: t('mark_paid', locale),
    description: locale === 'hi-IN'
      ? 'जब आप बिल का भुगतान करते हैं, तो इसे "भुगतान किया" के रूप में चिह्नित करें।'
      : 'When you pay a bill, mark it as paid to track your progress.',
    target: '[data-tour="mark-paid"]',
  },
];

export function OnboardingTour() {
  const [completed, setCompleted] = useLocalStorage<boolean>('invoiceflow_onboarding_completed', false);
  const [locale] = useLocalStorage<Locale>('invoiceflow_locale', 'en-IN');
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(!completed);
  
  const tourSteps = getTourSteps(locale);

  useEffect(() => {
    // Show tour only if not completed
    if (completed) {
      setIsVisible(false);
    }
  }, [completed]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setCompleted(true);
    setIsVisible(false);
  };

  if (!isVisible || completed) return null;

  const currentTourStep = tourSteps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card className="border-2 border-primary shadow-2xl">
            <CardHeader className="relative pb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="absolute top-2 right-2 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  {tourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'w-8 bg-primary'
                          : index < currentStep
                          ? 'w-2 bg-primary/50'
                          : 'w-2 bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-auto">
                  {currentStep + 1} / {tourSteps.length}
                </span>
              </div>
              <CardTitle className="text-xl">{currentTourStep.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{currentTourStep.description}</p>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1"
                >
                  Skip Tour
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 gap-2"
                >
                  {currentStep === tourSteps.length - 1 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Get Started
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

