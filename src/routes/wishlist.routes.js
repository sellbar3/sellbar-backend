
const router = require('express').Router();

const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/wishlist/wishlist.controller');

// Protected wishlist routes
router.use(authenticate);

router.get('/', ctrl.getWishlist);
router.post('/:productId', ctrl.addToWishlist);
router.delete('/:productId', ctrl.removeFromWishlist);
router.delete('/', ctrl.clearWishlist);

module.exports = router;
