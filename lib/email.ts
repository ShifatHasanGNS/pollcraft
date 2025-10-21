const RESEND_ENDPOINT = "https://api.resend.com/emails";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
  };
}

export function isEmailConfigured(): boolean {
  const { apiKey, from } = getEmailConfig();
  return Boolean(apiKey && from);
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const { apiKey, from } = getEmailConfig();

  if (!apiKey || !from) {
    console.warn(
      `[email] Missing RESEND_API_KEY or EMAIL_FROM. Skipping email to ${to}.`,
    );
    return;
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to send email to ${to}: ${detail}`);
  }
}
