import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AuthSwitcher } from "@/components/auth-switcher";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <section className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Welcome to PollCraft</h1>
        <p className="text-sm text-muted">
          Sign in if you already have an account or create one in the same place—no extra steps needed.
        </p>
      </section>
      <AuthSwitcher />
    </main>
  );
}
