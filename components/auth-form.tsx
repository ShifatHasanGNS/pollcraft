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
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof Schema>;

type Props = {
  className?: string;
};

export function AuthForm({ className }: Props) {
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
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (result?.error) {
      setError("Invalid credentials");
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
          <span className="text-xs text-red-400">
            Password must be at least 8 characters.
          </span>
        )}
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        className={`${buttonPrimary} mt-2 px-8`}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
