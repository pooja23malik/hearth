import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/board/[token] — Resolve invite token to board
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const board = await prisma.board.findUnique({
    where: { invite_token: token },
    include: {
      members: {
        where: { active: true },
        select: { id: true, name: true, avatar_color: true, is_creator: true },
      },
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: board.id,
    name: board.name,
    invite_token: board.invite_token,
    timezone: board.timezone,
    members: board.members,
  });
}
