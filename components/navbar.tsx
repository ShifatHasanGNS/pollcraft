"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { buttonPrimary, buttonSecondary } from "@/lib/styles";
import { LogoutButton } from "@/components/logout-button";
import type { SessionWithUser } from "@/lib/auth";

type NavbarProps = {
  initialSession: SessionWithUser;
};

export function Navbar({ initialSession }: NavbarProps) {
  const { data } = useSession();
  const pathname = usePathname();
  const session = data ?? initialSession;
  const isAuthenticated = Boolean(session?.user);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "Polls", href: "/polls" },
    ...(isAuthenticated ? [{ label: "Dashboard", href: "/dashboard" }] : []),
  ];
  const toggleMobile = () => setMobileOpen((prev) => !prev);
  const closeMobile = () => setMobileOpen(false);
  return (
    <header className="sticky top-0 z-10 flex w-full justify-center px-3 sm:px-6">
      <nav className="relative w-full max-w-6xl overflow-hidden px-4 py-3 shadow-[0_18px_45px_-20px_rgba(13,23,42,0.75)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(120%_140%_at_top,white,transparent)]">
          <div className="absolute inset-0 bg-[radial-gradient(320px_at_top,rgba(56,189,248,0.22),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(360px_at_bottom,rgba(16,185,129,0.18),transparent)]" />
        </div>

        <div className="relative flex flex-col gap-2">
          <div className="flex items-center justify-between gap-5">

            <Link
              href="/"
              className="flex gap-2 items-center text-lg font-semibold uppercase tracking-[0.369em] text-white drop-shadow-[0_2px_12px_rgba(56,189,248,0.4)]"
            >

              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 128 128">
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#6A5AE0" />
                    <stop offset="1" stopColor="#20C997" />
                  </linearGradient>
                  <path id="bubble" d="M20 12h68a16 16 0 0 1 16 16v44a16 16 0 0 1-16 16H63l-14.8 13.5a6.5 6.5 0 0 1-10.9-5V88H20A16 16 0 0 1 4 72V28A16 16 0 0 1 20 12Z" />
                </defs>
                <g transform="translate(10 7)">
                  <use href="#bubble" fill="none" stroke="url(#g)" strokeWidth="5" />
                  <g transform="translate(28 32)">
                    <rect x="4" y="26" width="10" height="26" rx="3" fill="url(#g)" />
                    <rect x="20" y="14" width="10" height="38" rx="3" fill="url(#g)" />
                    <rect x="36" y="32" width="10" height="20" rx="3" fill="url(#g)" />
                  </g>
                  <path d="M64 74l8 8 19-20" fill="none" stroke="#20C997" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  <use href="#bubble" fill="none" stroke="#ffffff" opacity="0.06" />
                </g>
              </svg>

              Poll-Craft

            </Link>

            <div className="hidden flex-1 items-center justify-center gap-2 md:flex">
              <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
                {navLinks.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-full px-4 py-2 text-lg font-medium transition-colors ${isActive
                        ? "bg-white/15 text-white shadow-[0_8px_18px_rgba(148,163,184,0.22)]"
                        : "text-slate-200/80 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 md:flex">
                {isAuthenticated ? (
                  <LogoutButton />
                ) : (
                  <>
                    <Link href="/login" className={`${buttonSecondary} h-9 px-4`}>
                      Login
                    </Link>
                    <Link href="/register" className={`${buttonPrimary} h-9 px-4`}>
                      Sign up
                    </Link>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={toggleMobile}
                aria-label="Toggle navigation"
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 text-white transition hover:border-white/35 hover:bg-black/35"
              >
                <span className="sr-only">Toggle menu</span>
                <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  {mobileOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <>
                      <path d="M4 7h16" />
                      <path d="M4 12h16" />
                      <path d="M4 17h16" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {navLinks.length > 0 && (
            <div
              className={`md:hidden ${mobileOpen ? "mt-3 opacity-100" : "pointer-events-none max-h-0 opacity-0"} transition-all duration-200`}
            >
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 shadow shadow-black/40 backdrop-blur">
                {navLinks.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className={`w-full rounded-full px-3 py-2 text-center text-sm font-medium transition-colors ${isActive
                        ? "bg-white/20 text-white shadow-[0_6px_14px_rgba(148,163,184,0.22)]"
                        : "text-slate-200/90 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="mt-1 flex flex-col gap-2">
                  {isAuthenticated ? (
                    <LogoutButton onAfterLogout={closeMobile} className="w-full justify-center" />
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={closeMobile}
                        className={`${buttonSecondary} w-full justify-center px-4 py-2`}
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        onClick={closeMobile}
                        className={`${buttonPrimary} w-full justify-center px-4 py-2`}
                      >
                        Sign up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
