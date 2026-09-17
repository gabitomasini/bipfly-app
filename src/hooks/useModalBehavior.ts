"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseModalBehaviorOptions {
  isOpen: boolean;
  onClose: () => void;
}

interface UseModalBehaviorReturn {
  overlayProps: {
    onClick: (e: React.MouseEvent) => void;
  };
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook that provides standard modal behavior:
 * - ESC key closes the modal
 * - Clicking on the overlay (outside modal content) closes it
 * - Focus is trapped inside the modal while open
 */
export function useModalBehavior({
  isOpen,
  onClose,
}: UseModalBehaviorOptions): UseModalBehaviorReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;

    const getFocusableElements = (): HTMLElement[] => {
      const selectors =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(container.querySelectorAll<HTMLElement>(selectors));
    };

    // Focus the first focusable element on open
    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      // Delay to let the modal render
      requestAnimationFrame(() => {
        focusables[0]?.focus();
      });
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableEls = getFocusableElements();
      if (focusableEls.length === 0) return;

      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  // Overlay click handler: close only when clicking the overlay itself
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return {
    overlayProps: {
      onClick: handleOverlayClick,
    },
    containerRef,
  };
}
