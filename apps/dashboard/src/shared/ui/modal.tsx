import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/** Accessible dialog (Radix): focus trap, Esc to close, labelled title. */
export function Modal({ open, onOpenChange, title, description, children, footer, width = 'w-[min(560px,92vw)]' }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-navy-950/50" />
        <Dialog.Content
          /* Without a description, tell Radix there is none (no a11y warning). */
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={`fixed top-1/2 left-1/2 flex max-h-[88vh] ${width} -translate-x-1/2 -translate-y-1/2 flex-col rounded-card bg-surface shadow-xl`}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="font-semibold text-text">{title}</Dialog.Title>
              {description && <Dialog.Description className="text-sm text-text-muted">{description}</Dialog.Description>}
            </div>
            <Dialog.Close aria-label={t('common.close')} className="rounded-control p-1 text-text-muted hover:bg-canvas">
              <X size={18} aria-hidden />
            </Dialog.Close>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
