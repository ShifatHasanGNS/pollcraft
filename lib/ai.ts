type ReportSection = {
  heading: string;
  body: string;
};

type ReportPayload = {
  pollId: string;
  title: string;
  description?: string | null;
  aggregates: unknown;
};

export type GeneratedReport = {
  sections: ReportSection[];
};

export async function generateReport(payload: ReportPayload): Promise<GeneratedReport> {
  void payload;
  throw new Error("AI report generation is not implemented yet");
}
