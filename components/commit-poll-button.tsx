"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonPrimary } from "@/lib/styles";

interface CommitPollButtonProps {
  pollId: string;
  disabled?: boolean;
}

export function CommitPollButton({ pollId, disabled }: CommitPollButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCommit() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/polls/${pollId}/commit`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "Unable to commit poll");
        return;
      }
      router.refresh();
    });
  }

  const isDisabled = disabled || isPending;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCommit}
        disabled={isDisabled}
        className={`${buttonPrimary} h-10 px-5`}
      >
        {isPending ? "Committing…" : "Commit poll"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
