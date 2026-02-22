"use client";

import { useEffect, useRef, useCallback } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { toast } from "sonner";

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const DEBOUNCE_DELAY = 2000; // 2 seconds after last change
const MAX_RETRIES = 3;

export function useAutoSave() {
  const { isDirty, isSaving, save } = useResumeStore();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const intervalTimer = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);

  const saveWithRetry = useCallback(async () => {
    if (!isDirty || isSaving) return;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await save();
        retryCount.current = 0;
        return;
      } catch {
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        } else {
          retryCount.current++;
          if (retryCount.current <= 2) {
            toast.error("Auto-save failed. Your changes are preserved locally.");
          }
        }
      }
    }
  }, [isDirty, isSaving, save]);

  // Debounced save on changes
  useEffect(() => {
    if (isDirty) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(saveWithRetry, DEBOUNCE_DELAY);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [isDirty, saveWithRetry]);

  // Periodic save every 30s
  useEffect(() => {
    intervalTimer.current = setInterval(() => {
      if (isDirty && !isSaving) {
        saveWithRetry();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (intervalTimer.current) clearInterval(intervalTimer.current);
    };
  }, [isDirty, isSaving, saveWithRetry]);

  // Warn on page leave if unsaved
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}
