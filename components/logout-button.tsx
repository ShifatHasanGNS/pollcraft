"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";

import { buttonSecondary } from "@/lib/styles";

type LogoutButtonProps = {
  className?: string;
  onAfterLogout?: () => void;
};

export function LogoutButton({ className, onAfterLogout }: LogoutButtonProps = {}) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () =>
    startTransition(async () => {
      await signOut({ callbackUrl: "/" });
      onAfterLogout?.();
    });

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`${buttonSecondary} h-10 px-5 ${className ?? ""}`.trim()}
      disabled={isPending}
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
