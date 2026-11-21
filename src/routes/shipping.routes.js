const router = require("express").Router();

const authenticate = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/shipping/shipping.controller");

// Public tracking
router.get("/track/:trackingNumber", ctrl.trackShipment);

// Protected routes
router.use(authenticate);

router.get("/order/:orderId", ctrl.getShipmentsByOrder);

// बाकी permissions अभी verify करनी होंगी
router.post("/", ctrl.createShipment);
router.patch("/:id/status", ctrl.updateShipmentStatus);
router.get("/", ctrl.getAllShipments);

module.exports = router;