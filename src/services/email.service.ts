import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL MOCK] To: ${options.to} | Subject: ${options.subject}`)
    return
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}

export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

  await sendEmail({
    to: email,
    subject: 'Password Reset Request - Banking Wallet',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #D4AF37;">Password Reset Request</h2>
        <p>You requested a password reset for your Banking Wallet account.</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #D4AF37; color: #2C2926; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">Banking Wallet Security Team</p>
      </div>
    `,
  })
}

export const sendWelcomeEmail = async (email: string, firstName: string): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Welcome to Banking Wallet!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #D4AF37;">Welcome, ${firstName}!</h2>
        <p>Your Banking Wallet account has been created successfully.</p>
        <p>You can now:</p>
        <ul>
          <li>Create bank accounts</li>
          <li>Transfer money securely</li>
          <li>Track all your transactions</li>
        </ul>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; background-color: #D4AF37; color: #2C2926; padding: 12px 24; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">Go to Dashboard</a>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">Banking Wallet Team</p>
      </div>
    `,
  })
}
