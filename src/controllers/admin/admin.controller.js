const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Vendor = require("../../models/Vendor");
const { uploadImageBuffer, deleteImage } = require("../../utils/cloudinary");

const VENDOR_FOLDER = "sellbar/vendors";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalCustomers,
      totalVendors,
      activeUsers,
      blockedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "vendor" }),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "blocked" }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Admin dashboard fetched successfully",
      data: {
        users: {
          total: totalUsers,
          admins: totalAdmins,
          customers: totalCustomers,
          vendors: totalVendors,
          active: activeUsers,
          blocked: blockedUsers,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};

    if (["admin", "customer", "vendor"].includes(req.query.role)) {
      filter.role = req.query.role;
    }

    if (["active", "inactive", "blocked"].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Vendor users ke saath unka vendor profile attach karo
    const vendorUserIds = users.filter((u) => u.role === "vendor").map((u) => u._id);

    if (vendorUserIds.length) {
      const vendors = await Vendor.find({ user: { $in: vendorUserIds } }).lean();
      const byUser = new Map(vendors.map((v) => [String(v.user), v]));

      for (const u of users) {
        if (u.role === "vendor") u.vendor = byUser.get(String(u._id)) || null;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["active", "inactive", "blocked"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid user status" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be modified using this endpoint",
      });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/vendors/:id/approval
exports.updateVendorApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid vendor ID" });
    }

    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: "approvalStatus must be approved or rejected",
      });
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" });
    }

    vendor.approvalStatus = approvalStatus;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: `Vendor ${approvalStatus} successfully`,
      data: {
        vendor: {
          id: vendor._id,
          user: vendor.user,
          storeName: vendor.storeName,
          approvalStatus: vendor.approvalStatus,
          isStoreActive: vendor.isStoreActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/vendors  (multipart/form-data)
// name, email, password, storeName, storeDescription, phone, address, logo(file)
exports.createVendor = async (req, res, next) => {
  let user = null;
  let uploaded = null;

  try {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    const storeName = String(b.storeName || "").trim();

    if (!name || !email || !storeName) {
      return res.status(400).json({
        success: false,
        message: "Name, email and store name are required",
      });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (await User.exists({ email })) {
      return res.status(409).json({ success: false, message: "Email is already registered" });
    }

    const rounds = Math.max(10, Math.min(14, Number(process.env.BCRYPT_ROUNDS) || 12));
    const hashedPassword = await bcrypt.hash(password, rounds);

    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "vendor",
      status: "active",
    });

    if (req.file) {
      uploaded = await uploadImageBuffer(req.file.buffer, VENDOR_FOLDER);
    }

    // Admin ne banaya hai, isliye seedha approved
    const vendor = await Vendor.create({
      user: user._id,
      storeName,
      storeDescription: String(b.storeDescription || "").trim(),
      phone: String(b.phone || "").trim(),
      address: String(b.address || "").trim(),
      logo: uploaded ? { url: uploaded.url, publicId: uploaded.publicId } : undefined,
      approvalStatus: "approved",
      isStoreActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        vendor,
      },
    });
  } catch (error) {
    // Rollback: adhura data na bache
    if (uploaded?.publicId) await deleteImage(uploaded.publicId).catch(() => {});
    if (user?._id) await User.deleteOne({ _id: user._id }).catch(() => {});

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or vendor profile already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    next(error);
  }
};

// POST /api/admin/users/:id/vendor-profile
// Jin vendor users ka store profile nahi bana, unke liye banata hai
exports.createVendorProfileForUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const user = await User.findById(id);

    if (!user || user.role !== "vendor") {
      return res.status(404).json({ success: false, message: "Vendor user not found" });
    }

    if (await Vendor.exists({ user: user._id })) {
      return res.status(409).json({ success: false, message: "Vendor profile already exists" });
    }

    const b = req.body || {};
    const storeName = String(b.storeName || "").trim();

    if (!storeName) {
      return res.status(400).json({ success: false, message: "Store name is required" });
    }

    const vendor = await Vendor.create({
      user: user._id,
      storeName,
      storeDescription: String(b.storeDescription || "").trim(),
      phone: String(b.phone || "").trim(),
      address: String(b.address || "").trim(),
      approvalStatus: "approved",
      isStoreActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Vendor profile created successfully",
      data: { vendor },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Vendor profile already exists" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};