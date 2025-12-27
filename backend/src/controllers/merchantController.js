import Merchant from "../models/Merchant.js";
import Category from "../models/Category.js";
import Item from "../models/Item.js";

// ==========================================
// MERCHANT ONBOARDING OPERATIONS
// ==========================================

/**
 * GET /api/merchant/onboarding/status
 * Check if merchant has completed onboarding
 */
export const getOnboardingStatus = async (req, res) => {
	try {
		const merchant = await Merchant.findById(req.user.id)
			.select("isProfileComplete onboardingStep shopName businessCategory")
			.lean();

		if (!merchant) {
			return res.status(404).json({ message: "Merchant not found" });
		}

		res.json({
			isProfileComplete: merchant.isProfileComplete,
			onboardingStep: merchant.onboardingStep,
			hasBasicInfo: !!merchant.shopName && !!merchant.businessCategory,
		});
	} catch (error) {
		console.error("getOnboardingStatus error:", error);
		res.status(500).json({ message: "Failed to fetch onboarding status" });
	}
};

/**
 * POST /api/merchant/onboarding/business-info
 * Step 1: Save business information
 */
export const saveBusinessInfo = async (req, res) => {
	try {
		const {
			shopName,
			businessCategory,
			businessDescription,
			ownerName,
			phone,
			address,
			addressLine,
		} = req.body;

		// Validate required fields
		if (!shopName || !shopName.trim()) {
			return res.status(400).json({ message: "Shop name is required" });
		}
		if (!businessCategory) {
			return res.status(400).json({ message: "Business category is required" });
		}

		const merchant = await Merchant.findById(req.user.id);
		if (!merchant) {
			return res.status(404).json({ message: "Merchant not found" });
		}

		merchant.shopName = shopName.trim();
		merchant.businessCategory = businessCategory;
		merchant.businessDescription = businessDescription?.trim();
		merchant.ownerName = ownerName?.trim();
		merchant.phone = phone?.trim();

		// Handle address (both structured and simple)
		if (address && typeof address === "object") {
			merchant.address = {
				street: address.street?.trim(),
				city: address.city?.trim(),
				state: address.state?.trim(),
				postalCode: address.postalCode?.trim(),
				country: address.country?.trim() || "India",
			};
		}
		if (addressLine) {
			merchant.addressLine = addressLine.trim();
		}

		merchant.onboardingStep = Math.max(merchant.onboardingStep, 1);

		await merchant.save();

		res.json({
			message: "Business information saved",
			onboardingStep: merchant.onboardingStep,
		});
	} catch (error) {
		console.error("saveBusinessInfo error:", error);
		res.status(500).json({ message: "Failed to save business information" });
	}
};

/**
 * POST /api/merchant/onboarding/operating-hours
 * Step 2: Save operating hours
 */
export const saveOperatingHours = async (req, res) => {
	try {
		const { operatingHours } = req.body;

		if (!operatingHours || !Array.isArray(operatingHours)) {
			return res.status(400).json({ message: "Operating hours are required" });
		}

		const merchant = await Merchant.findById(req.user.id);
		if (!merchant) {
			return res.status(404).json({ message: "Merchant not found" });
		}

		// Validate and format operating hours
		const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
		const formattedHours = operatingHours.map((h) => ({
			day: h.day?.toLowerCase(),
			isOpen: h.isOpen !== false,
			openTime: h.openTime || "09:00",
			closeTime: h.closeTime || "21:00",
		})).filter((h) => validDays.includes(h.day));

		merchant.operatingHours = formattedHours;
		merchant.onboardingStep = Math.max(merchant.onboardingStep, 2);

		await merchant.save();

		res.json({
			message: "Operating hours saved",
			onboardingStep: merchant.onboardingStep,
		});
	} catch (error) {
		console.error("saveOperatingHours error:", error);
		res.status(500).json({ message: "Failed to save operating hours" });
	}
};

/**
 * POST /api/merchant/onboarding/categories
 * Step 3: Create initial categories
 */
export const saveCategories = async (req, res) => {
	try {
		const { categories } = req.body;

		if (!categories || !Array.isArray(categories) || categories.length === 0) {
			return res.status(400).json({ message: "At least one category is required" });
		}

		const merchant = await Merchant.findById(req.user.id);
		if (!merchant) {
			return res.status(404).json({ message: "Merchant not found" });
		}

		// Create categories for this merchant
		const categoryDocs = categories.map((cat, index) => ({
			merchantId: req.user.id,
			name: typeof cat === "string" ? cat.trim() : cat.name?.trim(),
			description: typeof cat === "object" ? cat.description?.trim() : undefined,
			color: typeof cat === "object" ? cat.color : undefined,
			displayOrder: index,
		})).filter((cat) => cat.name);

		// Delete existing categories (in case of re-onboarding)
		await Category.deleteMany({ merchantId: req.user.id });

		// Insert new categories
		const createdCategories = await Category.insertMany(categoryDocs, { ordered: false });

		merchant.onboardingStep = Math.max(merchant.onboardingStep, 3);
		await merchant.save();

		res.json({
			message: "Categories saved",
			categories: createdCategories,
			onboardingStep: merchant.onboardingStep,
		});
	} catch (error) {
		console.error("saveCategories error:", error);
		if (error.code === 11000) {
			return res.status(400).json({ message: "Duplicate category names are not allowed" });
		}
		res.status(500).json({ message: "Failed to save categories" });
	}
};

/**
 * POST /api/merchant/onboarding/items
 * Step 4: Create initial items
 */
export const saveItems = async (req, res) => {
	try {
		const { items } = req.body;

		if (!items || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ message: "At least one item is required" });
		}

		const merchant = await Merchant.findById(req.user.id);
		if (!merchant) {
			return res.status(404).json({ message: "Merchant not found" });
		}

		// Get merchant's categories for validation
		const merchantCategories = await Category.find({ merchantId: req.user.id }).lean();
		const categoryMap = new Map(merchantCategories.map((c) => [c._id.toString(), c]));
		const categoryNameMap = new Map(merchantCategories.map((c) => [c.name.toLowerCase(), c]));

		// Prepare items
		const itemDocs = [];
		const errors = [];

		for (let i = 0; i < items.length; i++) {
			const item = items[i];

			if (!item.name || !item.name.trim()) {
				errors.push({ index: i, message: "Item name is required" });
				continue;
			}
			if (item.price === undefined || item.price === null || item.price < 0) {
				errors.push({ index: i, message: "Valid price is required" });
				continue;
			}

			// Find category by ID or name
			let category = null;
			if (item.categoryId) {
				category = categoryMap.get(item.categoryId.toString());
			} else if (item.categoryName) {
				category = categoryNameMap.get(item.categoryName.toLowerCase());
			}

			if (!category) {
				errors.push({ index: i, message: `Invalid category for item "${item.name}"` });
				continue;
			}

			itemDocs.push({
				merchantId: req.user.id,
				categoryId: category._id,
				name: item.name.trim(),
				description: item.description?.trim(),
				price: parseFloat(item.price),
				unit: item.unit || "piece",
				isAvailable: item.isAvailable !== false,
				displayOrder: i,
			});
		}

		if (itemDocs.length === 0) {
			return res.status(400).json({
				message: "No valid items to create",
				errors,
			});
		}

		// Delete existing items (in case of re-onboarding)
		await Item.deleteMany({ merchantId: req.user.id });

		// Insert new items
		const createdItems = await Item.insertMany(itemDocs);

		merchant.onboardingStep = Math.max(merchant.onboardingStep, 4);
		await merchant.save();

		res.json({
			message: `${createdItems.length} items saved`,
			items: createdItems,
			onboardingStep: merchant.onboardingStep,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		console.error("saveItems error:", error);
		res.status(500).json({ message: "Failed to save items" });
	}
};

/**
 * POST /api/merchant/onboarding/complete
 * Mark onboarding as complete
 */
export const completeOnboarding = async (req, res) => {
	try {
		const merchant = await Merchant.findById(req.user.id);
		if (!merchant) {
			return res.status(404).json({ message: "Merchant not found" });
		}

		// Validate minimum requirements
		if (!merchant.shopName || !merchant.businessCategory) {
			return res.status(400).json({
				message: "Please complete business information first",
				requiredStep: 1,
			});
		}

		merchant.isProfileComplete = true;
		merchant.onboardingStep = Math.max(merchant.onboardingStep, 2);
		await merchant.save();

		res.json({
			message: "Onboarding completed successfully",
			isProfileComplete: true,
		});
	} catch (error) {
		console.error("completeOnboarding error:", error);
		res.status(500).json({ message: "Failed to complete onboarding" });
	}
};

/**
 * POST /api/merchant/onboarding/skip
 * Skip onboarding with default values (for demo purposes)
 */
export const skipOnboarding = async (req, res) => {
	try {
		const merchant = await Merchant.findById(req.user.id);
		if (!merchant) {
			return res.status(404).json({ message: "Merchant not found" });
		}

		// Set default business info if not already set
		if (!merchant.shopName) {
			merchant.shopName = "My Shop";
		}
		if (!merchant.businessCategory) {
			merchant.businessCategory = "general_store";
		}

		// Create default categories if none exist
		const categoryCount = await Category.countDocuments({ merchantId: req.user.id });
		if (categoryCount === 0) {
			const defaultCategories = [
				{ merchantId: req.user.id, name: "Food", displayOrder: 0 },
				{ merchantId: req.user.id, name: "Drinks", displayOrder: 1 },
				{ merchantId: req.user.id, name: "Snacks", displayOrder: 2 },
				{ merchantId: req.user.id, name: "Other", displayOrder: 3 },
			];
			await Category.insertMany(defaultCategories);
		}

		// Create a sample item if none exist
		const itemCount = await Item.countDocuments({ merchantId: req.user.id });
		if (itemCount === 0) {
			const firstCategory = await Category.findOne({ merchantId: req.user.id });
			if (firstCategory) {
				await Item.create({
					merchantId: req.user.id,
					categoryId: firstCategory._id,
					name: "Sample Item",
					price: 10,
					description: "This is a sample item. Edit or delete it anytime.",
				});
			}
		}

		merchant.isProfileComplete = true;
		merchant.onboardingStep = 5;
		await merchant.save();

		res.json({
			message: "Onboarding skipped with defaults",
			isProfileComplete: true,
		});
	} catch (error) {
		console.error("skipOnboarding error:", error);
		res.status(500).json({ message: "Failed to skip onboarding" });
	}
};

/**
 * GET /api/merchant/profile/full
 * Get full merchant profile with categories and items count
 */
export const getFullProfile = async (req, res) => {
	try {
		const merchant = await Merchant.findById(req.user.id).lean();
		if (!merchant) {
			return res.status(404).json({ message: "Merchant not found" });
		}

		const [categoryCount, itemCount] = await Promise.all([
			Category.countDocuments({ merchantId: req.user.id }),
			Item.countDocuments({ merchantId: req.user.id, isActive: true }),
		]);

		res.json({
			...merchant,
			stats: {
				categoryCount,
				itemCount,
			},
		});
	} catch (error) {
		console.error("getFullProfile error:", error);
		res.status(500).json({ message: "Failed to fetch profile" });
	}
};
