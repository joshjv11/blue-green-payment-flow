import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExpenseCategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export const ExpenseCategoryFilter = ({
  categories,
  selected,
  onSelect,
}: ExpenseCategoryFilterProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Button
          key={category}
          variant={selected === category ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(category)}
          className={cn(
            'transition-all',
            selected === category && 'shadow-md'
          )}
        >
          {category}
        </Button>
      ))}
    </div>
  );
};
