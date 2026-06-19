import { headers } from "next/headers";
import { notFound } from "next/navigation";

// Public, read-only résumé view. No auth — access is the token itself.
// Renders a slim header + the live PDF (so it always reflects the latest
// version) with PDF / DOCX download actions for third parties.

interface PublicResume {
  resume: {
    title?: string;
    personalInfo?: {
      name?: string;
      title?: string;
      role?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
    updatedAt?: string;
  };
}

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export default async function PublicResumePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const origin = await getOrigin();
  const base = `${origin}/api/public/resume/${token}`;

  let data: PublicResume | null = null;
  try {
    const res = await fetch(base, { cache: "no-store" });
    if (res.ok) data = await res.json();
  } catch {
    data = null;
  }
  if (!data) notFound();

  const info = data.resume.personalInfo || {};
  const name = info.name || data.resume.title || "Résumé";
  const role = info.title || info.role || "";

  return (
    <div className="min-h-screen bg-[#e7eaef]" style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      {/* slim header */}
      <header className="flex flex-wrap items-center gap-3 border-b border-[rgba(27,34,48,0.12)] bg-[#edeff2] px-7 py-4">
        <div>
          <div className="text-[18px] tracking-[-0.01em] text-[#1b2230]" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
            {name}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-[#8990a0]">
            {role ? `${role} · ` : ""}Résumé · shared via CV Builder
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`${base}/pdf?download=1`}
            className="rounded-full border border-[rgba(27,34,48,0.2)] px-4 py-2 text-[13px] text-[#1b2230] transition-colors hover:bg-[#1b2230] hover:text-[#edeff2]"
          >
            Download PDF
          </a>
          <a
            href={`${base}/docx`}
            className="rounded-full border border-[rgba(27,34,48,0.2)] px-4 py-2 text-[13px] text-[#1b2230] transition-colors hover:bg-[#1b2230] hover:text-[#edeff2]"
          >
            DOCX
          </a>
        </div>
      </header>

      {/* live PDF */}
      <main className="flex justify-center bg-[#dfe3e9] p-4 sm:p-8">
        <div className="w-full max-w-[860px]">
          <iframe
            title={`${name} — résumé`}
            src={`${base}/pdf`}
            className="h-[78vh] min-h-[600px] w-full border-0 bg-white shadow-[0_12px_40px_rgba(15,19,28,0.16)]"
          />
        </div>
      </main>

      {/* footer */}
      <footer className="border-t border-[rgba(27,34,48,0.1)] py-4 text-center font-mono text-[10px] tracking-[0.08em] text-[#8990a0]">
        Read-only · built with CV Builder
      </footer>
    </div>
  );
}
