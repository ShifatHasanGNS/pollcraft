"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";

import { buttonPrimary, card, subCard } from "@/lib/styles";

const PollSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["public", "listed"]),
  identityMode: z.enum(["anonymous", "identified"]),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
  listedEmails: z.string().optional(),
});

type PollFormValues = z.infer<typeof PollSchema>;

type DraftQuestion = {
  id: string;
  prompt: string;
  kind: "single" | "multi" | "ranked" | "text";
  options: string[];
};

type PollBuilderProps = {
  className?: string;
};

function createEmptyQuestion(): DraftQuestion {
  return {
    id: crypto.randomUUID(),
    prompt: "",
    kind: "single",
    options: ["", ""],
  };
}

export function PollBuilder({ className }: PollBuilderProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PollFormValues>({
    resolver: zodResolver(PollSchema),
    defaultValues: {
      visibility: "public",
      identityMode: "anonymous",
    },
  });
  const visibility = watch("visibility");

  const [questions, setQuestions] = useState<DraftQuestion[]>([createEmptyQuestion()]);
  const [error, setError] = useState<string | null>(null);

  function updateQuestion(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function updateOption(questionId: string, index: number, value: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, optIndex) => (optIndex === index ? value : opt)),
            }
          : q,
      ),
    );
  }

  function addOption(questionId: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, options: [...q.options, ""] } : q,
      ),
    );
  }

  function removeOption(questionId: string, index: number) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((_, optIndex) => optIndex !== index) }
          : q,
      ),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => (prev.length === 1 ? prev : prev.filter((q) => q.id !== id)));
  }

  async function onSubmit(values: PollFormValues) {
    setError(null);

    const trimmedQuestions = questions.map((question) => ({
      ...question,
      prompt: question.prompt.trim(),
      options: question.options.map((opt) => opt.trim()).filter((opt) => opt.length > 0),
    }));

    for (const question of trimmedQuestions) {
      if (!question.prompt) {
        setError("Every question needs a prompt.");
        return;
      }
      if (question.kind !== "text" && question.options.length < 2) {
        setError("Choice-based questions need at least two options.");
        return;
      }
    }

    const trimmedEmails =
      values.visibility === "listed"
        ? (values.listedEmails ?? "")
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter((email) => email.length > 0)
        : [];

    const payload = {
      title: values.title,
      description: values.description,
      visibility: values.visibility,
      identityMode: values.identityMode,
      opensAt: values.opensAt ? new Date(values.opensAt).toISOString() : undefined,
      closesAt: values.closesAt ? new Date(values.closesAt).toISOString() : undefined,
      listedEmails: trimmedEmails,
      questions: trimmedQuestions.map((question) => ({
        prompt: question.prompt,
        kind: question.kind,
        options: question.kind === "text"
          ? []
          : question.options.map((label) => ({ label })),
      })),
    };

    const response = await fetch("/api/polls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Unable to create poll");
      return;
    }

    const result = await response.json();
    router.replace(`/dashboard/polls/${result.id}`);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={clsx("flex flex-col gap-8", className)}
    >
      <section className={`${card} p-6`}>
        <h2 className="text-lg font-semibold">Poll details</h2>
        <div className="mt-4 grid gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span>Title</span>
            <input
              type="text"
              className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
              placeholder="Executive alignment survey"
              {...register("title")}
            />
            {errors.title && <span className="text-xs text-red-400">{errors.title.message}</span>}
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>Description</span>
            <textarea
              rows={3}
              className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
              placeholder="Add context so voters know what to expect"
              {...register("description")}
            />
            {errors.description && (
              <span className="text-xs text-red-400">{errors.description.message}</span>
            )}
          </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span>Visibility</span>
            <select
              className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
              {...register("visibility")}
            >
              <option value="public">Public</option>
              <option value="listed">Listed</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>Identity mode</span>
            <select
              className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
              {...register("identityMode")}
            >
              <option value="anonymous">Anonymous</option>
              <option value="identified">Identified</option>
            </select>
          </label>
        </div>
        {visibility === "listed" && (
          <label className="mt-4 flex flex-col gap-2 text-sm">
            <span>Listed voter emails</span>
            <textarea
              rows={3}
              placeholder="friend@example.com, teammate@example.com"
              className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
              {...register("listedEmails")}
            />
            <span className="text-xs text-muted">
              Add comma-separated emails. Only these registered users will see this poll in their dashboard and
              Polls page.
            </span>
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span>Opens at</span>
            <input
                type="datetime-local"
                className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
                {...register("opensAt")}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>Closes at</span>
              <input
                type="datetime-local"
                className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
                {...register("closesAt")}
              />
            </label>
          </div>
        </div>
      </section>

      <section className={`${card} p-6`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Questions</h2>
          <button
            type="button"
            onClick={addQuestion}
            className="text-sm text-foreground underline"
          >
            Add question
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-6">
          {questions.map((question, index) => (
            <article key={question.id} className={`${subCard} border-white/10 bg-black/25 p-5`}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-muted">Question {index + 1}</span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(question.id)}
                    className="text-xs text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              <label className="mt-3 flex flex-col gap-2 text-sm">
                <span>Prompt</span>
                <textarea
                  rows={2}
                  value={question.prompt}
                  onChange={(event) =>
                    updateQuestion(question.id, { prompt: event.target.value })
                  }
                  className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-foreground outline-none focus:border-white/40"
                  placeholder="How satisfied are you with our all-hands?"
                />
              </label>
              <label className="mt-3 flex flex-col gap-2 text-sm">
                <span>Question type</span>
              <select
                value={question.kind}
                onChange={(event) =>
                  updateQuestion(question.id, {
                    kind: event.target.value as DraftQuestion["kind"],
                    options:
                      event.target.value === "text" ? [] : question.options.length ? question.options : ["", ""],
                  })
                }
                className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-foreground outline-none focus:border-white/40"
              >
                  <option value="single">Single choice</option>
                  <option value="multi">Multi select</option>
                  <option value="ranked">Ranked</option>
                  <option value="text">Free text</option>
                </select>
              </label>

              {question.kind !== "text" && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-muted">
                    Provide at least two options. Drag-and-drop ordering will arrive later.
                  </p>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(event) =>
                          updateOption(question.id, optionIndex, event.target.value)
                        }
                        className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-foreground outline-none focus:border-white/40"
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(question.id, optionIndex)}
                          className="text-xs text-red-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(question.id)}
                    className="text-xs text-foreground underline"
                  >
                    Add option
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`${buttonPrimary} px-8`}
      >
        {isSubmitting ? "Saving…" : "Save draft"}
      </button>
    </form>
  );
}
