"use client";

import { useState } from "react";
import clsx from "clsx";

type ShareMode = "vote" | "details" | "statistics";

function getShareUrl(path: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const envUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  return envUrl ? `${envUrl.replace(/\/$/, "")}${path}` : path;
}

function resolvePath(pollId: string, mode: ShareMode): string {
  switch (mode) {
    case "details":
      return `/polls/${pollId}/details`;
    case "statistics":
      return `/polls/${pollId}/statistics`;
    case "vote":
    default:
      return `/polls/${pollId}`;
  }
}

const defaultLabels: Record<ShareMode, string> = {
  vote: "Copy voting link",
  details: "Copy details link",
  statistics: "Copy statistics link",
};

type SharePollButtonProps = {
  pollId: string;
  mode?: ShareMode;
  label?: string;
  className?: string;
};

export function SharePollButton({ pollId, mode = "vote", label, className }: SharePollButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = getShareUrl(resolvePath(pollId, mode));
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      console.error("Failed to copy poll link", error);
    }
  }

  const displayLabel = copied ? "Link copied" : label ?? defaultLabels[mode];

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={displayLabel}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12v7a1 1 0 0 0 1 1h7" />
        <path d="M20 12V5a1 1 0 0 0-1-1h-7" />
        <path d="M16 8l-8 8" />
      </svg>
      {displayLabel}
    </button>
  );
}
