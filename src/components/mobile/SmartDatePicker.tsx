import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Clock } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

interface SmartDatePickerProps {
  value: string; // ISO date string
  onChange: (date: string) => void;
  disabled?: boolean;
  className?: string;
}

const quickOptions = [
  { label: 'Today', getDate: () => new Date() },
  { label: 'Tomorrow', getDate: () => addDays(new Date(), 1) },
  { label: 'Next Monday', getDate: () => {
    const today = new Date();
    const nextMonday = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    return nextMonday;
  }},
  { label: 'Next Week', getDate: () => addDays(new Date(), 7) },
  { label: 'Next Month', getDate: () => addDays(new Date(), 30) },
];

export function SmartDatePicker({ value, onChange, disabled = false, className = '' }: SmartDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = value ? new Date(value) : undefined;

  const handleQuickSelect = (getDate: () => Date) => {
    const date = getDate();
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal min-h-[48px]",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-2">
          <div className="text-sm font-medium mb-2">Quick Select</div>
          <div className="grid grid-cols-2 gap-2">
            {quickOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(option.getDate)}
                className="min-h-[48px] justify-start"
              >
                <Clock className="mr-2 h-4 w-4" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

