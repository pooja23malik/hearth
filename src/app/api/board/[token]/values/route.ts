import { NextRequest, NextResponse } from "next/server";
import { withBoardAuth, isAuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TaskCategory } from "@prisma/client";

const PRESET_VALUES: Array<{ name: string; category: TaskCategory }> = [
  { name: "Clean home", category: "home_maintenance" },
  { name: "Health & wellness", category: "health" },
  { name: "Errands & logistics", category: "errands" },
  { name: "Personal growth", category: "personal" },
  { name: "Other", category: "other" },
];

// GET — return board values
export async function GET(request: NextRequest) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  const values = await prisma.boardValue.findMany({
    where: { board_id: auth.board.id },
    orderBy: { priority: "asc" },
  });

  return NextResponse.json({ values, presets: PRESET_VALUES });
}

// POST — upsert board values (creator only)
export async function POST(request: NextRequest) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  if (!auth.member.is_creator) {
    return NextResponse.json(
      { error: "Only the board creator can set values" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { values } = body as {
    values: Array<{ name: string; category: TaskCategory; priority: number }>;
  };

  if (!values || values.length < 3 || values.length > 5) {
    return NextResponse.json(
      { error: "Please select 3 to 5 values" },
      { status: 400 }
    );
  }

  // Validate categories
  const validCategories = new Set(PRESET_VALUES.map((p) => p.category));
  for (const v of values) {
    if (!validCategories.has(v.category)) {
      return NextResponse.json(
        { error: `Invalid category: ${v.category}` },
        { status: 400 }
      );
    }
  }

  // Check for duplicate categories
  const categories = values.map((v) => v.category);
  if (new Set(categories).size !== categories.length) {
    return NextResponse.json(
      { error: "Duplicate categories are not allowed" },
      { status: 400 }
    );
  }

  // Upsert: delete all existing values and recreate
  await prisma.$transaction(async (tx) => {
    await tx.boardValue.deleteMany({ where: { board_id: auth.board.id } });
    await tx.boardValue.createMany({
      data: values.map((v) => ({
        board_id: auth.board.id,
        name: v.name,
        category: v.category,
        priority: v.priority,
      })),
    });
  });

  const updated = await prisma.boardValue.findMany({
    where: { board_id: auth.board.id },
    orderBy: { priority: "asc" },
  });

  return NextResponse.json({ values: updated });
}
