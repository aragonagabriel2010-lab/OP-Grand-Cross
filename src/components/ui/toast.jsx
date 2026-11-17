import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ({ children, ...props }) => (
  <div {...props}>{children}</div>
);
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[100] flex w-[min(100%-1rem,22rem)] -translate-x-1/2 flex-col gap-2 p-0 pointer-events-none [&_*]:pointer-events-auto",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-xl border-2 border-black p-3.5 pr-9 shadow-[0_4px_0_0_#000] transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        default: "bg-[#164446] text-white",
        destructive: "bg-[#7f1d1d] text-white",
        warning: "bg-[#164446] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <button
    type="button"
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-[#f5a623] px-3 text-xs font-bold uppercase text-black shadow-[0_2px_0_0_#000]",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, onClick, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className={cn(
      "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border-2 border-black bg-[#0b161b] text-[#f5a623] transition-colors hover:bg-[#0d2a2c]",
      className
    )}
    aria-label="Chiudi"
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-bold uppercase tracking-wide text-[#f5a623]", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs uppercase tracking-wide text-white/80", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
