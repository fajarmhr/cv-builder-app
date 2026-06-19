import { create } from "zustand";
import type {
  ResumeData,
  SectionId,
  TemplateConfig,
  PersonalInfo,
  WorkExperience,
  Education,
  Skill,
  Certification,
  Language,
  Project,
  Award,
  Reference,
  CustomSection,
} from "@/types/resume";
import { DEFAULT_SECTION_ORDER } from "@/types/resume";

const MAX_HISTORY = 50;

interface HistoryState {
  past: ResumeData[];
  future: ResumeData[];
}

interface ResumeStore {
  // Data
  resume: ResumeData | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;

  // History
  history: HistoryState;
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  loadResume: (id: string) => Promise<void>;
  setResume: (resume: ResumeData) => void;

  // Field updates
  updateField: (section: SectionId, data: unknown) => void;
  updatePersonalInfo: (field: keyof PersonalInfo, value: string) => void;
  updateSummary: (value: string) => void;
  updateTitle: (title: string) => void;

  // Array section actions
  addItem: (section: SectionId, item: unknown) => void;
  updateItem: (section: SectionId, index: number, data: unknown) => void;
  removeItem: (section: SectionId, index: number) => void;
  duplicateItem: (section: SectionId, index: number) => void;
  duplicateSection: (section: SectionId) => void;
  reorderItems: (section: SectionId, oldIndex: number, newIndex: number) => void;

  // Section management
  updateSectionOrder: (newOrder: string[]) => void;
  toggleSectionVisibility: (sectionId: string) => void;

  // Cloned section cards (standalone cards created from section duplication)
  removeCustomCard: (customId: string) => void;
  updateClonedTitle: (clonedId: string, title: string) => void;
  addClonedItem: (clonedId: string, item: unknown) => void;
  updateClonedItem: (clonedId: string, index: number, data: unknown) => void;
  removeClonedItem: (clonedId: string, index: number) => void;
  duplicateClonedItem: (clonedId: string, index: number) => void;

  // Template
  setTemplateId: (templateId: string) => void;
  updateTemplateConfig: (config: Partial<TemplateConfig>) => void;

  // Persistence
  save: () => Promise<void>;

  // History
  undo: () => void;
  redo: () => void;
}

function pushHistory(state: HistoryState, current: ResumeData): HistoryState {
  const past = [...state.past, current].slice(-MAX_HISTORY);
  return { past, future: [] };
}

function isArraySection(section: SectionId): boolean {
  return [
    "workExperience",
    "education",
    "skills",
    "certifications",
    "languages",
    "projects",
    "awards",
    "references",
    "customSections",
  ].includes(section);
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  resume: null,
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  history: { past: [], future: [] },
  canUndo: false,
  canRedo: false,

  loadResume: async (id: string) => {
    try {
      const res = await fetch(`/api/resumes/${id}`);
      if (!res.ok) throw new Error("Failed to fetch resume");
      const data = await res.json();
      set({
        resume: data.resume,
        isDirty: false,
        history: { past: [], future: [] },
        canUndo: false,
        canRedo: false,
      });
    } catch (error) {
      console.error("Failed to load resume:", error);
      throw error;
    }
  },

  setResume: (resume: ResumeData) => {
    set({ resume, isDirty: false });
  },

  updateField: (section: SectionId, data: unknown) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    set({
      resume: { ...resume, [section]: data },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  updatePersonalInfo: (field: keyof PersonalInfo, value: string) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    const currentInfo = resume.personalInfo || {
      name: "",
      email: "",
      phone: "",
      address: "",
      linkedin: "",
      website: "",
      photoUrl: "",
    };

    set({
      resume: {
        ...resume,
        personalInfo: { ...currentInfo, [field]: value },
      },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  updateSummary: (value: string) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    set({
      resume: { ...resume, summary: value },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  updateTitle: (title: string) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    set({
      resume: { ...resume, title },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  addItem: (section: SectionId, item: unknown) => {
    const { resume, history } = get();
    if (!resume || !isArraySection(section)) return;

    const newHistory = pushHistory(history, resume);
    const currentArray = (resume[section] as unknown[]) || [];

    set({
      resume: { ...resume, [section]: [...currentArray, item] },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  updateItem: (section: SectionId, index: number, data: unknown) => {
    const { resume, history } = get();
    if (!resume || !isArraySection(section)) return;

    const newHistory = pushHistory(history, resume);
    const currentArray = [...((resume[section] as unknown[]) || [])];
    currentArray[index] = data;

    set({
      resume: { ...resume, [section]: currentArray },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  removeItem: (section: SectionId, index: number) => {
    const { resume, history } = get();
    if (!resume || !isArraySection(section)) return;

    const newHistory = pushHistory(history, resume);
    const currentArray = [...((resume[section] as unknown[]) || [])];
    currentArray.splice(index, 1);

    set({
      resume: { ...resume, [section]: currentArray },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  duplicateItem: (section: SectionId, index: number) => {
    const { resume, history } = get();
    if (!resume || !isArraySection(section)) return;

    const newHistory = pushHistory(history, resume);
    const currentArray = [...((resume[section] as unknown[]) || [])];
    const original = currentArray[index];
    if (!original) return;

    // Deep-clone the item and assign a new id
    const clone = JSON.parse(JSON.stringify(original));
    if (clone.id) clone.id = Math.random().toString(36).slice(2, 11);

    // Insert the clone right after the original
    currentArray.splice(index + 1, 0, clone);

    set({
      resume: { ...resume, [section]: currentArray },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  duplicateSection: (section: SectionId) => {
    const { resume, history } = get();
    if (!resume || !isArraySection(section)) return;
    if (section === "customSections") return; // can't clone the custom sections group

    const currentArray = (resume[section] as unknown[]) || [];
    if (currentArray.length === 0) return;

    const newHistory = pushHistory(history, resume);

    const SECTION_LABELS: Record<string, string> = {
      workExperience: "Work Experience",
      education: "Education",
      skills: "Skills",
      certifications: "Certifications",
      languages: "Languages",
      projects: "Projects",
      awards: "Awards",
      references: "References",
    };

    // Deep-clone all items and assign new ids
    const clonedItems = currentArray.map((item) => {
      const clone = JSON.parse(JSON.stringify(item));
      if (clone.id) clone.id = Math.random().toString(36).slice(2, 11);
      return clone;
    });

    const newId = Math.random().toString(36).slice(2, 11);
    const newCustomSection: CustomSection = {
      id: newId,
      title: `${SECTION_LABELS[section] || section} (Copy)`,
      content: "",
      basedOn: section,
      items: clonedItems,
    };

    // Insert "custom:<id>" into sectionOrder right after the original section
    const newOrder = [...resume.sectionOrder];
    const idx = newOrder.indexOf(section);
    if (idx !== -1) {
      newOrder.splice(idx + 1, 0, `custom:${newId}`);
    } else {
      newOrder.push(`custom:${newId}`);
    }

    set({
      resume: {
        ...resume,
        customSections: [...resume.customSections, newCustomSection],
        sectionOrder: newOrder,
      },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  reorderItems: (section: SectionId, oldIndex: number, newIndex: number) => {
    const { resume, history } = get();
    if (!resume || !isArraySection(section)) return;

    const newHistory = pushHistory(history, resume);
    const currentArray = [...((resume[section] as unknown[]) || [])];
    const [item] = currentArray.splice(oldIndex, 1);
    currentArray.splice(newIndex, 0, item);

    set({
      resume: { ...resume, [section]: currentArray },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  updateSectionOrder: (newOrder: string[]) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    set({
      resume: { ...resume, sectionOrder: newOrder },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  toggleSectionVisibility: (sectionId: string) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    const hidden = resume.hiddenSections || [];
    const newHidden = hidden.includes(sectionId)
      ? hidden.filter((s) => s !== sectionId)
      : [...hidden, sectionId];

    set({
      resume: { ...resume, hiddenSections: newHidden },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  updateClonedTitle: (clonedId: string, title: string) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    const newCustomSections = resume.customSections.map((cs) =>
      cs.id === clonedId ? { ...cs, title } : cs
    );

    set({
      resume: { ...resume, customSections: newCustomSections },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  addClonedItem: (clonedId: string, item: unknown) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    const newCustomSections = resume.customSections.map((cs) => {
      if (cs.id !== clonedId) return cs;
      return { ...cs, items: [...(cs.items || []), item] };
    });

    set({
      resume: { ...resume, customSections: newCustomSections },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  updateClonedItem: (clonedId: string, index: number, data: unknown) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    const newCustomSections = resume.customSections.map((cs) => {
      if (cs.id !== clonedId) return cs;
      const newItems = [...(cs.items || [])];
      newItems[index] = data;
      return { ...cs, items: newItems };
    });

    set({
      resume: { ...resume, customSections: newCustomSections },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  removeClonedItem: (clonedId: string, index: number) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    const newCustomSections = resume.customSections.map((cs) => {
      if (cs.id !== clonedId) return cs;
      const newItems = [...(cs.items || [])];
      newItems.splice(index, 1);
      return { ...cs, items: newItems };
    });

    set({
      resume: { ...resume, customSections: newCustomSections },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  duplicateClonedItem: (clonedId: string, index: number) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    const newCustomSections = resume.customSections.map((cs) => {
      if (cs.id !== clonedId) return cs;
      const newItems = [...(cs.items || [])];
      const original = newItems[index];
      if (!original) return cs;
      const clone = JSON.parse(JSON.stringify(original));
      if (typeof clone === "object" && clone !== null && "id" in clone) {
        (clone as Record<string, unknown>).id = Math.random().toString(36).slice(2, 11);
      }
      newItems.splice(index + 1, 0, clone);
      return { ...cs, items: newItems };
    });

    set({
      resume: { ...resume, customSections: newCustomSections },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  removeCustomCard: (customId: string) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    const sectionOrderKey = `custom:${customId}`;

    set({
      resume: {
        ...resume,
        customSections: resume.customSections.filter((cs) => cs.id !== customId),
        sectionOrder: resume.sectionOrder.filter((s) => s !== sectionOrderKey),
        hiddenSections: resume.hiddenSections.filter((s) => s !== sectionOrderKey),
      },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  setTemplateId: (templateId: string) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    set({
      resume: { ...resume, templateId },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  updateTemplateConfig: (config: Partial<TemplateConfig>) => {
    const { resume, history } = get();
    if (!resume) return;

    const newHistory = pushHistory(history, resume);
    const currentConfig = resume.templateConfig || {
      primaryColor: "#1b2230",
      accentColor: "#a3585c",
      fontFamily: "source-sans-3",
      headerFontFamily: "merriweather",
      fontSize: "medium",
      lineSpacing: "normal",
    };

    set({
      resume: {
        ...resume,
        templateConfig: { ...currentConfig, ...config },
      },
      isDirty: true,
      history: newHistory,
      canUndo: newHistory.past.length > 0,
      canRedo: false,
    });
  },

  save: async () => {
    const { resume } = get();
    if (!resume) return;

    set({ isSaving: true });
    try {
      const res = await fetch(`/api/resumes/${resume.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume),
      });

      if (!res.ok) throw new Error("Failed to save");

      set({ isDirty: false, isSaving: false, lastSaved: new Date() });
    } catch (error) {
      set({ isSaving: false });
      console.error("Save failed:", error);
      throw error;
    }
  },

  undo: () => {
    const { resume, history } = get();
    if (!resume || history.past.length === 0) return;

    const newPast = [...history.past];
    const previous = newPast.pop()!;
    const newFuture = [resume, ...history.future];

    set({
      resume: previous,
      isDirty: true,
      history: { past: newPast, future: newFuture },
      canUndo: newPast.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { resume, history } = get();
    if (!resume || history.future.length === 0) return;

    const newFuture = [...history.future];
    const next = newFuture.shift()!;
    const newPast = [...history.past, resume];

    set({
      resume: next,
      isDirty: true,
      history: { past: newPast, future: newFuture },
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
  },
}));
