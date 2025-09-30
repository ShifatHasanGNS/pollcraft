"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

import { buttonPrimary, subCard } from "@/lib/styles";

type VoteQuestion = {
  id: string;
  prompt: string;
  kind: "single" | "multi" | "ranked" | "text";
  options: Array<{ id: string; label: string }>;
};

type VoteFormProps = {
  poll: {
    id: string;
    identityMode: "anonymous" | "identified";
  };
  questions: VoteQuestion[];
  inviteToken?: string;
  className?: string;
};

type ResponseState =
  | {
    type: "text";
    questionId: string;
    freeText: string;
  }
  | {
    type: "choice";
    questionId: string;
    kind: "single" | "multi" | "ranked";
    optionIds: string[];
  };

function initialiseResponses(questions: VoteQuestion[]): ResponseState[] {
  return questions.map((question) =>
    question.kind === "text"
      ? { type: "text", questionId: question.id, freeText: "" }
      : {
        type: "choice",
        questionId: question.id,
        kind: question.kind,
        optionIds: [],
      },
  );
}

export function VoteForm({ poll, questions, inviteToken, className }: VoteFormProps) {
  const router = useRouter();
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [responses, setResponses] = useState<ResponseState[]>(() => initialiseResponses(questions));
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = window.localStorage.getItem("pollcraft_device");
    if (existing) {
      setDeviceToken(existing);
    } else {
      const generated = crypto.randomUUID();
      window.localStorage.setItem("pollcraft_device", generated);
      setDeviceToken(generated);
    }
  }, []);

  useEffect(() => {
    setResponses(initialiseResponses(questions));
  }, [questions]);

  function handleOptionToggle(questionId: string, optionId: string, kind: "single" | "multi" | "ranked") {
    setResponses((prev) =>
      prev.map((response) => {
        if (response.type !== "choice" || response.questionId !== questionId) {
          return response;
        }

        if (kind === "single") {
          return { ...response, optionIds: [optionId] };
        }

        const exists = response.optionIds.includes(optionId);
        if (exists) {
          return {
            ...response,
            optionIds: response.optionIds.filter((id) => id !== optionId),
          };
        }

        return {
          ...response,
          optionIds: [...response.optionIds, optionId],
        };
      }),
    );
  }

  function handleText(questionId: string, value: string) {
    setResponses((prev) =>
      prev.map((response) =>
        response.type === "text" && response.questionId === questionId
          ? { ...response, freeText: value }
          : response,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    type PayloadResponse =
      | { questionId: string; freeText: string }
      | { questionId: string; optionIds: string[] };

    const payloadResponses = responses
      .map<PayloadResponse | null>((response) => {
        if (response.type === "text") {
          const trimmed = response.freeText.trim();
          if (trimmed.length === 0) {
            return null;
          }
          return { questionId: response.questionId, freeText: trimmed };
        }

        if (response.optionIds.length === 0) {
          return null;
        }

        return { questionId: response.questionId, optionIds: [...response.optionIds] };
      })
      .filter((entry): entry is PayloadResponse => entry !== null);

    if (payloadResponses.length === 0) {
      setStatus("error");
      setError("Select at least one answer before submitting.");
      return;
    }

    try {
      const ballotPayload: Record<string, unknown> = {};
      if (deviceToken) {
        ballotPayload.deviceToken = deviceToken;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent) {
        ballotPayload.userAgent = navigator.userAgent;
      }
      if (poll.identityMode === "identified") {
        ballotPayload.voterRef = email;
      }
      if (inviteToken) {
        ballotPayload.inviteToken = inviteToken;
      }

      const ballotRes = await fetch(`/api/polls/${poll.id}/ballots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ballotPayload),
      });

      if (!ballotRes.ok) {
        const detail = await ballotRes.json().catch(() => ({}));
        throw new Error(detail.error ?? "Unable to start ballot");
      }

      const ballot = await ballotRes.json();
      if (ballot.deviceToken && typeof window !== "undefined") {
        window.localStorage.setItem("pollcraft_device", ballot.deviceToken);
        setDeviceToken(ballot.deviceToken);
      }

      const submitRes = await fetch(`/api/ballots/${ballot.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: payloadResponses }),
      });

      if (!submitRes.ok) {
        const detail = await submitRes.json().catch(() => ({}));
        throw new Error(detail.error ?? "Unable to submit ballot");
      }

      setStatus("success");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={clsx("flex flex-col gap-6", className)}>
      {poll.identityMode === "identified" && (
        <label className="flex flex-col gap-2 text-sm">
          <span>Email (required)</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none focus:border-white/30"
            placeholder="you@example.com"
          />
        </label>
      )}

      {questions.map((question) => {
        const response = responses.find((item) => item.questionId === question.id);
        if (!response) return null;

        if (response.type === "text") {
          return (
            <section key={question.id} className={`${subCard} border-white/15 bg-black/30 p-5`}>
              <p className="text-sm font-semibold text-foreground">{question.prompt}</p>
              <textarea
                rows={3}
                value={response.freeText}
                onChange={(event) => handleText(question.id, event.target.value)}
                className="mt-3 w-full rounded border border-white/15 bg-black/25 px-3 py-2 text-sm text-foreground outline-none focus:border-white/40"
                placeholder="Type your answer (leave blank to skip)"
              />
            </section>
          );
        }

        return (
          <section key={question.id} className={`${subCard} border-white/15 bg-black/30 p-5`}>
            <p className="text-sm font-semibold text-foreground">{question.prompt}</p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              {question.options.map((option) => {
                const isSelected = response.optionIds.includes(option.id);
                const inputType = response.kind === "single" ? "radio" : "checkbox";
                return (
                  <label key={option.id} className="flex items-center gap-2">
                    <input
                      type={inputType}
                      name={question.id}
                      value={option.id}
                      checked={isSelected}
                      onChange={() => handleOptionToggle(question.id, option.id, response.kind)}
                      className="h-4 w-4 accent-[var(--accent-primary)]"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {status === "success" && <p className="text-sm text-green-400">Thanks for voting!</p>}

      <button
        type="submit"
        className={`${buttonPrimary} px-8`}
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Submitting…" : "Submit Ballot"}
      </button>
    </form>
  );
}
