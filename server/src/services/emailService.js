
import nodemailer from "nodemailer";

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const { EMAIL_USER, EMAIL_APP_PASSWORD, EMAIL_FROM } = process.env;

  if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
    throw new Error("Gmail email configuration is missing.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_APP_PASSWORD.replace(/\s/g, ""),
    },
  });

  return transporter.sendMail({
    from: EMAIL_FROM || EMAIL_USER,
    to,
    subject: "Reset your Hirely password",
    text: [
      "We received a request to reset your Hirely password.",
      "",
      "Use the link below to choose a new password:",
      resetUrl,
      "",
      "This link expires in 15 minutes and can only be used once.",
      "If you did not request this reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#222">
        <h1 style="font-size:26px">Reset your Hirely password</h1>
        <p>We received a request to reset your Hirely password.</p>
        <p>Click the button below to choose a new password.</p>
        <p style="margin:28px 0">
          <a
            href="${resetUrl}"
            style="display:inline-block;padding:13px 22px;background:#252525;color:#fff;text-decoration:none;border-radius:6px"
          >Reset password</a>
        </p>
        <p>This link expires in 15 minutes and can only be used once.</p>
        <p>If you did not request this reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}
