import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6 py-16">
      <section className="rounded-2xl border border-white/10 bg-surface/60 p-8 shadow-xl shadow-black/40 backdrop-blur">
        <h1 className="text-2xl font-semibold">Create your PollCraft account</h1>
        <p className="mt-2 text-sm text-muted">
          Sign up to create polls, invite voters, and share results.
        </p>
        <RegisterForm className="mt-6" />
      </section>
      <p className="text-center text-sm text-muted">
        Already have an account? <Link className="underline" href="/login">Sign in</Link>
      </p>
    </main>
  );
}
