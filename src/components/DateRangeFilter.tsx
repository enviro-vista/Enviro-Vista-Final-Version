import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onPresetChange: (preset: string) => void;
  preset: string;
}

const PRESETS = [
  { value: '1h', label: 'Last Hour' },
  { value: '6h', label: 'Last 6 Hours' },
  { value: '12h', label: 'Last 12 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '3d', label: 'Last 3 Days' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '14d', label: 'Last 14 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export const DateRangeFilter = ({ value, onChange, onPresetChange, preset }: DateRangeFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (newPreset: string) => {
    onPresetChange(newPreset);
    if (newPreset !== 'custom') {
      const now = new Date();
      let from = new Date();

      switch (newPreset) {
        case '1h':
          from.setHours(now.getHours() - 1);
          break;
        case '6h':
          from.setHours(now.getHours() - 6);
          break;
        case '12h':
          from.setHours(now.getHours() - 12);
          break;
        case '24h':
          from.setHours(now.getHours() - 24);
          break;
        case '3d':
          from.setDate(now.getDate() - 3);
          break;
        case '7d':
          from.setDate(now.getDate() - 7);
          break;
        case '14d':
          from.setDate(now.getDate() - 14);
          break;
        case '30d':
          from.setDate(now.getDate() - 30);
          break;
        case '90d':
          from.setDate(now.getDate() - 90);
          break;
        default:
          return;
      }

      onChange({ from, to: now });
    }
    setIsOpen(false);
  };

  const handleDateSelect = (range: DateRange) => {
    onChange(range);
    if (range.from && range.to) {
      onPresetChange('custom');
    }
  };

  const formatDateRange = () => {
    if (preset !== 'custom') {
      return PRESETS.find(p => p.value === preset)?.label || 'Select range';
    }
    
    if (value.from && value.to) {
      return `${format(value.from, 'MMM dd')} - ${format(value.to, 'MMM dd, yyyy')}`;
    }
    
    if (value.from) {
      return format(value.from, 'MMM dd, yyyy');
    }
    
    return 'Select date range';
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Range:</span>
        </div>
        
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preset === 'custom' && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !value.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={value.from}
                selected={value}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </Card>
  );
};
