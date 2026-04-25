const Notification = require("../models/Notification");

const createNotification = async ({ userId, type, title, body, referenceId = "", triggerUserId = null }) => {
  if (!userId || !type || !title || !body) {
    return null;
  }

  if (triggerUserId && String(triggerUserId) === String(userId)) {
    return null;
  }

  return Notification.create({
    userId,
    type,
    title,
    body,
    referenceId,
    triggerUserId
  });
};

module.exports = {
  createNotification
};
