import { useEffect } from "react";
import { AudioManager } from "@/lib/AudioManager";

const INTERACTIVE_SEL = [
  "button",
  "a[href]",
  '[role="button"]',
  "[data-sfx]",
  'input[type="submit"]',
  'input[type="button"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="range"]',
  "summary",
  "[data-slot]",
].join(",");

function isInteractive(el) {
  if (!el || el.nodeType !== 1) return null;
  const target = el.closest?.(INTERACTIVE_SEL);
  if (!target) return null;
  if (target.dataset?.sfx === "off") return null;
  if (target.disabled || target.getAttribute("aria-disabled") === "true") return null;
  if (target.getAttribute("aria-hidden") === "true") return null;
  return target;
}

/**
 * SFX UI globali. Volume/mute solo dalle Impostazioni.
 */
export default function UiSfxBridge() {
  useEffect(() => {
    AudioManager.boot();

    const markMove = () => AudioManager.notePointerMove();

    const onOver = (e) => {
      if (e.pointerType === "touch") return;
      const target = isInteractive(e.target);
      if (!target) return;
      const from = e.relatedTarget;
      if (from && target.contains(from)) return;
      AudioManager.playHover(target);
    };

    const onClick = (e) => {
      const target = isInteractive(e.target);
      if (!target) return;
      AudioManager.muteHover(400);
      AudioManager.playClick();
    };

    document.addEventListener("pointermove", markMove, { capture: true, passive: true });
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("pointermove", markMove, true);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
