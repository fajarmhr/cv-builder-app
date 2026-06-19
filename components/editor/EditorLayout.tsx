"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EditorLayoutProps {
  formPanel: React.ReactNode;
  previewPanel: React.ReactNode;
}

export function EditorLayout({ formPanel, previewPanel }: EditorLayoutProps) {
  const [activeTab, setActiveTab] = useState("edit");

  return (
    <>
      {/* Desktop: side by side */}
      <div className="hidden md:flex flex-1 min-h-0">
        <div className="w-[42%] border-r border-[var(--c-border)] bg-[var(--c-surface)]/80 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            <div className="editor-form-surface p-5">{formPanel}</div>
          </div>
        </div>
        <div className="w-[58%] bg-[#efe5d8]/70 flex flex-col min-h-0 overflow-hidden">
          {previewPanel}
        </div>
      </div>

      {/* Mobile: tabs */}
      <div className="md:hidden flex-1 flex flex-col min-h-0">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="mx-4 mt-3 grid w-auto grid-cols-2 rounded-full bg-[var(--c-surface-2)] p-1">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="flex-1 min-h-0 mt-0">
            <div className="h-full overflow-y-auto">
              <div className="editor-form-surface p-4">{formPanel}</div>
            </div>
          </TabsContent>
          <TabsContent value="preview" className="flex-1 min-h-0 mt-0">
            {previewPanel}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
