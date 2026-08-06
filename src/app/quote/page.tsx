import Link from "next/link";
import { ProspectInquiryForm } from "@/app/inquiries/ProspectInquiryForm";

export default function QuotePage() {
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
        <div className="absolute inset-0 bg-[#eef2ee]/92" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#f7f9f6]/80 via-transparent to-[#e4ebe4]/95" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-7 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-[#3d5346] transition hover:text-[#1c2a22]"
        >
          <span aria-hidden>←</span> GreenScape
        </Link>

        <header className="mt-8 text-center sm:mt-10">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#5a6e60]">
            Quote request
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#1c2a22] sm:text-[2.75rem] sm:leading-tight">
            Grounds that match the mission.
          </h1>
          <p className="mx-auto mt-3 max-w-sm font-display text-base italic leading-relaxed text-[#3d5346] sm:text-lg">
            Share the property — we&apos;ll send the plan.
          </p>
        </header>

        <div className="mt-8 flex-1 pb-8 sm:mt-9">
          <ProspectInquiryForm variant="welcome" />
        </div>
      </div>
    </div>
  );
}
