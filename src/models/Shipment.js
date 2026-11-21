const mongoose = require('mongoose');

const trackingEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    location: String,
    note: String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    carrier: { type: String, required: true, trim: true },
    trackingNumber: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'],
      default: 'pending',
    },
    shippingAddress: {
      fullName: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'IN' },
    },
    trackingHistory: [trackingEventSchema],
    shippedAt: Date,
    estimatedDelivery: Date,
    deliveredAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shipment', shipmentSchema);