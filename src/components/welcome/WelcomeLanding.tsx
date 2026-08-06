"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { enterDemoWithRole } from "@/app/actions/auth";
import { COMMERCIAL_SERVICES } from "@/lib/commercial-services";
import { DEMO_ROLES, type UserRole } from "@/lib/types";

const SERVICES = COMMERCIAL_SERVICES;

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

export function WelcomeLanding() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [role, setRole] = useState<UserRole>("manager");
  const [slide, setSlide] = useState(0);

  const roleLabel = useMemo(
    () => DEMO_ROLES.find((item) => item.role === role)?.label ?? "Manager",
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
      const img = new Image();
      img.src = item.src;
    }
  }, []);

  return (
    <div className="welcome-root relative min-h-screen overflow-hidden text-[#faf6f2]">
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
        <div className="absolute inset-0 bg-gradient-to-b from-[#4a2c2a]/35 via-[#2a1f1c]/45 to-[#1a1412]/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(26,20,18,0.35)_70%,rgba(26,20,18,0.75)_100%)]" />
        <div className="welcome-grain absolute inset-0 opacity-[0.22] mix-blend-soft-light" />
        <div className="welcome-breeze absolute inset-0 opacity-30" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <main className="flex flex-1 flex-col items-center justify-center px-5 pb-6 pt-4 text-center">
          <h1 className="font-display text-5xl font-semibold tracking-tight text-[#fff8f4] sm:text-6xl md:text-7xl">
            GreenScape
          </h1>
          <p className="mt-4 max-w-md font-display text-lg italic leading-relaxed text-[#f3ddd6] sm:text-xl">
            Commercial grounds, elevated.
          </p>
          <p
            key={SLIDES[slide].label}
            className="mt-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#e8dfd0]/90"
          >
            {SLIDES[slide].label}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {SLIDES.map((item, index) => (
              <button
                key={item.src}
                type="button"
                aria-label={`Show ${item.label}`}
                aria-current={index === slide}
                onClick={() => setSlide(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === slide
                    ? "w-6 bg-[#fff8f4]"
                    : "w-1.5 bg-white/35 hover:bg-white/55"
                }`}
              />
            ))}
          </div>
        </main>

        <footer className="border-t border-[#e8dfd0]/70 bg-[#faf6f1]/92 px-5 py-6 backdrop-blur-md sm:px-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left">
                <p className="font-display text-lg text-[#3a4a3c]">
                  Let&apos;s get started!
                </p>
                <p className="mt-1 text-sm text-[#5f6f62]">
                  Review services or request a commercial quote.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setServicesOpen((open) => !open)}
                  className="inline-flex h-11 min-w-[10.5rem] items-center justify-center rounded-full border border-[#c9d2c6] bg-white/80 px-5 font-sans text-sm font-medium text-[#3a4a3c] shadow-sm transition hover:border-[#9aab98] hover:bg-white"
                  aria-expanded={servicesOpen}
                >
                  {servicesOpen ? "Hide services" : "Services offered"}
                </button>
                <Link
                  href="/quote"
                  className="inline-flex h-11 min-w-[10.5rem] items-center justify-center rounded-full border border-[#2f4a38]/20 bg-[#2f4a38] px-5 font-sans text-sm font-medium text-[#faf8f4] shadow-sm transition hover:bg-[#3d5c47]"
                >
                  Request a quote
                </Link>
              </div>
            </div>

            {servicesOpen ? (
              <section
                className="rounded-2xl border border-[#e0e6de] bg-white/85 px-5 py-5 text-left shadow-sm sm:px-6"
                aria-label="Services offered"
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#6d7f70]">
                  Featured commercial services
                </p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {SERVICES.map((service) => (
                    <li key={service.title}>
                      <p className="font-display text-lg text-[#2f3f32]">
                        {service.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-[#5f6f62]">
                        {service.blurb}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-[#e0e6de] pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="text-left">
                <p className="font-display text-lg text-[#3a4a3c]">
                  Choose your view
                </p>
                <p className="mt-1 text-sm text-[#5f6f62]">
                  Step in as {roleLabel.toLowerCase()}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="welcome-role">
                  Demo role
                </label>
                <form
                  action={enterDemoWithRole}
                  className="flex flex-wrap items-center gap-2"
                >
                  <select
                    id="welcome-role"
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="inline-flex h-11 min-w-[10.5rem] items-center justify-center rounded-full border border-[#c9d2c6] bg-white px-5 font-sans text-sm font-medium text-[#3a4a3c] outline-none focus:border-[#2f4a38]"
                  >
                    {DEMO_ROLES.map((item) => (
                      <option key={item.role} value={item.role}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex h-11 min-w-[10.5rem] items-center justify-center rounded-full border border-[#2f4a38]/15 bg-[#e8efe6] px-5 font-sans text-sm font-medium text-[#2f4a38] transition hover:bg-[#dce6d9]"
                  >
                    Enter
                  </button>
                </form>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
