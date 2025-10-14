import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange, getDateRangePresets } from '@/utils/financialCalculations';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const DateRangeFilter = ({ dateRange, onDateRangeChange }: DateRangeFilterProps) => {
  const presets = getDateRangePresets();

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Preset buttons */}
      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant={dateRange.label === preset.label ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDateRangeChange(preset)}
        >
          {preset.label}
        </Button>
      ))}

      {/* Custom date range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {dateRange.label === 'Custom' ? (
              <>
                {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
              </>
            ) : (
              'Custom'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{
              from: dateRange.start,
              to: dateRange.end
            }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({
                  start: range.from,
                  end: range.to,
                  label: 'Custom'
                });
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
