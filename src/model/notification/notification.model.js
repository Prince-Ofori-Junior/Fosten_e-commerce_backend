// modules/notifications/notification.model.js
const pool = require("../../config/db");
const createError = require("http-errors");

// Allowed notification statuses
const VALID_STATUSES = ["pending", "sent", "read", "failed"];

// -------------------- CREATE NOTIFICATION --------------------
const createNotification = async ({ userId, type, title, message, status = "pending" }) => {
  if (!userId) throw createError(400, "userId is required");
  if (!title || !message) throw createError(400, "title and message are required");
  if (status && !VALID_STATUSES.includes(status)) throw createError(400, "Invalid status");

  const query = `
    INSERT INTO notifications (user_id, type, title, message, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, type, title, message, status, created_at, updated_at;
  `;
  const values = [userId, type || "general", title, message, status];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

// -------------------- GET NOTIFICATIONS FOR A USER --------------------
const getUserNotifications = async (userId) => {
  if (!userId) throw createError(400, "userId is required");

  const query = `
    SELECT id, user_id, type, title, message, status, created_at, updated_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
};

// -------------------- UPDATE NOTIFICATION STATUS --------------------
const updateNotificationStatus = async (notificationId, status) => {
  if (!notificationId) throw createError(400, "notificationId is required");
  if (!VALID_STATUSES.includes(status)) throw createError(400, "Invalid status");

  const query = `
    UPDATE notifications
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, user_id, type, title, message, status, created_at, updated_at;
  `;
  const { rows } = await pool.query(query, [status, notificationId]);
  if (!rows[0]) throw createError(404, "Notification not found");

  return rows[0];
};

// -------------------- ADMIN: LIST ALL NOTIFICATIONS --------------------
const listAllNotifications = async () => {
  const query = `
    SELECT n.id, n.user_id, n.type, n.title, n.message, n.status, n.created_at, n.updated_at,
           u.name AS user_name, u.email AS user_email
    FROM notifications n
    LEFT JOIN users u ON n.user_id = u.id
    ORDER BY n.created_at DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

module.exports = {
  createNotification,
  getUserNotifications,
  updateNotificationStatus,
  listAllNotifications,
  VALID_STATUSES,
};
