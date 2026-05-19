import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { codingSubmissions } from "@/db/schema";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { language, code, status, runtime, memory, score } = await req.json();

    const db = getDb();
    await db.insert(codingSubmissions).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      language,
      code,
      status,
      runtime,
      memory,
      score,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Submission saved successfully" });
  } catch (error) {
    console.error("Submission Error:", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }
}
