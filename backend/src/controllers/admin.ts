import { Request, Response } from 'express';
import { User, IUser } from '../models/User';

// Helper function to validate and get seller
async function validateSeller(id: string): Promise<IUser | null> {
  const seller = await User.findById(id);
  if (!seller) {
    return null;
  }
  if (seller.role !== 'seller') {
    return null;
  }
  return seller;
}

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
    
    const seller = await validateSeller(id);
    if (!seller) {
      return res.status(404).json({ error: 'seller not found' });
    }
    
    seller.sellerStatus = 'approved';
    await seller.save();
    
    const sellerData = seller.toObject();
    delete sellerData.password;
    
    return res.status(200).json({ 
      message: 'Seller approved successfully',
      seller: sellerData
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
    
    const seller = await validateSeller(id);
    if (!seller) {
      return res.status(404).json({ error: 'seller not found' });
    }
    
    seller.sellerStatus = 'rejected';
    await seller.save();
    
    const sellerData = seller.toObject();
    delete sellerData.password;
    
    return res.status(200).json({ 
      message: 'Seller rejected successfully',
      seller: sellerData
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
    
    const seller = await validateSeller(id);
    if (!seller) {
      return res.status(404).json({ error: 'seller not found' });
    }
    
    seller.sellerStatus = 'banned';
    await seller.save();
    
    const sellerData = seller.toObject();
    delete sellerData.password;
    
    return res.status(200).json({ 
      message: 'Seller banned successfully',
      seller: sellerData
    });
  } catch (err: any) {
    console.error('banSeller error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}
