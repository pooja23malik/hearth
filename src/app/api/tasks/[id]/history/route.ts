import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withBoardAuth, isAuthError } from "@/lib/auth";

// GET /api/tasks/[id]/history — Get completion history for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  // Verify the task belongs to this board and is accessible
  const task = await prisma.task.findFirst({
    where: {
      id,
      board_id: auth.board.id,
      OR: [
        { is_personal: false },
        { is_personal: true, assigned_to: auth.member.id },
      ],
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const history = await prisma.taskHistory.findMany({
    where: { task_id: id },
    include: {
      completer: { select: { name: true, avatar_color: true } },
    },
    orderBy: { completed_at: "desc" },
  });

  return NextResponse.json(history);
}
