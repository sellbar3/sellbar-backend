const Coupon = require('../../models/Coupon');

// POST /api/coupons  (admin/vendor)
exports.createCoupon = async (req, res) => {
  try {
    const exists = await Coupon.findOne({ code: req.body.code?.toUpperCase() });
    if (exists) {
      return res.status(409).json({ success: false, message: 'यह coupon code पहले से मौजूद है' });
    }

    const coupon = await Coupon.create({
      ...req.body,
      vendor: req.user.role === 'vendor' ? req.user.vendorId : req.body.vendor,
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/coupons  (admin/vendor)
exports.getAllCoupons = async (req, res) => {
  try {
    const { isActive, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (req.user.role === 'vendor') filter.vendor = req.user.vendorId;

    const [data, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Coupon.countDocuments(filter),
    ]);

    res.json({ success: true, total, page: Number(page), data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/coupons/:id
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon नहीं मिला' });
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/coupons/:id
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon नहीं मिला' });
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/coupons/:id/toggle
exports.toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon नहीं मिला' });

    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/coupons/:id
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon नहीं मिला' });
    res.json({ success: true, message: 'Coupon हटा दिया गया' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/coupons/validate  (customer)
// body: { code, orderAmount }
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code || orderAmount === undefined) {
      return res.status(400).json({ success: false, message: 'code और orderAmount ज़रूरी हैं' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon सही नहीं है' });

    const now = new Date();
    if (now < coupon.startDate) {
      return res.status(400).json({ success: false, message: 'Coupon अभी शुरू नहीं हुआ है' });
    }
    if (now > coupon.expiryDate) {
      return res.status(400).json({ success: false, message: 'Coupon की अवधि समाप्त हो चुकी है' });
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon की usage limit पूरी हो चुकी है' });
    }
    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `कम से कम ₹${coupon.minOrderAmount} का order होना चाहिए`,
      });
    }

    const userUses = coupon.usedBy.filter((u) => u.user.toString() === req.user._id.toString()).length;
    if (userUses >= coupon.perUserLimit) {
      return res.status(400).json({ success: false, message: 'आप यह coupon पहले ही use कर चुके हैं' });
    }

    let discount =
      coupon.discountType === 'percentage'
        ? (orderAmount * coupon.discountValue) / 100
        : coupon.discountValue;

    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(discount, orderAmount);

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discount: Math.round(discount * 100) / 100,
        finalAmount: Math.round((orderAmount - discount) * 100) / 100,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Order बनते समय इसे order controller से call करें
exports.markCouponUsed = async (code, userId) => {
  return Coupon.findOneAndUpdate(
    { code: code.toUpperCase() },
    { $inc: { usedCount: 1 }, $push: { usedBy: { user: userId } } }
  );
};