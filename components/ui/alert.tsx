import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva('flex gap-3 rounded-lg border p-4 text-sm', {
  variants: {
    variant: {
      info: 'border-tech/25 bg-tech/5 text-ink',
      success: 'border-primary/25 bg-primary/5 text-ink',
      warning: 'border-signal/40 bg-signal/10 text-ink',
      danger: 'border-destructive/25 bg-destructive/5 text-ink',
    },
  },
  defaultVariants: { variant: 'info' },
});

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

const ICON_COLORS = {
  info: 'text-tech',
  success: 'text-primary',
  warning: 'text-amber-700',
  danger: 'text-destructive',
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  /** Hide the leading icon when the alert sits inline in dense content. */
  hideIcon?: boolean;
}

export function Alert({ className, variant = 'info', title, hideIcon, children, ...props }: AlertProps) {
  const key = (variant || 'info') as keyof typeof ICONS;
  const Icon = ICONS[key];

  return (
    <div role="status" className={cn(alertVariants({ variant }), className)} {...props}>
      {!hideIcon && <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ICON_COLORS[key])} />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn('text-muted-foreground', title && 'mt-1')}>{children}</div>}
      </div>
    </div>
  );
}
