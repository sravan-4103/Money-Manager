const nodemailer = require('nodemailer');
const dns = require('dns');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { family: 4 }, (err, address, family) => {
      callback(err, address, family);
    });
  },
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendOTP(toEmail, otp,name='there') {
  await transporter.sendMail({
    from: `"Money Manager 💰" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} is your Money Manager verification code`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f1117; border-radius: 16px; overflow: hidden; border: 1px solid #1e2130;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 8px;">💰</div>
          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Money Manager</h1>
        </div>

        <!-- Body -->
        <div style="padding: 36px 32px;">
          <h2 style="margin: 0 0 8px 0; color: #f1f5f9; font-size: 18px; font-weight: 600;">Verify your email address</h2>
          <p style="margin: 0 0 16px 0; color: #cbd5e1; font-size: 16px;">
            Hi <strong>${name}</strong>,
          </p>
          <p style="margin: 0 0 28px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
            Use the OTP below to complete your registration. It expires in <strong style="color: #f1f5f9;">10 minutes</strong>.
          </p>

          <!-- OTP Box -->
          <div style="background: #1e2130; border: 1px solid #2d3148; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
            <div style="letter-spacing: 12px; font-size: 38px; font-weight: 800; color: #818cf8; font-family: monospace;">${otp}</div>
          </div>

          <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
            If you didn't request this, you can safely ignore this email.<br>
            Someone may have entered your email by mistake.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 32px; border-top: 1px solid #1e2130; text-align: center;">
          <p style="margin: 0; color: #475569; font-size: 12px;">© 2024 Money Manager. All rights reserved.</p>
        </div>

      </div>
    `
  });
}

module.exports = { sendOTP };
