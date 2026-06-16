type ResendInviteEmailParams = {
  to: string;
  organisationName: string;
  temporaryPassword: string;
  inviteUrl: string;
};

type ResendSendEmailResponse = {
  id?: string;
};

function resolveResendApiKey(): string {
  const key = process.env.RESEND_API_KEY;

  if (!key?.trim()) {
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  return key;
}

function resolveResendFrom(): string {
  const from = process.env.RESEND_FROM ?? "Jet Operations <system@em.jetoperations.net>";

  if (!from.trim()) {
    throw new Error("Missing RESEND_FROM environment variable");
  }

  return from;
}

function buildInviteEmailHtml(params: ResendInviteEmailParams): string {
  const escapedOrganisation = escapeHtml(params.organisationName);
  const escapedEmail = escapeHtml(params.to);
  const escapedPassword = escapeHtml(params.temporaryPassword);
  const escapedLink = escapeHtml(params.inviteUrl);

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>You've been invited – Jet Operations</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { margin: 0; padding: 0; background-color: #F4F5F7; }
    @media only screen and (max-width: 640px) {
      .card-pad { padding: 32px 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F5F7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E5E7EB;">

          <!-- Logo area -->
          <tr>
            <td align="left" class="card-pad" style="padding: 36px 40px 28px;">
              <img
                src="https://wohclkrdcyykdjqzczgy.supabase.co/storage/v1/object/public/image_assets/logo.png"
                alt="Jet Operations"
                width="160"
                height="44"
                style="height: auto;"
              />
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-top: 1px solid #E5E7EB; font-size: 0; line-height: 0;"></td></tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="card-pad" style="padding: 32px 40px 36px;">

              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #3B63E8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">You've been invited</p>

              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.3;">Join your team on Jet Operations</h1>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.65; color: #4B5563; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                A system administrator at <strong style="color: #111827;">${escapedOrganisation}</strong> has invited you to join Jet Operations. Please click the button below to accept and create your account.
              </p>

              <!-- Temporary credentials box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 20px 24px;">
                    <p style="margin: 0 0 14px 0; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #6B7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Your temporary login details</p>

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0 0 2px 0; font-size: 12px; color: #9CA3AF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Email</p>
                          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #111827; font-family: 'SF Mono', Consolas, Menlo, monospace;">${escapedEmail}</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px 0; font-size: 12px; color: #9CA3AF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Temporary password</p>
                          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #111827; font-family: 'SF Mono', Consolas, Menlo, monospace;">${escapedPassword}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 28px 0; font-size: 13px; line-height: 1.6; color: #6B7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                You'll be asked to set a new password the first time you sign in.
              </p>

              <!-- CTA button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #111827;">
                    <a href="${escapedLink}"
                       target="_blank"
                       style="display: inline-block; padding: 13px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 6px; background-color: #111827; mso-padding-alt: 13px 28px;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.6; color: #9CA3AF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                Or copy and paste this link into your browser:<br />
                <a href="${escapedLink}" style="color: #3B63E8; text-decoration: underline; word-break: break-all;">${escapedLink}</a>
              </p>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-top: 1px solid #E5E7EB; font-size: 0; line-height: 0;"></td></tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="card-pad" style="padding: 20px 40px 28px;">
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #9CA3AF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                If you weren't expecting this invitation, you can safely ignore this email.<br />
                &copy; 2025 Jet Operations
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Sends a custom organisation invite email using Resend.
 */
export async function sendOrganisationInviteEmail(
  params: ResendInviteEmailParams,
): Promise<{ id: string | null; error: string | null }> {
  const apiKey = resolveResendApiKey();
  const from = resolveResendFrom();

  let response: Response;

  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: "You've been invited to join Jet Operations",
        html: buildInviteEmailHtml(params),
      }),
    });
  } catch (error) {
    return {
      id: null,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }

  const body = (await response.json().catch(() => null)) as ResendSendEmailResponse | null;

  if (!response.ok) {
    return { id: null, error: "Resend rejected the invite email request" };
  }

  return { id: body?.id ?? null, error: null };
}

