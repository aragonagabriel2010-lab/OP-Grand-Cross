import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { TEAL, PANEL } from "@/lib/arcade";
import { cn } from "@/lib/utils";

/**
 * Modale centrato fixed — sopra bottom bar / top bar, overlay che blocca i click.
 */
export default function GameModal({
  open,
  onClose,
  title,
  children,
  className,
  panelClassName,
  showClose = true,
  closeOnOverlay = true,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="game-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "fixed inset-0 z-[90] flex items-center justify-center p-4",
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-label={title || "Dialogo"}
        >
          <button
            type="button"
            aria-label="Chiudi overlay"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              if (closeOnOverlay) onClose?.();
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={cn(
              "relative z-10 flex max-h-[min(85dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl",
              TEAL,
              PANEL,
              panelClassName
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {(title || showClose) && (
              <div className="mb-0 flex shrink-0 items-start justify-between gap-2 border-b-2 border-black/40 px-4 pb-3 pt-4">
                {title ? (
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#f5a623]">
                    {title}
                  </h2>
                ) : (
                  <span />
                )}
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-[#0b161b]"
                    aria-label="Chiudi"
                  >
                    <X size={14} className="text-[#f5a623]" />
                  </button>
                )}
              </div>
            )}
            <div className="game-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
