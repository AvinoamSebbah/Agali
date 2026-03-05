import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = parseInt(params.id);

    if (isNaN(storeId)) {
      return NextResponse.json(
        { error: 'Invalid store ID' },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        chainName: true,
        storeName: true,
        address: true,
        city: true,
        zipCode: true,
        storeType: true,
        chainId: true,
        storeId: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error('Store fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
