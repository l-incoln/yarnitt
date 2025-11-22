import { Request, Response } from 'express';
import { User } from '../models/User';

// Get all sellers
export async function getAllSellers(req: Request, res: Response) {
  try {
    const sellers = await User.find({ role: 'seller' }).select('-password');
    return res.status(200).json({ sellers });
  } catch (err: any) {
    console.error('getAllSellers error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Get pending sellers
export async function getPendingSellers(req: Request, res: Response) {
  try {
    const sellers = await User.find({ 
      role: 'seller', 
      sellerStatus: 'pending' 
    }).select('-password');
    return res.status(200).json({ sellers });
  } catch (err: any) {
    console.error('getPendingSellers error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Approve seller
export async function approveSeller(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const seller = await User.findById(id);
    if (!seller) {
      return res.status(404).json({ error: 'seller not found' });
    }
    
    if (seller.role !== 'seller') {
      return res.status(400).json({ error: 'user is not a seller' });
    }
    
    seller.sellerStatus = 'approved';
    await seller.save();
    
    return res.status(200).json({ 
      message: 'Seller approved successfully',
      seller: seller.toJSON()
    });
  } catch (err: any) {
    console.error('approveSeller error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Reject seller
export async function rejectSeller(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const seller = await User.findById(id);
    if (!seller) {
      return res.status(404).json({ error: 'seller not found' });
    }
    
    if (seller.role !== 'seller') {
      return res.status(400).json({ error: 'user is not a seller' });
    }
    
    seller.sellerStatus = 'rejected';
    await seller.save();
    
    return res.status(200).json({ 
      message: 'Seller rejected successfully',
      seller: seller.toJSON()
    });
  } catch (err: any) {
    console.error('rejectSeller error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Ban seller
export async function banSeller(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const seller = await User.findById(id);
    if (!seller) {
      return res.status(404).json({ error: 'seller not found' });
    }
    
    if (seller.role !== 'seller') {
      return res.status(400).json({ error: 'user is not a seller' });
    }
    
    seller.sellerStatus = 'banned';
    await seller.save();
    
    return res.status(200).json({ 
      message: 'Seller banned successfully',
      seller: seller.toJSON()
    });
  } catch (err: any) {
    console.error('banSeller error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}
