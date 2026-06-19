"use client";

import { useResumeStore } from "@/lib/store/resume-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PersonalInfo } from "@/types/resume";
import { useRef, useCallback } from "react";

export function PersonalInfoForm() {
  const { resume, updatePersonalInfo } = useResumeStore();
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(({ key, label, type, placeholder }) => (
          <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
            <Label htmlFor={`pi-${key}`} className="text-xs mb-1.5 block font-medium text-[var(--c-muted)]">
              {label}
            </Label>
            <Input
              id={`pi-${key}`}
              type={type}
              placeholder={placeholder}
              defaultValue={info[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="h-10 rounded-xl border-[var(--c-border)] bg-[var(--c-surface)] text-sm text-[var(--c-ink)] shadow-sm placeholder:text-[var(--c-muted-2)] focus-visible:ring-[var(--c-ring)]/20"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
