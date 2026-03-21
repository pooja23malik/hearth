import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withBoardAuth, isAuthError } from "@/lib/auth";
import { advanceDate, getTodayInTimezone } from "@/lib/recurrence";
import { broadcast } from "@/lib/sse";

// PUT /api/tasks/[id] — Update a task (including completion with recurrence)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await request.json();

  // Validate personal task constraint
  if (body.is_personal && !body.assigned_to) {
    return NextResponse.json(
      { error: "Personal tasks must be assigned to someone" },
      { status: 400 }
    );
  }

  // Handle task completion with optimistic locking
  if (body.status === "completed") {
    return handleCompletion(id, auth, body);
  }

  // Regular update
  try {
    const task = await prisma.task.update({
      where: { id, board_id: auth.board.id },
      data: {
        title: body.title?.trim(),
        description: body.description?.trim() ?? undefined,
        category: body.category ?? undefined,
        estimated_duration_minutes: body.estimated_duration_minutes ?? undefined,
        assigned_to: body.assigned_to ?? undefined,
        is_personal: body.is_personal ?? undefined,
        preferred_time_of_day: body.preferred_time_of_day ?? undefined,
        recurrence_rule: body.recurrence_rule ?? undefined,
        next_due_date: body.next_due_date ? new Date(body.next_due_date) : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar_color: true } },
        creator: { select: { id: true, name: true, avatar_color: true } },
      },
    });

    broadcast(
      auth.board.id,
      "task:updated",
      task,
      task.is_personal ? task.assigned_to ?? undefined : undefined
    );

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

async function handleCompletion(
  taskId: string,
  auth: { board: { id: string; timezone: string | null }; member: { id: string } },
  body: { notes?: string }
) {
  // Optimistic lock: only complete if currently pending
  const result = await prisma.$transaction(async (tx) => {
    // Lock the row and check status
    const task = await tx.task.findFirst({
      where: { id: taskId, board_id: auth.board.id, status: "pending" },
    });

    if (!task) {
      return null; // Already completed or not found
    }

    // Insert history
    await tx.taskHistory.create({
      data: {
        task_id: taskId,
        board_id: auth.board.id,
        completed_by: auth.member.id,
        notes: body.notes?.trim() || null,
      },
    });

    // If recurring: reset status and advance date
    if (task.recurrence_rule) {
      const today = getTodayInTimezone(auth.board.timezone);
      const nextDue = advanceDate(today, task.recurrence_rule);

      return tx.task.update({
        where: { id: taskId },
        data: {
          status: "pending",
          completed_at: new Date(),
          completed_by: auth.member.id,
          next_due_date: nextDue,
        },
        include: {
          assignee: { select: { id: true, name: true, avatar_color: true } },
          creator: { select: { id: true, name: true, avatar_color: true } },
          completer: { select: { id: true, name: true } },
        },
      });
    }

    // Non-recurring: mark completed
    return tx.task.update({
      where: { id: taskId },
      data: {
        status: "completed",
        completed_at: new Date(),
        completed_by: auth.member.id,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar_color: true } },
        creator: { select: { id: true, name: true, avatar_color: true } },
        completer: { select: { id: true, name: true } },
      },
    });
  });

  if (!result) {
    // Task was already completed (optimistic lock failed)
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { completer: { select: { name: true } } },
    });
    return NextResponse.json(
      { error: `Already completed by ${existing?.completer?.name || "someone"}` },
      { status: 409 }
    );
  }

  broadcast(
    auth.board.id,
    "task:completed",
    result,
    result.is_personal ? result.assigned_to ?? undefined : undefined
  );

  return NextResponse.json(result);
}

// DELETE /api/tasks/[id] — Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, board_id: auth.board.id },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Only creator, assignee, or board creator can delete
  const canDelete =
    task.created_by === auth.member.id ||
    task.assigned_to === auth.member.id ||
    auth.member.is_creator;

  if (!canDelete) {
    return NextResponse.json({ error: "Not authorized to delete this task" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id } });

  broadcast(
    auth.board.id,
    "task:deleted",
    { id },
    task.is_personal ? task.assigned_to ?? undefined : undefined
  );

  return NextResponse.json({ success: true });
}
