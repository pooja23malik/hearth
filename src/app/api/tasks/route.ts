import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withBoardAuth, isAuthError } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

// GET /api/tasks — List tasks with personal filtering and sorting
export async function GET(request: NextRequest) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  const tab = request.nextUrl.searchParams.get("tab") || "all";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    board_id: auth.board.id,
    OR: [
      { is_personal: false },
      { is_personal: true, assigned_to: auth.member.id },
    ],
  };

  if (tab === "my") {
    where.assigned_to = auth.member.id;
  } else if (tab === "overdue") {
    where.status = "pending";
    where.next_due_date = { lt: new Date() };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, avatar_color: true } },
      creator: { select: { id: true, name: true, avatar_color: true } },
      completer: { select: { id: true, name: true } },
    },
    orderBy: [
      // Overdue first (pending tasks with past due dates)
      { status: "asc" }, // pending before completed
      { next_due_date: "asc" }, // soonest due first (nulls last by default)
      { created_at: "asc" },
    ],
  });

  return NextResponse.json(tasks);
}

// POST /api/tasks — Create a new task
export async function POST(request: NextRequest) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (body.is_personal && !body.assigned_to) {
      return NextResponse.json(
        { error: "Personal tasks must be assigned to someone" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        board_id: auth.board.id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        category: body.category || "other",
        estimated_duration_minutes: body.estimated_duration_minutes || null,
        assigned_to: body.assigned_to || null,
        is_personal: body.is_personal || false,
        preferred_time_of_day: body.preferred_time_of_day || "anytime",
        recurrence_rule: body.recurrence_rule || null,
        next_due_date: body.next_due_date ? new Date(body.next_due_date) : null,
        created_by: auth.member.id,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar_color: true } },
        creator: { select: { id: true, name: true, avatar_color: true } },
      },
    });

    // Broadcast to board (or only to owner if personal)
    broadcast(
      auth.board.id,
      "task:created",
      task,
      task.is_personal ? task.assigned_to ?? undefined : undefined
    );

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
