const nodemailer = require('nodemailer');

// Build HTML email template
function buildOtpHtml(otp, purpose) {
  const purposeText = purpose === 'signup'
    ? 'You requested to create an account on CloudinaryWatch.'
    : 'You requested to sign in to your CloudinaryWatch account.';

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="padding: 32px 24px; text-align: center; background: linear-gradient(135deg, #6366f1, #06b6d4);">
        <h1 style="color: white; margin: 0; font-size: 24px;">CloudinaryWatch</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Email Verification</p>
      </div>
      <div style="padding: 32px 24px; text-align: center;">
        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">${purposeText}</p>
        <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 12px;">Your verification code is:</p>
        <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 0 auto; display: inline-block;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 12px; margin: 20px 0 0;">This code expires in <strong style="color: #f59e0b;">5 minutes</strong>.</p>
        <p style="color: #475569; font-size: 11px; margin: 16px 0 0;">If you didn't request this, you can safely ignore this email.</p>
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid #1e293b; text-align: center;">
        <p style="color: #475569; font-size: 11px; margin: 0;">CloudinaryWatch — Asset Manager</p>
      </div>
    </div>
  `;
}

/**
 * Send OTP email using Resend (production) or Nodemailer (dev fallback)
 */
async function sendOtpEmail(to, otp, purpose = 'signup') {
  const subject = purpose === 'signup'
    ? 'Verify your email — CloudinaryWatch'
    : 'Sign-in verification — CloudinaryWatch';
  const html = buildOtpHtml(otp, purpose);

  // Use Resend if API key is set (works on Render — uses HTTP, not SMTP)
  if (process.env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: 'CloudinaryWatch <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
    return;
  }

  // Fallback to Nodemailer/Gmail for local development
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"CloudinaryWatch" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = { sendOtpEmail };
