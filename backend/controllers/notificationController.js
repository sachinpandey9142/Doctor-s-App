const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const getNotifications = catchAsync(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);

  const filter = { userId: req.user._id };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("triggerUserId", "name profileImage role isVerified")
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false })
  ]);

  res.status(200).json({
    success: true,
    data: notifications,
    meta: {
      unreadCount
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

const markNotificationAsRead = catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user._id
    },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  res.status(200).json({
    success: true,
    data: notification
  });
});

module.exports = {
  getNotifications,
  markNotificationAsRead
};
