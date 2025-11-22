import { Request, Response } from 'express';
import Product from '../models/product';
import Seller from '../models/Seller';
import Category from '../models/Category';

// Create Product (Approved Sellers Only)
export async function createProduct(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can create products',
      });
    }

    // Find seller profile
    const seller = await Seller.findOne({ userId: req.user.userId });
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    // Check approval status
    if (seller.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your seller account must be approved to create products',
      });
    }

    const {
      categoryId,
      title,
      description,
      materials,
      sustainabilityNotes,
      price,
      compareAtPrice,
      stock,
      images,
      tags,
      ecoFriendly,
      customizationOptions,
      estimatedDeliveryDays,
    } = req.body;

    // Validation
    if (!categoryId || !title || !description || !price || !images || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category, title, description, price, and at least one image are required',
      });
    }

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Create product
    const product = await Product.create({
      sellerId: seller._id,
      categoryId,
      title,
      description,
      materials,
      sustainabilityNotes,
      price,
      compareAtPrice,
      stock: stock || 0,
      images,
      thumbnailImage: images[0], // Auto-set from first image
      tags: tags || [],
      ecoFriendly: ecoFriendly || false,
      customizationOptions,
      estimatedDeliveryDays,
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: {
        id: product._id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        stock: product.stock,
        images: product.images,
      },
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating product',
    });
  }
}

// List Products with Filtering and Pagination
export async function listProducts(req: Request, res: Response) {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      ecoFriendly,
      isFeatured,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter
    const filter: any = { isActive: true };

    if (category) {
      filter.categoryId = category;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (ecoFriendly === 'true') {
      filter.ecoFriendly = true;
    }

    if (isFeatured === 'true') {
      filter.isFeatured = true;
    }

    // Text search
    if (search) {
      filter.$text = { $search: search as string };
    }

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortField = sortBy as string;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortDirection };

    // Query with population
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('sellerId', 'shopName rating logo')
        .populate('categoryId', 'name slug')
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('List products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
    });
  }
}

// Get Single Product
export async function getProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('sellerId', 'shopName bio rating totalSales logo banner socialLinks valueTags')
      .populate('categoryId', 'name slug description')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Increment view count (don't await to not slow down response)
    Product.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec();

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error('Get product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
    });
  }
}

// Update Product (Owner Only)
export async function updateProduct(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can update products',
      });
    }

    const { id } = req.params;

    // Find product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Find seller profile
    const seller = await Seller.findOne({ userId: req.user.userId });
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    // Check ownership
    if (product.sellerId.toString() !== seller._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own products',
      });
    }

    // Check approval status
    if (seller.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your seller account must be approved to update products',
      });
    }

    const {
      categoryId,
      title,
      description,
      materials,
      sustainabilityNotes,
      price,
      compareAtPrice,
      stock,
      images,
      tags,
      ecoFriendly,
      customizationOptions,
      estimatedDeliveryDays,
      isActive,
    } = req.body;

    // Update fields if provided
    if (categoryId !== undefined) {
      // Verify category exists
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }
      product.categoryId = categoryId;
    }

    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (materials !== undefined) product.materials = materials;
    if (sustainabilityNotes !== undefined) product.sustainabilityNotes = sustainabilityNotes;
    if (price !== undefined) product.price = price;
    if (compareAtPrice !== undefined) product.compareAtPrice = compareAtPrice;
    if (stock !== undefined) product.stock = stock;
    if (images !== undefined && images.length > 0) {
      product.images = images;
      product.thumbnailImage = images[0];
    }
    if (tags !== undefined) product.tags = tags;
    if (ecoFriendly !== undefined) product.ecoFriendly = ecoFriendly;
    if (customizationOptions !== undefined) product.customizationOptions = customizationOptions;
    if (estimatedDeliveryDays !== undefined) product.estimatedDeliveryDays = estimatedDeliveryDays;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: {
        id: product._id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        stock: product.stock,
        isActive: product.isActive,
      },
    });
  } catch (error: any) {
    console.error('Update product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating product',
    });
  }
}

// Delete Product (Owner Only)
export async function deleteProduct(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can delete products',
      });
    }

    const { id } = req.params;

    // Find product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Find seller profile
    const seller = await Seller.findOne({ userId: req.user.userId });
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    // Check ownership
    if (product.sellerId.toString() !== seller._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own products',
      });
    }

    // Delete product
    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting product',
    });
  }
}

// Get Seller's Products
export async function getSellerProducts(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can access this endpoint',
      });
    }

    // Find seller profile
    const seller = await Seller.findOne({ userId: req.user.userId });
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const {
      page = 1,
      limit = 20,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter
    const filter: any = { sellerId: seller._id };

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortField = sortBy as string;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortDirection };

    // Query
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('categoryId', 'name slug')
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get seller products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
    });
  }
}
