"use client";

import { useResumeStore } from "@/lib/store/resume-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { PersonalInfo } from "@/types/resume";
import { useRef, useCallback, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PersonalInfoForm() {
  const { resume, updatePersonalInfo } = useResumeStore();
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const info: PersonalInfo = resume?.personalInfo || {
    name: "",
    email: "",
    phone: "",
    address: "",
    linkedin: "",
    website: "",
    photoUrl: "",
  };

  const handleChange = useCallback(
    (field: keyof PersonalInfo, value: string) => {
      if (debounceTimers.current[field]) {
        clearTimeout(debounceTimers.current[field]);
      }
      debounceTimers.current[field] = setTimeout(() => {
        updatePersonalInfo(field, value);
      }, 300);
    },
    [updatePersonalInfo]
  );

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
      toast.success("Photo uploaded!");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemovePhoto() {
    updatePersonalInfo("photoUrl", "");
  }

  const fields: {
    key: keyof PersonalInfo;
    label: string;
    type: string;
    placeholder: string;
  }[] = [
    { key: "name", label: "Full Name", type: "text", placeholder: "John Doe" },
    { key: "email", label: "Email", type: "email", placeholder: "john@example.com" },
    { key: "phone", label: "Phone", type: "tel", placeholder: "+1 234 567 890" },
    { key: "address", label: "Address", type: "text", placeholder: "City, Country" },
    { key: "linkedin", label: "LinkedIn URL", type: "url", placeholder: "https://linkedin.com/in/..." },
    { key: "website", label: "Website", type: "url", placeholder: "https://yoursite.com" },
  ];

  return (
    <div className="space-y-4">
      {/* Photo Upload */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {info.photoUrl ? (
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={info.photoUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
              <button
                onClick={handleRemovePhoto}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
        <div className="flex-1">
          <Label className="text-xs block mb-1">Profile Photo</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : info.photoUrl ? "Change Photo" : "Upload Photo"}
            </Button>
            {info.photoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive"
                onClick={handleRemovePhoto}
              >
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WebP. Max 5MB.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>
      </div>

      {/* Text Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(({ key, label, type, placeholder }) => (
          <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
            <Label htmlFor={`pi-${key}`} className="text-xs mb-1 block">
              {label}
            </Label>
            <Input
              id={`pi-${key}`}
              type={type}
              placeholder={placeholder}
              defaultValue={info[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
