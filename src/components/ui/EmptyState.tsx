import { Inbox, FileX, SearchX, FolderOpen } from 'lucide-react';
import { Button } from './button';

type EmptyStateVariant = 'default' | 'search' | 'no-results' | 'no-files' | 'custom';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const defaultConfig = {
  default: {
    icon: <Inbox className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No data yet',
    description: 'Start by adding some content to get started.',
  },
  search: {
    icon: <SearchX className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No search results',
    description: 'Try adjusting your search or filter criteria.',
  },
  'no-results': {
    icon: <FileX className="h-12 w-12 text-muted-foreground/50" />,
    title: 'Nothing found',
    description: 'There are no items to display at the moment.',
  },
  'no-files': {
    icon: <FolderOpen className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No files',
    description: 'Upload files or create new records.',
  },
};

export function EmptyState({ 
  variant = 'default',
  title,
  description,
  icon,
  action,
  className 
}: EmptyStateProps) {
  const config = defaultConfig[variant];
  
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      <div className="mb-4">
        {icon || config.icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title || config.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description || config.description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Compact version for inline use
export function EmptyStateInline({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
      {children}
    </div>
  );
}