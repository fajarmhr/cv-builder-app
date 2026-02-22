"use client";

import { useState } from "react";
import { toast } from "sonner";

interface EnhanceOptions {
  type: "summary" | "bullets";
  text: string;
  context?: {
    jobTitle?: string;
    company?: string;
    industry?: string;
  };
}

export function useAiEnhance() {
  const [isEnhancing, setIsEnhancing] = useState(false);

  async function enhance(options: EnhanceOptions): Promise<string | null> {
    if (!options.text.trim()) {
      toast.error("Write some text first before enhancing");
      return null;
    }

    setIsEnhancing(true);
    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to enhance text");
        return null;
      }

      toast.success("Text enhanced by AI!");
      return data.enhanced;
    } catch {
      toast.error("Failed to connect to AI service");
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }

  return { enhance, isEnhancing };
}
