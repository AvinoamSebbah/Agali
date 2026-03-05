import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/stores/:id - Get store details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const store = await prisma.store.findUnique({
      where: { id: parseInt(id) }
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json(store);
  } catch (error) {
    console.error('Store fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
