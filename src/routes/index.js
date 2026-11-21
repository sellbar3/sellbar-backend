
const express = require("express");

const router = express.Router();

// API Health Check
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SELLBAR API routes are working"
  });
});

// Authentication
router.use("/auth", require("./auth.routes"));

// Admin - Specific route first
router.use("/admin/orders", require("./adminOrder.routes"));
router.use("/admin", require("./admin.routes"));

// Vendor - Specific route first
router.use("/vendor/orders", require("./vendorOrder.routes"));
router.use("/vendor", require("./vendor.routes"));

// Products
router.use("/products", require("./product.routes"));
router.use("/public", require("./publicProduct.routes"));

// Customer
router.use("/cart", require("./cart.routes"));
router.use("/orders", require("./order.routes"));
router.use("/wishlist", require("./wishlist.routes"));

// Payments & Coupons
router.use("/payments", require("./payment.routes"));
router.use("/coupons", require("./coupon.routes"));

// Other modules
router.use("/categories", require("./category.routes"));
router.use("/reviews", require("./review.routes"));
router.use("/notifications", require("./notification.routes"));
router.use("/shipping", require("./shipping.routes"));

module.exports = router;
