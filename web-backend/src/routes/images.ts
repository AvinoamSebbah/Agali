import { Router } from 'express';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// GET /api/products/image/:barcode - Get product image
router.get('/image/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    
    const publicDir = path.join(__dirname, '../../public/images/products');
    const localPath = path.join(publicDir, `${barcode}.jpg`);

    // 1. Check local storage first
    try {
      await fs.access(localPath);
      return res.json({ imageUrl: `http://localhost:3001/images/products/${barcode}.jpg`, source: 'local' });
    } catch {
      // No local image
    }

    // 2. Try OpenFoodFacts
    try {
      const offResponse = await axios.get(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        { timeout: 3000 }
      );
      
      if (offResponse.data.status === 1 && offResponse.data.product.image_url) {
        const imageUrl = offResponse.data.product.image_url;
        
        // Download and save locally
        try {
          await fs.mkdir(publicDir, { recursive: true });
          const imageResponse = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 5000 
          });
          await fs.writeFile(localPath, imageResponse.data);
          return res.json({ imageUrl: `http://localhost:3001/images/products/${barcode}.jpg`, source: 'openfoodfacts' });
        } catch (downloadError) {
          return res.json({ imageUrl, source: 'openfoodfacts-direct' });
        }
      }
    } catch (err) {
      // OpenFoodFacts failed, continue
    }

    // 3. Try Pricez
    const pricezUrl = `https://m.pricez.co.il/ProductPictures/200x/${barcode}.jpg`;
    try {
      await fs.mkdir(publicDir, { recursive: true });
      const imageResponse = await axios.get(pricezUrl, { 
        responseType: 'arraybuffer',
        timeout: 5000,
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://m.pricez.co.il/'
        }
      });
      
      if (imageResponse.status === 200 && imageResponse.data) {
        await fs.writeFile(localPath, imageResponse.data);
        return res.json({ imageUrl: `http://localhost:3001/images/products/${barcode}.jpg`, source: 'pricez' });
      }
    } catch (err: any) {
      // Pricez failed
    }

    // No image found
    res.json({ imageUrl: null, source: 'none' });
  } catch (error) {
    console.error('[IMAGE] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
