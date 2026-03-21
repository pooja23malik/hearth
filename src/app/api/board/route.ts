import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/board — Create a new board
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Board name is required" }, { status: 400 });
    }

    const board = await prisma.board.create({
      data: {
        name,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    return NextResponse.json({
      id: board.id,
      name: board.name,
      invite_token: board.invite_token,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create board" }, { status: 500 });
  }
}
