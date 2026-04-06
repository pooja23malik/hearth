import { NextRequest, NextResponse } from "next/server";
import { withBoardAuth, isAuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";

// DELETE — remove a single value (creator only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; valueId: string }> }
) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  if (!auth.member.is_creator) {
    return NextResponse.json(
      { error: "Only the board creator can remove values" },
      { status: 403 }
    );
  }

  const { valueId } = await params;

  const value = await prisma.boardValue.findFirst({
    where: { id: valueId, board_id: auth.board.id },
  });

  if (!value) {
    return NextResponse.json({ error: "Value not found" }, { status: 404 });
  }

  // Delete the value. DigestValueScore rows referencing it are retained
  // via onDelete: Cascade on the relation, but we keep them for history.
  // Actually, cascade will delete them. For v1 this is acceptable since
  // historical digests are cached as complete snapshots.
  await prisma.boardValue.delete({ where: { id: valueId } });

  return NextResponse.json({ success: true });
}
