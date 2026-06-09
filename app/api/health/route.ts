import { prisma } from '../../../lib/prisma';
import { NextResponse } from 'next/server';

// Health check endpoint — keeps Supabase database alive
// Called automatically by Vercel Cron every 5 days
export async function GET() {
    try {
        const result = await prisma.$queryRaw`SELECT 1 as ping`;
        return NextResponse.json({ 
            status: 'ok', 
            database: 'connected',
            timestamp: new Date().toISOString(),
            result 
        });
    } catch (error: any) {
        return NextResponse.json({ 
            status: 'error', 
            database: 'disconnected',
            message: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
