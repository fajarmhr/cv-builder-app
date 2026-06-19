import type { ResumeData, TemplateConfig } from "@/types/resume";

/** Résumé output palette aligned with the app theme (navy ink / clay accent). */
export const SAMPLE_CONFIG: TemplateConfig = {
  primaryColor: "#1b2230",
  accentColor: "#a3585c",
  fontFamily: "source-sans-3",
  headerFontFamily: "merriweather",
  fontSize: "medium",
  lineSpacing: "normal",
};

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.";

/**
 * Placeholder résumé shown to logged-out visitors browsing templates.
 * Uses "John Doe" + lorem ipsum so no real data is ever exposed publicly.
 */
export const SAMPLE_RESUME: ResumeData = {
  id: "preview",
  title: "Preview",
  templateId: "ats-001",
  templateConfig: SAMPLE_CONFIG,
  uploadedFile: null,
  personalInfo: {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 010-2030",
    address: "London, United Kingdom",
    linkedin: "linkedin.com/in/johndoe",
    website: "johndoe.com",
    photoUrl: "",
  },
  summary:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Experienced professional with a track record of delivering results across international teams. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  workExperience: [
    {
      id: "w1",
      company: "Acme International",
      positions: [
        {
          id: "w1p1",
          title: "Senior Specialist",
          startDate: "2021-03",
          endDate: "",
          isCurrent: true,
          description: "",
          bullets: [
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, leading cross-functional delivery.",
            "Sed do eiusmod tempor incididunt — improved key metric by 40% year over year.",
          ],
        },
      ],
    },
    {
      id: "w2",
      company: "Globex Ltd.",
      positions: [
        {
          id: "w2p1",
          title: "Specialist",
          startDate: "2018-06",
          endDate: "2021-02",
          isCurrent: false,
          description: "",
          bullets: [
            "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.",
            "Duis aute irure dolor in reprehenderit — reduced cycle time by 60%.",
          ],
        },
      ],
    },
  ],
  education: [
    {
      id: "e1",
      institution: "University of Example",
      degree: "Bachelor of Science",
      fieldOfStudy: "Business Administration",
      startDate: "2014-09",
      endDate: "2018-05",
      gpa: "3.8",
    },
  ],
  skills: [
    { id: "s1", name: "Leadership", level: "expert" },
    { id: "s2", name: "Project Management", level: "expert" },
    { id: "s3", name: "Data Analysis", level: "advanced" },
    { id: "s4", name: "Communication", level: "advanced" },
    { id: "s5", name: "Strategy", level: "intermediate" },
    { id: "s6", name: "Stakeholder Management", level: "intermediate" },
  ],
  certifications: [
    { id: "c1", name: "Certified Professional", issuer: "Example Institute", date: "2022-01", credentialId: "" },
  ],
  languages: [
    { id: "l1", language: "English", proficiency: "Native" },
    { id: "l2", language: "French", proficiency: "Professional" },
  ],
  projects: [
    {
      id: "p1",
      name: "Lorem Project",
      description: LOREM,
      url: "",
      technologies: ["Excel", "Tableau", "SQL"],
      startDate: "2022-01",
      endDate: "2022-08",
    },
  ],
  awards: [],
  references: [],
  customSections: [],
  sectionOrder: [
    "personalInfo",
    "summary",
    "workExperience",
    "education",
    "skills",
    "projects",
    "languages",
  ],
  hiddenSections: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
