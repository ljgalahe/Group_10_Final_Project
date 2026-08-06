import Link from "next/link";
import { ProspectInquiryForm } from "@/app/inquiries/ProspectInquiryForm";
import { ensureDemoSession } from "@/lib/auth-access";

export default async function QuotePage() {
  await ensureDemoSession("inquiries");

  return (
    <div className="welcome-root relative min-h-screen overflow-hidden text-[#1c2a22]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="welcome-kenburns absolute inset-[-6%] bg-cover bg-center"
          style={{
            backgroundImage:
              "url(/welcome/hero-poster.png?v=8), url(/welcome/poster.jpg)",
          }}
        />
        <div className="absolute inset-0 bg-[#eef2ee]/90" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#f4f6f3]/75 via-transparent to-[#e2e8e2]/92" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#3d5346]"
          >
            ← GreenScape
          </Link>
          <Link
            href="/"
            className="text-xs text-[#3d5346] underline-offset-4 hover:underline"
          >
            Back to welcome
          </Link>
        </div>

        <div className="mt-10 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#1c2a22] sm:text-5xl">
            Grounds that match the mission.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-[#3d5346] sm:text-lg">
            From historic hotels to research campuses—share the property.
            We&apos;ll send the plan.
          </p>
        </div>

        <div className="mt-8 flex-1 pb-10">
          <ProspectInquiryForm variant="welcome" />
        </div>
      </div>
    </div>
  );
}
