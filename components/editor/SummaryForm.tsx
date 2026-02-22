"use client";

import { useRef, useCallback, useState } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { useAiEnhance } from "@/lib/hooks/useAiEnhance";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Undo2 } from "lucide-react";

export function SummaryForm() {
  const { resume, updateSummary } = useResumeStore();
  const { enhance, isEnhancing } = useAiEnhance();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [previousText, setPreviousText] = useState<string | null>(null);

  const handleChange = useCallback(
    (value: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        updateSummary(value);
      }, 300);
    },
    [updateSummary]
  );

  async function handleEnhance() {
    const currentText = textareaRef.current?.value || resume?.summary || "";
    if (!currentText.trim()) return;

    // Get context from work experience if available
    const firstJob = resume?.workExperience?.[0];
    const context = firstJob
      ? { jobTitle: firstJob.position, company: firstJob.company }
      : undefined;

    const enhanced = await enhance({
      type: "summary",
      text: currentText,
      context,
    });

    if (enhanced) {
      setPreviousText(currentText);
      updateSummary(enhanced);
      if (textareaRef.current) {
        textareaRef.current.value = enhanced;
      }
    }
  }

  function handleUndo() {
    if (previousText !== null) {
      updateSummary(previousText);
      if (textareaRef.current) {
        textareaRef.current.value = previousText;
      }
      setPreviousText(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-xs">Professional Summary</Label>
        <div className="flex items-center gap-1.5">
          {previousText !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={handleUndo}
              title="Undo AI enhancement"
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Undo
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {(resume?.summary || "").length} chars
          </span>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
        placeholder="Write a brief professional summary or objective..."
        defaultValue={resume?.summary || ""}
        onChange={(e) => handleChange(e.target.value)}
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={handleEnhance}
        disabled={isEnhancing || !(resume?.summary || "").trim()}
      >
        {isEnhancing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Enhancing...
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Enhance with AI
          </>
        )}
      </Button>
    </div>
  );
}
