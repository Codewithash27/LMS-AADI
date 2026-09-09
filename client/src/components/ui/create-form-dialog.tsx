import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const maxWidthClass = {
  "max-w-md": "max-w-md",
  "max-w-lg": "max-w-lg",
  "max-w-xl": "max-w-xl",
  "max-w-2xl": "max-w-2xl",
  "max-w-3xl": "max-w-3xl",
  "max-w-4xl": "max-w-4xl",
} as const;

export type CreateFormDialogMaxWidth = keyof typeof maxWidthClass;

/** Shared control look for create/add forms */
export const createFormControlClass =
  "h-11 rounded-xl border-border bg-white shadow-sm transition-all placeholder:text-[#A0AEC0] focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25";

export const createFormLabelClass = "text-[13px] font-semibold text-[#2D3748]";

type CreateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon: ReactNode;
  maxWidth?: CreateFormDialogMaxWidth;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function CreateFormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  maxWidth = "max-w-xl",
  children,
  footer,
  className,
}: CreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[92vh] flex-col gap-0 overflow-hidden border-border bg-white p-0 shadow-[0_25px_60px_rgba(45,55,72,0.18)] sm:rounded-2xl",
          maxWidthClass[maxWidth],
          className
        )}
      >
        <div className="shrink-0 border-b border-[#E8EEF2] bg-gradient-to-b from-[#FFFBF5] to-white px-6 pb-5 pt-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-brand shadow-[0_10px_24px_rgba(15,118,110,0.35)]">
            {icon}
          </div>
          <DialogTitle className="text-center text-xl font-black tracking-tight text-[#2D3748]">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="mx-auto mt-1.5 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-[#E8EEF2] bg-[#FFFBF5]/80 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-[#FFFBF5]/60 p-4 sm:p-5",
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[#2D3748]">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type CreateFormFooterProps = {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel: string;
  pendingLabel?: string;
  isPending?: boolean;
  submitDisabled?: boolean;
  submitType?: "submit" | "button";
  onSubmit?: () => void;
  showSubmitIcon?: boolean;
  className?: string;
  formId?: string;
};

export function CreateFormFooter({
  onCancel,
  cancelLabel = "Cancel",
  submitLabel,
  pendingLabel = "Creating...",
  isPending = false,
  submitDisabled = false,
  submitType = "submit",
  onSubmit,
  showSubmitIcon = true,
  className,
  formId,
}: CreateFormFooterProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isPending}
        className="h-11 flex-1 rounded-xl border-border bg-white font-semibold text-[#4A5568] hover:bg-white hover:text-[#2D3748]"
      >
        {cancelLabel}
      </Button>
      <Button
        type={submitType}
        form={formId}
        onClick={onSubmit}
        disabled={isPending || submitDisabled}
        className="h-11 flex-1 gap-2 rounded-xl bg-accent-brand font-bold text-white shadow-[0_8px_20px_rgba(15,118,110,0.3)] hover:opacity-95"
      >
        {isPending ? (
          pendingLabel
        ) : (
          <>
            {showSubmitIcon ? <CheckCircle2 className="h-4 w-4" /> : null}
            {submitLabel}
          </>
        )}
      </Button>
    </div>
  );
}
