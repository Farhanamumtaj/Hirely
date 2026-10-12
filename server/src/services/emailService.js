
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM?.trim();
  const fromName = (process.env.EMAIL_FROM_NAME || "Hirely").trim();

  if (!apiKey) {
    throw new Error("Brevo configuration is missing: BREVO_API_KEY.");
  }

  if (!fromEmail) {
    throw new Error("Email sender configuration is missing: EMAIL_FROM.");
  }

  if (!to || !resetUrl) {
    throw new Error("Password-reset recipient or URL is missing.");
  }

  const safeResetUrl = escapeHtml(resetUrl);

  const textContent = [
    "We received a request to reset your Hirely password.",
    "",
    "Use the link below to choose a new password:",
    resetUrl,
    "",
    "This link expires in 15 minutes and can only be used once.",
    "If you did not request this reset, you can ignore this email.",
  ].join("\n");

  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#222">
      <h1 style="font-size:26px">Reset your Hirely password</h1>
      <p>We received a request to reset your Hirely password.</p>
      <p>Click the button below to choose a new password.</p>
      <p style="margin:28px 0">
        <a
          href="${safeResetUrl}"
          style="display:inline-block;padding:13px 22px;background:#252525;color:#fff;text-decoration:none;border-radius:6px"
        >Reset password</a>
      </p>
      <p>This link expires in 15 minutes and can only be used once.</p>
      <p>If you did not request this reset, you can safely ignore this email.</p>
    </div>
  `;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: fromName,
        email: fromEmail,
      },
      to: [{ email: to }],
      subject: "Reset your Hirely password",
      textContent,
      htmlContent,
    }),
  });

  const responseText = await response.text();

  let result = {};

  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    const reason = result.message || responseText || "Unknown error";

    throw new Error(
      `Brevo email API failed (${response.status}): ${reason}`,
    );
  }

  return result;
}
