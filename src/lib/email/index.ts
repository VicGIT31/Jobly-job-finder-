export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/** Provider de dev : affiche l'email dans la console. */
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(
      [
        "┌─────────────────────── EMAIL (console) ───────────────────────",
        `│ À      : ${message.to}`,
        `│ Sujet  : ${message.subject}`,
        "├────────────────────────────────────────────────────────────────",
        ...message.text.split("\n").map((line) => `│ ${line}`),
        "└────────────────────────────────────────────────────────────────",
      ].join("\n"),
    );
  }
}

/** Provider de prod : Resend. */
class ResendEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "NextStep <no-reply@nextstep.example>",
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) throw new Error(`Resend : ${error.message}`);
  }
}

let provider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    provider =
      process.env.EMAIL_PROVIDER === "resend"
        ? new ResendEmailProvider()
        : new ConsoleEmailProvider();
  }
  return provider;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await getEmailProvider().send(message);
}
