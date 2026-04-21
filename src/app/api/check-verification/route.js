import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { uid } = await request.json();
    
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch user document
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    
    return NextResponse.json({
      isVerified: userData.isVerified || false,
      verificationStatus: userData.verificationStatus || 'none'
    });
    
  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
