"use client";

import { useState } from "react";
import clsx from "clsx";

import { AuthForm } from "@/components/auth-form";
import { RegisterForm } from "@/components/register-form";

const tabs = [
  { key: "login", label: "Sign in" },
  { key: "register", label: "Create account" },
];

export function AuthSwitcher() {
  const [mode, setMode] = useState<typeof tabs[number]["key"]>("login");

  return (
    <div className="rounded-2xl border border-white/10 bg-surface/80 p-6 shadow-xl shadow-black/30 backdrop-blur">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMode(tab.key)}
            className={clsx(
              "flex-1 rounded-full px-4 py-2 text-sm font-medium transition",
              mode === tab.key
                ? "bg-white/90 text-slate-900 shadow"
                : "text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {mode === "login" ? (
          <AuthForm className="mt-0" />
        ) : (
          <RegisterForm className="mt-0" />
        )}
      </div>
    </div>
  );
}
