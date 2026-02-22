"use client";

import { useResumeStore } from "@/lib/store/resume-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy } from "lucide-react";
import type { Reference } from "@/types/resume";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export function ReferencesForm() {
  const { resume, addItem, updateItem, removeItem, duplicateItem } = useResumeStore();
  const references: Reference[] = resume?.references || [];

  function handleAdd() {
    addItem("references", {
      id: generateId(),
      name: "",
      position: "",
      company: "",
      email: "",
      phone: "",
    } as Reference);
  }

  function handleUpdate(index: number, field: keyof Reference, value: string) {
    const current = references[index];
    updateItem("references", index, { ...current, [field]: value });
  }

  function handleRemove(index: number) {
    removeItem("references", index);
  }

  return (
    <div className="space-y-3">
      {references.map((ref, index) => (
        <div key={ref.id || index} className="border rounded-md p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {ref.name || "New Reference"}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => duplicateItem("references", index)}
                title="Duplicate"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleRemove(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input
                className="h-8 text-sm mt-1"
                placeholder="John Doe"
                defaultValue={ref.name}
                onChange={(e) => handleUpdate(index, "name", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Position</Label>
              <Input
                className="h-8 text-sm mt-1"
                placeholder="Manager"
                defaultValue={ref.position}
                onChange={(e) => handleUpdate(index, "position", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Company</Label>
              <Input
                className="h-8 text-sm mt-1"
                placeholder="Company Name"
                defaultValue={ref.company}
                onChange={(e) => handleUpdate(index, "company", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                className="h-8 text-sm mt-1"
                placeholder="john@example.com"
                defaultValue={ref.email}
                onChange={(e) => handleUpdate(index, "email", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                className="h-8 text-sm mt-1"
                placeholder="+1 234 567 890"
                defaultValue={ref.phone}
                onChange={(e) => handleUpdate(index, "phone", e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Reference
      </Button>
    </div>
  );
}
