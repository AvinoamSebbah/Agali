import { NextRequest, NextResponse } from 'next/server';
import { writeFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import axios from 'axios';

const PRICEZ_IMAGE_BASE_URL = 'https://m.pricez.co.il/ProductPictures/200x';
const LOCAL_IMAGE_DIR = path.join(process.cwd(), 'public', 'images', 'products');

export async function GET(
  request: NextRequest,
  { params }: { params: { barcode: string } }
) {
  try {
    const barcode = params.barcode;
    
    if (!barcode || !/^\d+$/.test(barcode)) {
      return NextResponse.json(
        { error: 'Invalid barcode' },
        { status: 400 }
      );
    }

    const localImagePath = path.join(LOCAL_IMAGE_DIR, `${barcode}.jpg`);
    const publicPath = `/images/products/${barcode}.jpg`;

    // Check if image exists locally (cached)
    try {
      await access(localImagePath, constants.F_OK);
      // Image exists locally, return the local URL
      return NextResponse.json({
        imageUrl: publicPath,
        source: 'local-cache',
      });
    } catch {
      // Image not cached, try to fetch and cache it
    }

    // Try OpenFoodFacts first
    try {
      const response = await axios.get(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        { timeout: 5000 }
      );

      if (response.data.status === 1 && response.data.product?.image_url) {
        const imageUrl = response.data.product.image_url;
        
        // Download and cache the image
        try {
          const imageResponse = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 10000 
          });
          await writeFile(localImagePath, Buffer.from(imageResponse.data));
          console.log(`✓ Cached image from OpenFoodFacts: ${barcode}`);
        } catch (cacheError) {
          console.error('Failed to cache OpenFoodFacts image:', cacheError);
        }
        
        return NextResponse.json({
          imageUrl: imageUrl,
          source: 'openfoodfacts',
        });
      }
    } catch (error) {
      console.log('OpenFoodFacts fetch failed, trying Pricez...');
    }

    // Fallback to Pricez - try to download and cache it
    const pricezUrl = `${PRICEZ_IMAGE_BASE_URL}/${barcode}.jpg`;
    
    try {
      const response = await axios.get(pricezUrl, { 
        responseType: 'arraybuffer',
        timeout: 10000,
        validateStatus: (status) => status === 200
      });
      
      // Save to local cache
      await writeFile(localImagePath, Buffer.from(response.data));
      console.log(`✓ Cached image from Pricez: ${barcode}`);
      
      return NextResponse.json({
        imageUrl: publicPath,
        source: 'pricez-cached',
      });
    } catch (pricezError) {
      // Pricez doesn't have the image or failed to download
      console.log(`Image not found for barcode: ${barcode}`);
      return NextResponse.json({
        imageUrl: '/images/placeholder.jpg',
        source: 'placeholder',
      });
    }
  } catch (error) {
    console.error('Image fetch error:', error);
    return NextResponse.json({
      imageUrl: '/images/placeholder.jpg',
      source: 'error',
    });
  }
}
