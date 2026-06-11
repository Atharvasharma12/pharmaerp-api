// src/utils/sendEmail.js
import nodemailer from "nodemailer";
import brevoTransport from "nodemailer-brevo-transport";
import env from "../config/env.js";

// Configure Nodemailer with Brevo API Transport to bypass Render's port blocks
const transporter = nodemailer.createTransport(
  new brevoTransport({
    apiKey: env.BREVO_API_KEY,
  }),
);

export const sendEmail = async ({ to, subject, html, text }) => {
  const mailOptions = {
    from: env.MAIL_FROM,
    to,
    subject,
    html,
    text: text || "",
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[BREVO SUCCESS] Email successfully sent to: ${to}`);

    return {
      success: true,
      messageId: info?.messageId || "BREVO_API_DELIVERY",
    };
  } catch (error) {
    console.error("Brevo/Nodemailer error:", error);
    throw new Error(error.message || "Failed to send email via Brevo API");
  }
};
