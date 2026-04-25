'use client';

import { Info } from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface InfoTipProps {
  text: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTip({ text, side = 'top' }: InfoTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="inline-flex cursor-help text-[var(--color-text-muted)] transition-colors hover:text-secondary"
      >
        <Info size={14} />
      </TooltipTrigger>
      <TooltipContent side={side}>{text}</TooltipContent>
    </Tooltip>
  );
}
