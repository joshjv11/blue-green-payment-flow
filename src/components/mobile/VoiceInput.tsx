import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string; // 'en-IN' or 'hi-IN' for Hindi
  disabled?: boolean;
  className?: string;
}

export function VoiceInput({ onTranscript, language = 'en-IN', disabled = false, className = '' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ');
        onTranscript(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = 'Voice input failed';
        if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please try again.';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Microphone permission denied. Please enable it in browser settings.';
        }
        
        toast({
          title: 'Voice Input Error',
          description: errorMessage,
          variant: 'destructive',
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, onTranscript, toast]);

  const startListening = () => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Voice input is not supported in your browser. Please use Chrome or Edge.',
        variant: 'destructive',
      });
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast({
          title: 'Error',
          description: 'Failed to start voice input',
          variant: 'destructive',
        });
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  if (!isSupported) {
    return null; // Don't show button if not supported
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className={`min-h-[48px] min-w-[48px] ${className}`}
      title={isListening ? 'Stop recording' : 'Start voice input'}
    >
      {isListening ? (
        <Loader2 className="h-5 w-5 animate-spin text-red-500" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

