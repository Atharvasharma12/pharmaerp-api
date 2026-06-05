import { Resend } from "resend";
import env from "../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html, text }) => {
  const { data, error } = await resend.emails.send({
    from: env.MAIL_FROM,
    to,
    subject,
    html,
    text: text || "",
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message || "Failed to send email");
  }

  return data;
};
