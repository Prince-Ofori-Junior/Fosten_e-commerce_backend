// modules/notifications/notification.service.js
const {
  createNotification,
  getUserNotifications,
  updateNotificationStatus,
  listAllNotifications,
} = require("./notification.model");
const logger = require("../../config/logger");
const mailer = require("../../config/mailer");
const { sendSMS } = require("../../config/sms"); // Twilio-like SMS service
const { sendPush } = require("../../config/push");
const { pool } = require("../../config/db");

/**
 * Send notification to a user and log status
 * @param {Object} param0 
 * @param {number} param0.userId
 * @param {string} param0.type - email | sms | push
 * @param {string} param0.title
 * @param {string} param0.message
 */
const sendNotificationService = async ({ userId, type, title, message }) => {
  if (!userId || !type || !title || !message) {
    throw new Error("Invalid notification payload");
  }

  // Ensure type is supported
  const allowedTypes = ["email", "sms", "push"];
  if (!allowedTypes.includes(type)) {
    throw new Error(`Unsupported notification type: ${type}`);
  }

  // Fetch user email (and phone if needed)
  const { rows } = await pool.query("SELECT email, phone FROM users WHERE id=$1 AND is_active=true", [userId]);
  const user = rows[0];
  if (!user) throw new Error("User not found or inactive");

  // Create notification record
  const notification = await createNotification({ userId, type, title, message, status: "pending" });

  try {
    if (type === "email") {
      await mailer.sendMail({
        to: user.email,
        subject: title,
        html: `<p>${message}</p>`,
      });
    } else if (type === "sms") {
      if (!user.phone) throw new Error("User has no phone number");
      await sendSMS(user.phone, message);
    } else if (type === "push") {
      await sendPush(userId, title, message);
    }

    await updateNotificationStatus(notification.id, "sent");
    logger.info(`✅ Notification sent: ${notification.id} (type: ${type})`);
  } catch (err) {
    await updateNotificationStatus(notification.id, "failed");
    logger.error(`❌ Notification failed: ${notification.id} -> ${err.message}`);
  }

  return notification;
};

/**
 * Get notifications for a specific user
 * @param {number} userId
 */
const getUserNotificationsService = async (userId) => {
  if (!userId) throw new Error("User ID required");
  return await getUserNotifications(userId);
};

/**
 * Admin: list all notifications
 */
const listNotificationsService = async () => {
  return await listAllNotifications();
};

module.exports = {
  sendNotificationService,
  getUserNotificationsService,
  listNotificationsService,
};
