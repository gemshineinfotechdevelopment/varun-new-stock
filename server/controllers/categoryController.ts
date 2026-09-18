import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { AuthRequest } from '../middleware/authMiddleware';

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    // Calculate product counts per category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({ category: cat.name });
        return {
          _id: cat._id,
          name: cat.name,
          description: cat.description,
          productCount: count,
          createdAt: cat.createdAt,
        };
      })
    );

    res.json({ success: true, count: categoriesWithCount.length, data: categoriesWithCount });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Category name is required' });
      return;
    }

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      res.status(400).json({ success: false, message: 'Category already exists' });
      return;
    }

    const category = await Category.create({
      name: name.trim(),
      description: (description || '').trim(),
    });

    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const oldName = category.name;
    if (name && name.trim()) {
      category.name = name.trim();
    }
    if (description !== undefined) {
      category.description = description.trim();
    }

    await category.save();

    // If category name changed, update products using this category
    if (oldName !== category.name) {
      await Product.updateMany({ category: oldName }, { category: category.name });
    }

    res.json({ success: true, message: 'Category updated', data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const inUse = await Product.countDocuments({ category: category.name });
    if (inUse > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete category '${category.name}' because it contains ${inUse} products. Reassign the products first.`,
      });
      return;
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
