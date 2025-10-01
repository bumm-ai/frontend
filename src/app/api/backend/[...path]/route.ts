import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://69.62.126.240:8081';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'DELETE');
}

/*export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Handle CORS preflight requests
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
      'Access-Control-Max-Age': '86400',
    },
  });
}*/

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join('/');
    const url = `${BACKEND_URL}/${path}`;
    
    console.log(`🔄 Proxying ${method} request to: ${url}`);
    
    // Get headers from original request
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Copy x-user-id header if it exists
    const userId = request.headers.get('x-user-id');
    if (userId) {
      headers['x-user-id'] = userId;
    }
    
    // Get request body
    let body: string | undefined;
    if (method !== 'GET') {
      body = await request.text();
    }
    
    // Make request to backend
    const response = await fetch(url, {
      method,
      headers,
      body,
    });
    
    console.log(`📡 Backend response: ${response.status} ${response.statusText}`);
    
    // Get response data
    const data = await response.text();
    
    // Return response with correct headers
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
      },
    });
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
