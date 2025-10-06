// modules/notifications/notification.controller.js
const createError = require("http-errors");
const {
  sendNotificationService,
  getUserNotificationsService,
  listNotificationsService,
} = require("./notification.service");

// -------------------- SEND NOTIFICATION --------------------
// Admin only
const sendNotification = async (req, res, next) => {
  try {
    const { title, message, targetUserId } = req.body;

    // Basic input validation
    if (!title || !message) {
      throw createError(400, "Title and message are required");
    }

    const notification = await sendNotificationService({ title, message, targetUserId });
    res.status(201).json({ success: true, notification });
  } catch (err) {
    next(err);
  }
};

// -------------------- GET USER NOTIFICATIONS --------------------
const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw createError(401, "Unauthorized: User not found");

    const notifications = await getUserNotificationsService(userId);
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

// -------------------- LIST ALL NOTIFICATIONS --------------------
// Admin only
const listNotifications = async (req, res, next) => {
  try {
    const notifications = await listNotificationsService();
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendNotification,
  getUserNotifications,
  listNotifications,
};

