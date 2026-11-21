
const router = require('express').Router();

const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

const ctrl = require('../controllers/coupon/coupon.controller');

// All routes require login
router.use(authenticate);

// Customer
router.post('/validate', authorizeRoles('customer'), ctrl.validateCoupon);

// Admin / Vendor
router.post(
  '/',
  authorizeRoles('admin', 'vendor'),
  ctrl.createCoupon
);

router.get(
  '/',
  authorizeRoles('admin', 'vendor'),
  ctrl.getAllCoupons
);

router.get(
  '/:id',
  authorizeRoles('admin', 'vendor'),
  ctrl.getCouponById
);

router.put(
  '/:id',
  authorizeRoles('admin', 'vendor'),
  ctrl.updateCoupon
);

router.patch(
  '/:id/toggle',
  authorizeRoles('admin', 'vendor'),
  ctrl.toggleCoupon
);

router.delete(
  '/:id',
  authorizeRoles('admin', 'vendor'),
  ctrl.deleteCoupon
);

module.exports = router;
