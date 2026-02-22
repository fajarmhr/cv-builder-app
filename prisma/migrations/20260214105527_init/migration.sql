-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Untitled Resume',
    "templateId" TEXT NOT NULL DEFAULT 'prime-ats',
    "templateConfig" TEXT,
    "personalInfo" TEXT,
    "summary" TEXT,
    "workExperience" TEXT,
    "education" TEXT,
    "skills" TEXT,
    "certifications" TEXT,
    "languages" TEXT,
    "projects" TEXT,
    "awards" TEXT,
    "references" TEXT,
    "customSections" TEXT,
    "sectionOrder" TEXT,
    "hiddenSections" TEXT,
    "uploadedFile" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
