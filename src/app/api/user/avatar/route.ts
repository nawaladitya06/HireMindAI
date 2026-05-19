import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getStorageProvider } from "@/lib/storage";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const storage = getStorageProvider();
    const path = `avatars/${session.user.id}`;
    
    // Upload file
    const { url } = await storage.uploadFile(file, path);

    // Save metadata to D1
    const db = getDb();
    await db.update(users).set({
      image: url
    }).where(eq(users.id, session.user.id));
    
    return NextResponse.json({ 
      success: true, 
      url: url,
      message: "Avatar updated successfully" 
    });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
