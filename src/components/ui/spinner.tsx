import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'secondary' | 'white';
}

export function Spinner({ size = 'md', className, color = 'primary' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  const colorClasses = {
    primary: 'border-blue-600 border-t-transparent',
    secondary: 'border-gray-600 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  );
}

interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  spinnerClassName?: string;
}

export function Loading({
  text = 'Chargement...',
  size = 'md',
  className,
  spinnerClassName,
}: LoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <Spinner size={size} className={spinnerClassName} />
      {text && <p className="mt-2 text-gray-600">{text}</p>}
    </div>
  );
}