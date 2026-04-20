import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOtp = async (toPhone, otp) => {
  await client.messages.create({
    body: `【シフト管理】パスワードリセットコード: ${otp}\n有効期限は10分です。`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: toPhone,
  });
};
