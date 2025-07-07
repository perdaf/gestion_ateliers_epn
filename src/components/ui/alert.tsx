import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
  X,
  type LucideIcon,
} from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
  icon?: LucideIcon;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantStyles: Record<
  AlertVariant,
  { bg: string; border: string; text: string; icon: LucideIcon }
> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: Info,
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: AlertCircle,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: XCircle,
  },
};

export function Alert({
  variant = 'info',
  title,
  children,
  className,
  icon,
  dismissible = false,
  onDismiss,
}: AlertProps) {
  const { bg, border, text, icon: DefaultIcon } = variantStyles[variant];
  const IconComponent = icon || DefaultIcon;

  return (
    <div
      className={cn(
        'relative rounded-md border p-4',
        bg,
        border,
        text,
        className
      )}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <IconComponent className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="ml-3">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className={cn('text-sm', title && 'mt-2')}>{children}</div>
        </div>
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          onClick={onDismiss}
        >
          <span className="sr-only">Fermer</span>
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}