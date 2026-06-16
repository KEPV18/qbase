import { cn } from './utils';

interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  padding?: boolean;
}

const sizeClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

export function Container({ 
  children, 
  size = 'lg', 
  className,
  padding = true 
}: ContainerProps) {
  return (
    <div className={cn(
      'mx-auto w-full',
      sizeClasses[size],
      padding && 'px-4 sm:px-6 lg:px-8',
      className
    )}>
      {children}
    </div>
  );
}

// Section wrapper with title and optional description
interface SectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Section({ 
  title, 
  description, 
  action,
  children, 
  className 
}: SectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}

// Card section with header
interface CardSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function CardSection({
  title,
  description,
  action,
  children,
  className,
  noPadding = false,
}: CardSectionProps) {
  return (
    <div className={cn('border rounded-sm', className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
}

// Responsive grid
interface GridProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function Grid({ 
  children, 
  cols = { default: 1, md: 2, lg: 3 },
  gap = 4,
  className 
}: GridProps) {
  const gridClass = [
    'grid',
    `grid-cols-${cols.default || 1}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    `gap-${gap}`,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={cn(gridClass, className)}>
      {children}
    </div>
  );
}

// Flexbox utilities
interface FlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: number;
  wrap?: boolean;
  className?: string;
}

export function Flex({ 
  children, 
  direction = 'row', 
  align = 'start',
  justify = 'start',
  gap = 0,
  wrap = false,
  className 
}: FlexProps) {
  return (
    <div className={cn(
      'flex',
      `flex-${direction}`,
      `items-${align}`,
      `justify-${justify}`,
      gap > 0 && `gap-${gap}`,
      wrap && 'flex-wrap',
      className
    )}>
      {children}
    </div>
  );
}