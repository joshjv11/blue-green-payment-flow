import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Voice Input - DISABLED
 * Requires Web Speech API support
 */
export function VoiceInput({ onTranscript, language, disabled, className }: VoiceInputProps) {
  const { toast } = useToast();

  const handleClick = () => {
    toast({
      title: 'Feature Not Available',
      description: 'Voice input requires browser support for Web Speech API',
      variant: 'destructive',
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleClick}
      disabled={disabled}
      className={`min-h-[48px] min-w-[48px] ${className}`}
      title="Voice input (not available)"
    >
      <Mic className="h-5 w-5 opacity-50" />
    </Button>
  );
}
