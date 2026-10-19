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

export const createFormControlGlassClass =
  "h-11 rounded-xl border-white/10 bg-white/5 text-[#F4F4F8] shadow-none placeholder:text-[#8E8EA0] focus-visible:border-[#8B5CF6] focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/30";

export const createFormLabelClass = "text-[13px] font-semibold text-[#2D3748]";
export const createFormLabelGlassClass = "text-[13px] font-semibold text-[#D6D6E2]";

export const glassSelectContentClass =
  "border-white/10 bg-[#14141c] text-[#F4F4F8]";

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
  tone?: "light" | "glass";
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
  tone = "light",
}: CreateFormDialogProps) {
  const glass = tone === "glass";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:rounded-[22px]",
          glass
            ? "border-white/10 bg-[#101016] text-[#F4F4F8] shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            : "border-border bg-white shadow-[0_25px_60px_rgba(45,55,72,0.18)]",
          maxWidthClass[maxWidth],
          className
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center gap-3 border-b px-5 py-4",
            glass ? "border-white/10" : "justify-center border-[#E8EEF2] bg-gradient-to-b from-[#FFFBF5] to-white px-6 pb-5 pt-6 text-center"
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl text-white",
              glass
                ? "h-11 w-11 bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] shadow-[0_8px_18px_rgba(99,102,241,0.35)]"
                : "mx-auto mb-3 h-14 w-14 rounded-2xl bg-accent-brand shadow-[0_10px_24px_rgba(15,118,110,0.35)]"
            )}
          >
            {icon}
          </div>
          <div className={cn("min-w-0", !glass && "w-full")}>
            <DialogTitle
              className={cn(
                "font-semibold tracking-tight",
                glass ? "text-left text-[17px] text-[#F4F4F8]" : "text-center text-xl font-black text-[#2D3748]"
              )}
            >
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription
                className={cn(
                  "mt-0.5 text-sm leading-relaxed",
                  glass ? "text-left text-[#8E8EA0]" : "mx-auto max-w-md text-center text-muted-foreground"
                )}
              >
                {description}
              </DialogDescription>
            ) : null}
          </div>
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", glass && "bg-[#101016]")}>{children}</div>

        {footer ? (
          <div className={cn("shrink-0 border-t px-5 py-4", glass ? "border-white/10 bg-[#101016]" : "border-[#E8EEF2] bg-[#FFFBF5]/80")}>
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
  tone?: "light" | "glass";
};

export function FormSection({
  title,
  description,
  children,
  className,
  tone = "light",
}: FormSectionProps) {
  const glass = tone === "glass";
  return (
    <section
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        glass ? "border-white/10 bg-white/[0.03]" : "border-border bg-[#FFFBF5]/60",
        className
      )}
    >
      <div className="mb-4">
        <h3 className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", glass ? "text-[#C4B5FD]" : "text-sm font-bold tracking-wide text-[#2D3748]")}>
          {title}
        </h3>
        {description ? (
          <p className={cn("mt-1 text-xs leading-relaxed", glass ? "text-[#8E8EA0]" : "text-muted-foreground")}>{description}</p>
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
  tone?: "light" | "glass";
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
  tone = "light",
}: CreateFormFooterProps) {
  const glass = tone === "glass";
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isPending}
        className={cn(
          "h-11 flex-1 rounded-xl font-semibold",
          glass
            ? "border-white/10 bg-white/5 text-[#F4F4F8] hover:bg-white/10 hover:text-white"
            : "border-border bg-white text-[#4A5568] hover:bg-white hover:text-[#2D3748]"
        )}
      >
        {cancelLabel}
      </Button>
      <Button
        type={submitType}
        form={formId}
        onClick={onSubmit}
        disabled={isPending || submitDisabled}
        variant="ghost"
        className={cn(
          "h-11 flex-1 gap-2 rounded-xl font-semibold text-white hover:opacity-95",
          glass ? "btn-violet border-0" : "bg-accent-brand font-bold shadow-[0_8px_20px_rgba(15,118,110,0.3)]"
        )}
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
