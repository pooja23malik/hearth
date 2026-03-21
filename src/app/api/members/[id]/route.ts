import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withBoardAuth, isAuthError } from "@/lib/auth";

// DELETE /api/members/[id] — Creator-only: soft-delete a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  if (!auth.member.is_creator) {
    return NextResponse.json({ error: "Only the board creator can remove members" }, { status: 403 });
  }

  const { id } = await params;

  // Can't remove yourself
  if (id === auth.member.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  const target = await prisma.member.findFirst({
    where: { id, board_id: auth.board.id, active: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Soft-delete and reassign tasks in a transaction
  await prisma.$transaction([
    prisma.member.update({
      where: { id },
      data: { active: false },
    }),
    prisma.task.updateMany({
      where: { assigned_to: id, board_id: auth.board.id },
      data: { assigned_to: null, is_personal: false },
    }),
  ]);

  return NextResponse.json({ success: true });
}
