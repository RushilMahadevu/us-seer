"use client";

import React, { useEffect } from "react";
import { CheckCircle2, Info, X } from "lucide-react";

export interface ToastProps {
  id?: string;
  title: string;
  message?: string;
  variant?: "success" | "info";
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  title,
  message,
  variant = "success",
  isOpen,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border border-emerald-500/40 bg-card/95 text-foreground backdrop-blur-xl shadow-2xl animate-in fade-in-50 slide-in-from-bottom-5 duration-300 ring-1 ring-emerald-500/20 max-w-sm sm:max-w-md w-[calc(100%-2rem)]"
    >
      <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
        {variant === "success" ? (
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
        ) : (
          <Info className="h-4.5 w-4.5 text-blue-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground tracking-tight">{title}</p>
        {message && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 cursor-pointer"
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
