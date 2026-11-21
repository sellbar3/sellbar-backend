const Wishlist = require('../../models/Wishlist');
const Product = require('../../models/Product');

// GET /api/wishlist
exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
      'products.product',
      'name price images slug'
    );
    res.json({ success: true, data: wishlist ? wishlist.products : [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/wishlist/:productId
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product नहीं मिला' });

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) wishlist = new Wishlist({ user: req.user._id, products: [] });

    const already = wishlist.products.some((p) => p.product.toString() === productId);
    if (already) {
      return res.status(409).json({ success: false, message: 'Product पहले से wishlist में है' });
    }

    wishlist.products.push({ product: productId });
    await wishlist.save();

    res.status(201).json({ success: true, message: 'Wishlist में जोड़ा गया', data: wishlist.products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/wishlist/:productId
exports.removeFromWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { products: { product: req.params.productId } } },
      { new: true }
    );
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist नहीं मिली' });

    res.json({ success: true, message: 'Wishlist से हटाया गया', data: wishlist.products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/wishlist
exports.clearWishlist = async (req, res) => {
  try {
    await Wishlist.findOneAndUpdate({ user: req.user._id }, { $set: { products: [] } });
    res.json({ success: true, message: 'Wishlist खाली कर दी गई' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};