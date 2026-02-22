"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import type { ResumeData, PersonalInfo } from "@/types/resume";

type ParsedData = Partial<ResumeData>;

export function CVUploader({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [rawText, setRawText] = useState("");
  const [uploadedPath, setUploadedPath] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setStep("upload");
    setParsed(null);
    setRawText("");
    setUploadedPath("");
    setIsUploading(false);
    setIsCreating(false);
  }

  async function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx"].includes(ext)) {
      toast.error("Only PDF and DOCX files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/parse", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      setParsed(data.parsed);
      setRawText(data.rawText);
      setUploadedPath(data.uploadedFilePath);
      setStep("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function updateParsedField(field: keyof PersonalInfo, value: string) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      personalInfo: { ...parsed.personalInfo!, [field]: value },
    });
  }

  async function handleCreate() {
    if (!parsed) return;
    setIsCreating(true);
    try {
      const createRes = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: parsed.personalInfo?.name || "Uploaded Resume" }),
      });
      const createData = await createRes.json();
      if (!createData.resume) throw new Error("Create failed");

      await fetch(`/api/resumes/${createData.resume.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed, uploadedFile: uploadedPath }),
      });

      setOpen(false);
      reset();
      router.push(`/editor/${createData.resume.id}`);
    } catch {
      toast.error("Failed to create resume");
    } finally {
      setIsCreating(false);
    }
  }

  const info = parsed?.personalInfo;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload CV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{step === "upload" ? "Upload Your CV" : "Review Parsed Data"}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">Parsing your CV...</p>
              </div>
            ) : (
              <>
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium mb-1">Drag & drop your CV here</p>
                <p className="text-sm text-muted-foreground mb-4">PDF or DOCX, max 10MB</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Browse Files
                </Button>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleInputChange} />
              </>
            )}
          </div>
        )}

        {step === "review" && parsed && (
          <div className="flex gap-4 flex-1 overflow-hidden">
            {/* Parsed fields */}
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>CV parsed successfully. Review and correct below.</span>
                </div>

                <fieldset className="space-y-2 border rounded-md p-3">
                  <legend className="text-xs font-semibold px-1">Personal Info</legend>
                  {(["name","email","phone","address","linkedin","website"] as (keyof PersonalInfo)[]).map((f) => (
                    <div key={f}>
                      <Label className="text-xs capitalize">{f}</Label>
                      <Input className="h-8 text-sm" value={(info as unknown as Record<string,string>)?.[f] || ""} onChange={(e) => updateParsedField(f, e.target.value)} placeholder={`Could not detect ${f}`} />
                    </div>
                  ))}
                </fieldset>

                {parsed.summary && (
                  <fieldset className="border rounded-md p-3">
                    <legend className="text-xs font-semibold px-1">Summary</legend>
                    <textarea className="w-full min-h-[60px] rounded border border-input bg-background px-2 py-1 text-sm resize-y" value={parsed.summary || ""} onChange={(e) => setParsed({ ...parsed, summary: e.target.value })} />
                  </fieldset>
                )}

                {(parsed.workExperience?.length ?? 0) > 0 && (
                  <fieldset className="border rounded-md p-3">
                    <legend className="text-xs font-semibold px-1">Work Experience ({parsed.workExperience!.length})</legend>
                    {parsed.workExperience!.map((exp, i) => (
                      <div key={i} className="text-xs border-b last:border-0 py-1">
                        <span className="font-medium">{exp.position || "?"}</span> at {exp.company || "?"} ({exp.startDate} — {exp.isCurrent ? "Present" : exp.endDate})
                      </div>
                    ))}
                  </fieldset>
                )}

                {(parsed.education?.length ?? 0) > 0 && (
                  <fieldset className="border rounded-md p-3">
                    <legend className="text-xs font-semibold px-1">Education ({parsed.education!.length})</legend>
                    {parsed.education!.map((edu, i) => (
                      <div key={i} className="text-xs border-b last:border-0 py-1">
                        <span className="font-medium">{edu.degree || "?"}</span> — {edu.institution || "?"}
                      </div>
                    ))}
                  </fieldset>
                )}

                {(parsed.skills?.length ?? 0) > 0 && (
                  <fieldset className="border rounded-md p-3">
                    <legend className="text-xs font-semibold px-1">Skills ({parsed.skills!.length})</legend>
                    <p className="text-xs">{parsed.skills!.map(s => s.name).join(", ")}</p>
                  </fieldset>
                )}

                {(parsed.workExperience?.length === 0 && parsed.education?.length === 0 && parsed.skills?.length === 0) && (
                  <div className="flex items-center gap-2 text-sm text-orange-500 p-3 border rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span>Could not detect structured data. You can still create the resume and fill in manually.</span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Raw text */}
            <div className="w-[40%] hidden md:block border-l pl-4">
              <p className="text-xs font-semibold mb-1 text-muted-foreground">Original Text</p>
              <ScrollArea className="h-[50vh]">
                <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{rawText}</pre>
              </ScrollArea>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={reset}>Back</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Creating...</> : "Create Resume from Upload"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
