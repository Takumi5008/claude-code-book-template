import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const videos = await prisma.video.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(videos);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;

  if (!file || !title || !category) {
    return NextResponse.json({ error: "file, title, category は必須です" }, { status: 400 });
  }

  const blob = await put(`videos/${category}-${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  // 同カテゴリの既存動画は上書き（最新1本のみ保持）
  await prisma.video.deleteMany({ where: { category } });

  const video = await prisma.video.create({
    data: { title, category, url: blob.url },
  });

  return NextResponse.json(video);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.video.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
