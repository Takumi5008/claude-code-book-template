import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  await transporter.sendMail({
    from: `"シフト管理" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'パスワードリセットのご案内',
    html: `
      <p>パスワードリセットのリクエストを受け付けました。</p>
      <p>以下のリンクをクリックして新しいパスワードを設定してください。</p>
      <p><a href="${resetUrl}" style="color:#4f46e5;font-weight:bold;">パスワードをリセットする</a></p>
      <p>このリンクは1時間有効です。リクエストした覚えがない場合は無視してください。</p>
    `,
  });
};
