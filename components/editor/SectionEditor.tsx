"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useResumeStore } from "@/lib/store/resume-store";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import type { SectionId } from "@/types/resume";
import { isCustomSectionId, getCustomSectionEntryId } from "@/types/resume";

import { PersonalInfoForm } from "./PersonalInfoForm";
import { SummaryForm } from "./SummaryForm";
import { ExperienceForm } from "./ExperienceForm";
import { EducationForm } from "./EducationForm";
import { SkillsForm } from "./SkillsForm";
import { CertificationsForm } from "./CertificationsForm";
import { LanguagesForm } from "./LanguagesForm";
import { ProjectsForm } from "./ProjectsForm";
import { AwardsForm } from "./AwardsForm";
import { ReferencesForm } from "./ReferencesForm";
import { CustomSectionForm } from "./CustomSectionForm";
import { ClonedSectionForm } from "./ClonedSectionForm";

const SECTION_LABELS: Record<string, string> = {
  personalInfo: "Personal Information",
  summary: "Professional Summary",
  workExperience: "Work Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
  projects: "Projects",
  awards: "Awards",
  references: "References",
  customSections: "Custom Sections",
};

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  personalInfo: PersonalInfoForm,
  summary: SummaryForm,
  workExperience: ExperienceForm,
  education: EducationForm,
  skills: SkillsForm,
  certifications: CertificationsForm,
  languages: LanguagesForm,
  projects: ProjectsForm,
  awards: AwardsForm,
  references: ReferencesForm,
  customSections: CustomSectionForm,
};

function getItemCount(resume: Record<string, unknown>, sectionId: string): number | null {
  const arrayKeys = ["workExperience", "education", "skills", "certifications", "languages", "projects", "awards", "references", "customSections"];
  if (arrayKeys.includes(sectionId)) {
    const arr = resume[sectionId];
    if (!Array.isArray(arr)) return 0;
    // For customSections, exclude cloned sections (which have basedOn set)
    if (sectionId === "customSections") {
      return arr.filter((cs: Record<string, unknown>) => !cs.basedOn).length;
    }
    return arr.length;
  }
  return null;
}

const ARRAY_SECTIONS = new Set([
  "workExperience", "education", "skills", "certifications",
  "languages", "projects", "awards", "references", "customSections",
]);

/* ------------------------------------------------------------------ */
/*  SortableSection — built-in section card                           */
/* ------------------------------------------------------------------ */

function SortableSection({
  sectionId,
  isCollapsed,
  onToggleCollapse,
  onToggleVisibility,
  onDuplicateSection,
  itemCount,
}: {
  sectionId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleVisibility: () => void;
  onDuplicateSection: () => void;
  itemCount: number | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as string | number,
  };

  const Component = SECTION_COMPONENTS[sectionId];

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            className="flex items-center gap-2 font-semibold text-sm hover:text-primary transition-colors min-w-0"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">
              {SECTION_LABELS[sectionId] || sectionId}
              {itemCount !== null && itemCount > 0 && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({itemCount})
                </span>
              )}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {ARRAY_SECTIONS.has(sectionId) && itemCount !== null && itemCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onDuplicateSection}
              title="Duplicate section as new card"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleVisibility}
            title="Hide section"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {!isCollapsed && Component && (
        <div className="px-4 pb-4">
          <Component />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SortableCustomCard — standalone custom section card               */
/* ------------------------------------------------------------------ */

function SortableCustomCard({
  orderKey,
  isCollapsed,
  onToggleCollapse,
  onToggleVisibility,
}: {
  orderKey: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleVisibility: () => void;
}) {
  const { resume, removeCustomCard } = useResumeStore();

  const customId = getCustomSectionEntryId(orderKey);
  const cs = resume?.customSections.find((s) => s.id === customId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: orderKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as string | number,
  };

  if (!cs) return null;

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-card border-dashed border-primary/30">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            className="flex items-center gap-2 font-semibold text-sm hover:text-primary transition-colors min-w-0"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">
              {cs.title || "Untitled Section"}
              {cs.basedOn && cs.items && cs.items.length > 0 && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({cs.items.length})
                </span>
              )}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => removeCustomCard(customId)}
            title="Delete this section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleVisibility}
            title="Hide section"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {cs.basedOn ? (
            <ClonedSectionForm clonedId={customId} basedOn={cs.basedOn} />
          ) : (
            <p className="text-sm text-muted-foreground">Plain custom section</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SectionEditor — main component                                    */
/* ------------------------------------------------------------------ */

export function SectionEditor() {
  const { resume, toggleSectionVisibility, updateSectionOrder, duplicateSection } =
    useResumeStore();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );
  const [showAddMenu, setShowAddMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!resume) return null;

  const sectionOrder = resume.sectionOrder || [];
  const hiddenSections = resume.hiddenSections || [];

  function toggleCollapse(sectionId: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  const visibleSections = sectionOrder.filter(
    (s) => !hiddenSections.includes(s)
  );
  const hiddenSectionsList = sectionOrder.filter((s) =>
    hiddenSections.includes(s)
  );

  /** Get label for hidden sections list — handles both built-in and custom */
  function getSectionLabel(sectionId: string): string {
    if (isCustomSectionId(sectionId)) {
      const entryId = getCustomSectionEntryId(sectionId);
      const cs = resume?.customSections.find((s) => s.id === entryId);
      return cs?.title || "Untitled Section";
    }
    return SECTION_LABELS[sectionId] || sectionId;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleSections.indexOf(active.id as string);
    const newIndex = visibleSections.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    const newVisible = arrayMove(visibleSections, oldIndex, newIndex);
    const newOrder = [...newVisible, ...hiddenSectionsList];
    updateSectionOrder(newOrder);
  }

  function handleShowSection(sectionId: string) {
    toggleSectionVisibility(sectionId);
    setShowAddMenu(false);
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleSections}
          strategy={verticalListSortingStrategy}
        >
          {visibleSections.map((sectionId) =>
            isCustomSectionId(sectionId) ? (
              <SortableCustomCard
                key={sectionId}
                orderKey={sectionId}
                isCollapsed={collapsedSections.has(sectionId)}
                onToggleCollapse={() => toggleCollapse(sectionId)}
                onToggleVisibility={() => toggleSectionVisibility(sectionId)}
              />
            ) : (
              <SortableSection
                key={sectionId}
                sectionId={sectionId}
                isCollapsed={collapsedSections.has(sectionId)}
                onToggleCollapse={() => toggleCollapse(sectionId)}
                onToggleVisibility={() => toggleSectionVisibility(sectionId)}
                onDuplicateSection={() =>
                  duplicateSection(sectionId as SectionId)
                }
                itemCount={getItemCount(
                  resume as unknown as Record<string, unknown>,
                  sectionId
                )}
              />
            )
          )}
        </SortableContext>
      </DndContext>

      {/* Hidden sections */}
      {hiddenSectionsList.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">
            Hidden Sections
          </p>
          <div className="space-y-1">
            {hiddenSectionsList.map((sectionId) => (
              <div
                key={sectionId}
                className="flex items-center justify-between px-4 py-2 border rounded-lg bg-muted/50 opacity-60"
              >
                <span className="text-sm">
                  {getSectionLabel(sectionId)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => toggleSectionVisibility(sectionId)}
                  title="Show section"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Section button */}
      {hiddenSectionsList.length > 0 && (
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAddMenu(!showAddMenu)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Section
          </Button>
          {showAddMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-md z-10 py-1">
              {hiddenSectionsList.map((sectionId) => (
                <button
                  key={sectionId}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => handleShowSection(sectionId)}
                >
                  {getSectionLabel(sectionId)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
