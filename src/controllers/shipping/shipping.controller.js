const Shipment = require('../../models/Shipment');

// POST /api/shipping  (vendor/admin)
exports.createShipment = async (req, res) => {
  try {
    const { order, carrier, trackingNumber, shippingAddress, estimatedDelivery } = req.body;

    if (!order || !carrier || !trackingNumber) {
      return res.status(400).json({ success: false, message: 'order, carrier और trackingNumber ज़रूरी हैं' });
    }

    const exists = await Shipment.findOne({ trackingNumber });
    if (exists) {
      return res.status(409).json({ success: false, message: 'यह tracking number पहले से मौजूद है' });
    }

    const shipment = await Shipment.create({
      order,
      carrier,
      trackingNumber,
      shippingAddress,
      estimatedDelivery,
      vendor: req.user.role === 'vendor' ? req.user.vendorId : undefined,
      trackingHistory: [{ status: 'pending', note: 'Shipment created' }],
    });

    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shipping  (admin)
exports.getAllShipments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const [data, total] = await Promise.all([
      Shipment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('order', 'orderNumber totalAmount'),
      Shipment.countDocuments(filter),
    ]);

    res.json({ success: true, total, page: Number(page), data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shipping/order/:orderId
exports.getShipmentsByOrder = async (req, res) => {
  try {
    const shipments = await Shipment.find({ order: req.params.orderId });
    res.json({ success: true, data: shipments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shipping/track/:trackingNumber
exports.trackShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ trackingNumber: req.params.trackingNumber });
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment नहीं मिला' });
    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/shipping/:id/status  (vendor/admin)
exports.updateShipmentStatus = async (req, res) => {
  try {
    const { status, location, note } = req.body;
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment नहीं मिला' });

    shipment.status = status;
    shipment.trackingHistory.push({ status, location, note });

    if (status === 'shipped' && !shipment.shippedAt) shipment.shippedAt = new Date();
    if (status === 'delivered') shipment.deliveredAt = new Date();

    await shipment.save();
    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};