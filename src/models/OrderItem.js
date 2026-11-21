const mongoose = require("mongoose");

// Embedded subdocument schema for items inside an Order.
// Product name, price and image are snapshotted at checkout time,
// so later product edits never change past orders.
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// Safety net: lineTotal must equal price * quantity (rounded to 2 decimals).
orderItemSchema.pre("validate", function (next) {
  const expected = Math.round(this.price * this.quantity * 100) / 100;

  if (Math.abs(expected - this.lineTotal) > 0.001) {
    return next(new Error("lineTotal must equal price * quantity."));
  }

  return next();
});

module.exports = orderItemSchema;