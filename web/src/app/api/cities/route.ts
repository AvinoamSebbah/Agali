import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all unique cities from stores
    const cities = await prisma.store.findMany({
      select: {
        city: true,
      },
      distinct: ['city'],
      where: {
        city: {
          not: null,
        },
      },
      orderBy: {
        city: 'asc',
      },
    });

    const cityList = cities
      .map(store => store.city)
      .filter(city => city && city !== 'unknown')
      .sort();

    return NextResponse.json({ cities: cityList });
  } catch (error) {
    console.error('Cities fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}
