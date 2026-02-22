import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type HijriDate,
  gregorianToHijri,
  hijriToGregorian,
  daysInHijriMonth,
  getHijriMonths,
} from '@/lib/hijri';

interface Props {
  selected?: HijriDate;
  onSelect: (date: HijriDate) => void;
  language: 'fr' | 'en';
  className?: string;
}

export default function HijriCalendar({ selected, onSelect, language, className }: Props) {
  const today = useMemo(() => gregorianToHijri(new Date()), []);
  const [viewYear, setViewYear] = useState(selected?.year || today.year);
  const [viewMonth, setViewMonth] = useState(selected?.month || today.month);

  const months = getHijriMonths(language);
  const numDays = useMemo(() => daysInHijriMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  // Day of week for the 1st of this Hijri month (0=Sun)
  const firstDayOfWeek = useMemo(() => {
    const gDate: Date = hijriToGregorian({ year: viewYear, month: viewMonth, day: 1 });
    return gDate.getDay();
  }, [viewYear, viewMonth]);

  const dayLabels = language === 'fr'
    ? ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(y => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(y => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const isSelected = (day: number) =>
    selected && selected.year === viewYear && selected.month === viewMonth && selected.day === day;

  const isToday = (day: number) =>
    today.year === viewYear && today.month === viewMonth && today.day === day;

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);

  return (
    <div className={cn('p-3 pointer-events-auto', className)}>
      {/* Header nav */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {months[viewMonth - 1]} {viewYear}
        </span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map(d => (
          <div key={d} className="text-center text-[0.7rem] text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center h-9 w-full">
            {day ? (
              <button
                type="button"
                onClick={() => onSelect({ year: viewYear, month: viewMonth, day })}
                className={cn(
                  'h-8 w-8 rounded-md text-sm transition-colors',
                  isSelected(day)
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : isToday(day)
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50',
                )}
              >
                {day}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
