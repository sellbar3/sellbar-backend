const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/auth.middleware");

const notificationController = require("../controllers/notification/notification.controller");

// Works for any logged-in user (customer, vendor or admin).
router.use(authenticate);

router.get("/", notificationController.getMyNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;