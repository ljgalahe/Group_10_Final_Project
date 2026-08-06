"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { enterDemoWithRole } from "@/app/actions/auth";
import { ViewRoleSelect } from "@/components/ViewRoleSelect";
import { COMMERCIAL_SERVICES } from "@/lib/commercial-services";
import { DEMO_ROLES, type UserRole } from "@/lib/types";

const SERVICES = COMMERCIAL_SERVICES.filter((s) => s.value !== "other");

const SLIDES = [
  {
    src: "/welcome/slide-hotel.png",
    label: "Boutique hotel",
  },
  {
    src: "/welcome/slide-science.png",
    label: "Science & research campus",
  },
  {
    src: "/welcome/slide-dentist.png?v=2",
    label: "Professional medical office",
  },
  {
    src: "/welcome/slide-library.png",
    label: "Public library",
  },
  {
    src: "/welcome/slide-retail.png",
    label: "Retail",
  },
  {
    src: "/welcome/slide-office.png",
    label: "Office park",
  },
  {
    src: "/welcome/slide-multifamily.png",
    label: "Residential community",
  },
] as const;

const SLIDE_MS = 5500;

const VIEW_ROLES = DEMO_ROLES.filter((r) => r.role !== "inquiries");

export function WelcomeLanding() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [role, setRole] = useState<UserRole>("manager");
  const [slide, setSlide] = useState(0);

  const roleLabel = useMemo(
    () => VIEW_ROLES.find((item) => item.role === role)?.label ?? "Manager",
    [role]
  );

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const id = window.setInterval(() => {
      setSlide((current) => (current + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    for (const item of SLIDES) {
      const img = new window.Image();
      img.src = item.src;
    }
  }, []);

  return (
    <div
      className="welcome-root relative h-dvh overflow-hidden text-[#faf8f4]"
      suppressHydrationWarning
    >
      {/* Full-screen photo — edge to edge */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {SLIDES.map((item, index) => (
          <div
            key={item.src}
            className={`welcome-kenburns absolute inset-[-8%] bg-cover bg-center transition-opacity duration-[1400ms] ease-in-out ${
              index === slide ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${item.src})` }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/20 to-black/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,rgba(20,16,14,0.45)_100%)]" />
        <div className="welcome-grain absolute inset-0 opacity-[0.18] mix-blend-soft-light" />
        <div className="welcome-breeze absolute inset-0 opacity-25" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <main
          className={`flex flex-col items-center justify-center px-6 text-center transition-[flex] duration-300 ${
            servicesOpen ? "flex-none pt-10 pb-4 sm:pt-12" : "flex-1"
          }`}
        >
          <h1
            className={`font-display font-semibold tracking-tight text-[#fff8f4] drop-shadow-sm transition-all duration-300 ${
              servicesOpen
                ? "text-3xl sm:text-4xl"
                : "text-5xl sm:text-6xl md:text-7xl"
            }`}
          >
            GreenScape
          </h1>
          {!servicesOpen ? (
            <>
              <p className="mt-4 max-w-md font-display text-lg italic leading-relaxed text-[#f0e4dc]/95 sm:text-xl">
                Commercial grounds, elevated.
              </p>
              <p
                key={SLIDES[slide].label}
                className="mt-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#e8dfd0]/80"
              >
                {SLIDES[slide].label}
              </p>

              <div className="mt-8 flex items-center justify-center gap-2.5">
                {SLIDES.map((item, index) => (
                  <button
                    key={item.src}
                    type="button"
                    aria-label={`Show ${item.label}`}
                    aria-current={index === slide ? "true" : undefined}
                    onClick={() => setSlide(index)}
                    className={`rounded-full transition-all duration-300 ${
                      index === slide
                        ? "h-1.5 w-7 bg-[#f5ebe3]/90 shadow-[0_0_12px_rgba(245,235,227,0.35)]"
                        : "h-1.5 w-1.5 bg-[#f5ebe3]/35 hover:bg-[#f5ebe3]/55"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </main>

        <div className="relative z-20 flex flex-col items-center gap-4 px-5 pb-8 pt-2 sm:pb-10">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setServicesOpen((open) => !open)}
              aria-expanded={servicesOpen}
              className="welcome-cta inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 text-[#faf8f4] shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:border-white/50 hover:bg-white/16"
            >
              {servicesOpen ? "Hide services" : "Services offered"}
            </button>
            <Link
              href="/quote"
              className="welcome-cta inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 text-[#faf8f4] shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:border-white/50 hover:bg-white/16"
            >
              Request a quote
            </Link>
          </div>

          {servicesOpen ? (
            <section
              className="welcome-sidebar-scroll w-full max-w-xl max-h-[min(52vh,28rem)] overflow-y-auto border border-[#c5d0c6]/80 bg-white/95 shadow-xl"
              aria-label="Services offered"
            >
              <div className="sticky top-0 z-10 border-b border-[#d5ddd6] bg-[#f6f8f6]/95 px-5 py-3 backdrop-blur-sm">
                <p className="font-display text-xl font-semibold text-[#1c2a22]">
                  Services offered
                </p>
                <p className="mt-0.5 text-sm text-[#3d5346]">
                  Commercial grounds care, from lawn to winter.
                </p>
              </div>
              <ul className="divide-y divide-[#e2e8e2]">
                {SERVICES.map((service) => (
                  <li
                    key={service.value}
                    className="flex items-center gap-4 px-4 py-3 sm:gap-5 sm:px-5"
                  >
                    {service.image ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden sm:h-[4.5rem] sm:w-[4.5rem]">
                        <Image
                          src={service.image}
                          alt=""
                          fill
                          sizes="72px"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-display text-lg leading-snug text-[#1c2a22] sm:text-xl">
                        {service.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-[#3d5346]">
                        {service.blurb}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <form
            action={enterDemoWithRole}
            className="relative flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-white/15 pt-5"
          >
            <label
              htmlFor="welcome-role"
              className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#e8dfd0]/70"
            >
              View as
            </label>
            <ViewRoleSelect
              id="welcome-role"
              value={role}
              options={VIEW_ROLES}
              onChange={setRole}
              variant="welcome"
            />
            <button
              type="submit"
              className="font-display text-base italic tracking-[0.03em] text-[#faf8f4] underline decoration-[#c4b7a0]/55 underline-offset-4 transition hover:decoration-[#c4b7a0]"
              suppressHydrationWarning
            >
              Enter as {roleLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
