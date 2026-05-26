import { NextResponse } from 'next/server';
import { syncLocalSinapiFiles } from '../../actions/estimate';

export async function GET() {
  const result = await syncLocalSinapiFiles('SP');
  return NextResponse.json(result);
}
