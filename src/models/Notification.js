const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Who receives it (customer, vendor or admin user).
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["order", "payment", "stock", "system"],
      default: "system",
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    // Optional links so the app can open the related screen.
    data: {
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
      checkoutGroupId: { type: String, default: null },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

// Helper to create a notification from anywhere in the code.
// Pass { session } to make it part of a transaction.
//   await Notification.notify({ recipient, type, title, message, data }, { session });
notificationSchema.statics.notify = async function (payload, options = {}) {
  const [notification] = await this.create([payload], options);
  return notification;
};

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);