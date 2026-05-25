import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const session = await auth();
  const token = await getToken({ 
    req, 
    secret: process.env.AUTH_SECRET || "candidra_ai_temporary_secret_key_12345!@#",
    secureCookie: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
    salt: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token"
  });
  
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll().map(c => `${c.name}=${c.value.substring(0, 5)}...`);
  
  const headersList = await headers();
  const allHeaders: Record<string, string> = {};
  headersList.forEach((v, k) => { allHeaders[k] = v; });

  return NextResponse.json({
    session,
    hasSession: !!session,
    rawToken: token,
    cookies: allCookies,
    headers: allHeaders,
    url: req.url,
  });
}
