"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { PollStatistics } from "@/lib/poll-stats";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type PollStatisticsClientProps = {
  pollId: string;
  initial: PollStatistics;
};

type ChartQuestion = PollStatistics["questions"][number];

type MessageEventPayload = {
  type: "snapshot" | "update";
  data: PollStatistics;
};

export function PollStatisticsClient({ pollId, initial }: PollStatisticsClientProps) {
  const [snapshot, setSnapshot] = useState<PollStatistics>(initial);
  const [connectionState, setConnectionState] = useState<"idle" | "open" | "error">("idle");

  useEffect(() => {
    const source = new EventSource(`/api/polls/${pollId}/events`);

    source.onopen = () => setConnectionState("open");
    source.onerror = () => {
      setConnectionState("error");
    };

    source.onmessage = (event) => {
      try {
        const payload: MessageEventPayload = JSON.parse(event.data);
        if (payload?.data) {
          setSnapshot(payload.data);
        }
      } catch (error) {
        console.error("Failed to parse statistics SSE message", error);
      }
    };

    return () => {
      source.close();
    };
  }, [pollId]);

  const colorPalette = [
    "#60a5fa",
    "#a855f7",
    "#f472b6",
    "#f97316",
    "#34d399",
    "#22d3ee",
    "#facc15",
    "#fb7185",
  ];

  const renderChart = (question: ChartQuestion) => {
    if (!question.options || question.options.length === 0) {
      return (
        <p className="text-sm text-muted">No choice data recorded yet.</p>
      );
    }

    const options = question.options;
    const labels = options.map((option) => option.label);
    const counts = options.map((option) => option.count);
    const participants = options[0]?.participants ?? 0;
    const maxValue = Math.max(participants, ...counts, 1);

    const chartOption = {
      tooltip: {
        trigger: "item",
        formatter: (params: { dataIndex: number }) => {
          const option = options[params.dataIndex];
          const percentage = option?.percentage ?? 0;
          const count = option?.count ?? 0;
          const total = option?.participants ?? 0;
          return `${labels[params.dataIndex]}<br/>${count} of ${total} (${percentage.toFixed(1)}%)`;
        },
      },
      grid: { left: 84, right: 32, bottom: 36, top: 16, containLabel: true },
      xAxis: {
        type: "value",
        max: maxValue,
        axisLabel: {
          formatter(value: number) {
            return value.toString();
          },
        },
        splitLine: {
          lineStyle: { color: "rgba(148, 163, 184, 0.15)" },
        },
      },
      yAxis: {
        type: "category",
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: counts,
          label: {
            show: true,
            position: "right",
            formatter: (params: { dataIndex: number }) => {
              const option = options[params.dataIndex] ?? null;
              if (!option) return "";
              return `${option.count} (${option.percentage.toFixed(1)}%)`;
            },
            color: "#e2e8f0",
            fontFamily: "inherit",
          },
          itemStyle: {
            borderRadius: [0, 10, 10, 0],
            color: (params: { dataIndex: number }) =>
              colorPalette[params.dataIndex % colorPalette.length],
          },
          barWidth: 22,
          emphasis: {
            itemStyle: {
              shadowBlur: 14,
              shadowColor: "rgba(30, 41, 59, 0.4)",
            },
          },
        },
      ],
      animationDuration: 600,
      animationEasing: "cubicOut",
    };

    return (
      <>
        <ReactECharts
          option={chartOption}
          style={{ height: Math.max(240, labels.length * 56), width: "100%" }}
        />
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
          {options.map((option, index) => (
            <span key={option.optionId} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: colorPalette[index % colorPalette.length],
                  boxShadow: "0 0 0 2px rgba(15, 23, 42, 0.6)",
                }}
              />
              <span className="text-slate-300">
                {option.label}
                <span className="text-slate-500">
                  {` · ${option.count}/${option.participants} (${option.percentage.toFixed(1)}%)`}
                </span>
              </span>
            </span>
          ))}
        </div>
      </>
    );
  };

  const questions = snapshot.questions;
  const participantCount = snapshot.ballots.totalSubmitted;

  return (
    <section className="space-y-8">
      {connectionState === "error" && (
        <p className="text-xs text-amber-300">Realtime connection lost. Reconnecting automatically…</p>
      )}

      <section className="rounded-xl border border-white/10 bg-surface/80 p-5 text-sm text-muted shadow shadow-black/25 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em]">Participants</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{participantCount}</p>
      </section>

      {questions.map((question) => (
        <article
          key={question.id}
          className="rounded-xl border border-white/10 bg-surface/80 p-6 shadow shadow-black/25 backdrop-blur"
        >
          <header className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Question</p>
            <h3 className="text-lg font-semibold text-foreground">{question.prompt}</h3>
            <p className="text-xs text-muted">
              {question.participants} of {participantCount} participant{participantCount === 1 ? "" : "s"} answered
            </p>
          </header>

          <div className="mt-4">
            {question.kind === "text" ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-muted">
                <p>
                  {question.text?.responses ?? 0} free-text response
                  {(question.text?.responses ?? 0) === 1 ? "" : "s"}. Export tools will surface these answers soon.
                </p>
              </div>
            ) : (
              renderChart(question)
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
