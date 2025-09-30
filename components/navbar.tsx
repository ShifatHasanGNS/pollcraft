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
        {/* <nav className="relative w-full max-w-6xl overflow-hidden bg-[rgba(11,22,33,0.85)] px-4 py-3 shadow-[0_18px_45px_-20px_rgba(13,23,42,0.75)] backdrop-blur-md rounded-[1.5rem] border border-white/8"> */}
        <div className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(120%_140%_at_top,white,transparent)]">
          <div className="absolute inset-0 bg-[radial-gradient(320px_at_top,rgba(56,189,248,0.22),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(360px_at_bottom,rgba(16,185,129,0.18),transparent)]" />
        </div>

        <div className="relative flex flex-col gap-2">
          <div className="flex items-center justify-between gap-5">
            <Link
              href="/"
              className="text-lg font-semibold uppercase tracking-[0.369em] text-white drop-shadow-[0_2px_12px_rgba(56,189,248,0.4)]"
            >
              Poll Craft
            </Link>

            <div className="hidden flex-1 items-center justify-center gap-2 md:flex">
              <div className="flex flex-col items-center gap-2">
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
