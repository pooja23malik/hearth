import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withBoardAuth, isAuthError } from "@/lib/auth";
import { randomUUID } from "crypto";

// POST /api/board/[token]/regenerate — Creator-only: regenerate invite token
export async function POST(request: NextRequest) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  if (!auth.member.is_creator) {
    return NextResponse.json({ error: "Only the board creator can do this" }, { status: 403 });
  }

  const newToken = randomUUID();

  await prisma.board.update({
    where: { id: auth.board.id },
    data: { invite_token: newToken },
  });

  return NextResponse.json({ invite_token: newToken });
}
