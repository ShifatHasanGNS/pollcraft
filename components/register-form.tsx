"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { buttonPrimary } from "@/lib/styles";

const Schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof Schema>;

type Props = {
  className?: string;
};

export function RegisterForm({ className }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
  });
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(values: FormValues) {
    setError(null);
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Unable to create account");
      return;
    }

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Sign in failed. Please try logging in manually.");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={clsx("flex flex-col gap-4", className)}
    >
      <label className="flex flex-col gap-2 text-sm">
        <span>Name</span>
        <input
          type="text"
          className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
          placeholder="Jane Doe"
          {...register("name")}
        />
        {errors.name && (
          <span className="text-xs text-red-400">{errors.name.message}</span>
        )}
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span>Email</span>
        <input
          type="email"
          className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
          placeholder="you@example.com"
          {...register("email")}
        />
        {errors.email && (
          <span className="text-xs text-red-400">{errors.email.message}</span>
        )}
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span>Password</span>
        <input
          type="password"
          className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <span className="text-xs text-red-400">{errors.password.message}</span>
        )}
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        className={`${buttonPrimary} mt-2 px-8`}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
