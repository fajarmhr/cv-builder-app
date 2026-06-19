"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/lib/store/resume-store";

export function CVPhotoControl() {
  const { resume, updatePersonalInfo } = useResumeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const photoUrl = resume?.personalInfo?.photoUrl || "";

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/upload/photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to upload photo");
        return;
      }

      updatePersonalInfo("photoUrl", data.photoUrl);
      toast.success("CV photo updated");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="rounded-full border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ink-2)] shadow-sm hover:bg-[var(--c-surface-2)] hover:text-[var(--c-primary)]"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        title="Upload photo for CV template"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        CV Photo
      </Button>
      {photoUrl && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full text-[var(--c-muted)] hover:bg-[#f7dfd8] hover:text-[var(--c-danger)]"
          onClick={() => updatePersonalInfo("photoUrl", "")}
          title="Remove CV photo"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handlePhotoUpload}
      />
    </div>
  );
}
