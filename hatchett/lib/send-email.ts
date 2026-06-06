import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordReset(to: string, resetLink: string, agencyName: string) {
  await resend.emails.send({
    from: `${agencyName} <noreply@hatchett.agency>`,
    to,
    subject: 'Reset your password',
    html: `
      <div style="background:#1A1A1A;padding:40px;font-family:sans-serif;">
        <div style="max-width:500px;margin:0 auto;background:#242424;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#FF4500,#FF8C00);padding:24px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:1.5rem;font-weight:800;letter-spacing:0.2em;">HATCHETT</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#F5F5F5;font-size:1.25rem;margin-bottom:16px;">Reset Your Password</h2>
            <p style="color:#9CA3AF;font-size:0.875rem;line-height:1.6;margin-bottom:24px;">
              Click the button below to reset your password. This link expires in 1 hour.
            </p>
            <a href="${resetLink}"
               style="display:inline-block;background:linear-gradient(135deg,#FF4500,#FF8C00);color:white;
                      text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;
                      font-size:0.875rem;">
              Reset Password
            </a>
            <p style="color:#9CA3AF;font-size:0.75rem;margin-top:24px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendReport(
  to: string | string[],
  agencyName: string,
  clientName: string,
  pdfBuffer: Buffer,
  period: string,
) {
  const recipients = Array.isArray(to) ? to : [to];
  const filename = `${clientName.replace(/\s+/g, '-')}-report-${period}.pdf`;

  await resend.emails.send({
    from: `${agencyName} <noreply@hatchett.agency>`,
    to: recipients,
    subject: `${clientName} Marketing Report — ${period}`,
    attachments: [
      {
        filename,
        content: pdfBuffer.toString('base64'),
      },
    ],
    html: `
      <div style="background:#1A1A1A;padding:40px;font-family:sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#242424;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#FF4500,#FF8C00);padding:32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:0.2em;">${agencyName.toUpperCase()}</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:0.875rem;">Marketing Performance Report</p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#F5F5F5;font-size:1.25rem;margin-bottom:8px;">${clientName}</h2>
            <p style="color:#9CA3AF;font-size:0.875rem;margin-bottom:24px;">${period}</p>
            <p style="color:#9CA3AF;font-size:0.875rem;line-height:1.6;margin-bottom:24px;">
              Your marketing performance report for ${period} is attached to this email.
              Log in to your dashboard for interactive charts and detailed breakdowns.
            </p>
            <a href="${process.env.NEXTAUTH_URL}/dashboard"
               style="display:inline-block;background:linear-gradient(135deg,#FF4500,#FF8C00);color:white;
                      text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;
                      font-size:0.875rem;">
              View Dashboard
            </a>
          </div>
          <div style="padding:16px 32px;border-top:1px solid #333;text-align:center;">
            <p style="color:#9CA3AF;font-size:0.75rem;margin:0;">
              Powered by ${agencyName} · Hatchett Dashboard
            </p>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendInviteEmail(
  to: string,
  agencyName: string,
  inviteLink: string,
) {
  await resend.emails.send({
    from: `${agencyName} <noreply@hatchett.agency>`,
    to,
    subject: `You've been invited to ${agencyName}'s dashboard`,
    html: `
      <div style="background:#1A1A1A;padding:40px;font-family:sans-serif;">
        <div style="max-width:500px;margin:0 auto;background:#242424;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#FF4500,#FF8C00);padding:24px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:1.5rem;font-weight:800;letter-spacing:0.2em;">HATCHETT</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#F5F5F5;font-size:1.25rem;margin-bottom:16px;">You're invited!</h2>
            <p style="color:#9CA3AF;font-size:0.875rem;line-height:1.6;margin-bottom:24px;">
              ${agencyName} has invited you to access their marketing dashboard.
              Click below to set up your account.
            </p>
            <a href="${inviteLink}"
               style="display:inline-block;background:linear-gradient(135deg,#FF4500,#FF8C00);color:white;
                      text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;
                      font-size:0.875rem;">
              Accept Invitation
            </a>
          </div>
        </div>
      </div>
    `,
  });
}
