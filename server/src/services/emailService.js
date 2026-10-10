
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email, code) {
  await transporter.sendMail({
    from: {
      name: "Hirely",
      address: process.env.SMTP_USER,
    },
    to: email,
    subject: "Verify your Hirely email address",
    text: `Your Hirely verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; color: #222;">
        <h2>Verify your email address</h2>
        <p>Use the verification code below to complete your Hirely registration.</p>
        <div style="font-size: 30px; font-weight: bold; letter-spacing: 8px; padding: 18px 0;">
          ${code}
        </div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this code, you can safely ignore this email.</p>
        <p>— Team Hirely</p>
      </div>
    `,
  });
}
