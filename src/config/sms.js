const logger = require('./logger');
const { sendEmail } = require('./mailer'); // your SendPulse + SMTP utility
const { Sema } = require('async-sema');

let client;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require('twilio');
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    logger.info('✅ Twilio client initialized');
  } catch (err) {
    logger.error(`❌ Failed to initialize Twilio client: ${err.message}`);
  }
}

// -------------------- CONFIGURATION --------------------
const MAX_SMS_PER_SECOND = 1;
const smsLimiter = new Sema(MAX_SMS_PER_SECOND);

// -------------------- HELPER: VALIDATE PHONE --------------------
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

// -------------------- SEND SMS (with fallback) --------------------
const sendSMS = async (to, message) => {
  if (!message || message.length > 1600) {
    logger.warn('⚠️ SMS content is empty or too long');
    throw new Error('SMS content is empty or too long');
  }

  // --- Twilio path ---
  if (client) {
    if (!validatePhoneNumber(to)) {
      logger.warn(`⚠️ Invalid phone number format: ${to}`);
      throw new Error('Invalid phone number');
    }

    try {
      await smsLimiter.acquire();
      const msg = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
      logger.info(`✅ SMS sent to ${to}: ${msg.sid}`);
      return msg;
    } catch (err) {
      logger.error(`❌ SMS sending failed to ${to}: ${err.message}`);
      throw new Error('Failed to send SMS via Twilio');
    } finally {
      smsLimiter.release();
    }
  }

  // --- Fallback: send as email if Twilio not configured ---
  try {
    logger.warn(`⚠️ Twilio not configured, sending SMS as email to ${to}`);
    const emailResult = await sendEmail({
      to: `${to}@example.com`, // optional mapping if needed
      subject: 'SMS Notification',
      text: message,
    });
    return emailResult;
  } catch (err) {
    logger.error(`❌ Failed to send fallback email to ${to}: ${err.message}`);
    throw new Error('Failed to send SMS via fallback email');
  }
};

module.exports = { sendSMS };
