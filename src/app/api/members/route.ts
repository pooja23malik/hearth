import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setMemberCookie, getBoardIdFromRequest } from "@/lib/auth";

const AVATAR_COLORS = [
  "#D4604A", // coral
  "#2B8A8A", // teal
  "#7C5CBF", // purple
  "#C4890E", // amber
  "#5A8A5A", // sage
  "#4A8AB5", // sky
  "#B54A6D", // rose
  "#8A8A7A", // stone
];

// GET /api/members — List active members for current board
export async function GET(request: NextRequest) {
  const boardId = getBoardIdFromRequest(request);

  if (!boardId) {
    return NextResponse.json({ error: "No board selected" }, { status: 400 });
  }

  const members = await prisma.member.findMany({
    where: { board_id: boardId, active: true },
    select: { id: true, name: true, avatar_color: true, is_creator: true },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json(members);
}

// POST /api/members — Create a new member or select an existing one
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, avatar_color, board_id, member_id } = body;

    if (!board_id) {
      return NextResponse.json({ error: "Board ID is required" }, { status: 400 });
    }

    // Selecting an existing member
    if (member_id) {
      const member = await prisma.member.findFirst({
        where: { id: member_id, board_id, active: true },
      });
      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      const response = NextResponse.json(member);
      return setMemberCookie(response, member.id, board_id);
    }

    // Creating a new member
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const board = await prisma.board.findUnique({ where: { id: board_id } });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check if this is the first member (creator)
    const memberCount = await prisma.member.count({ where: { board_id } });
    const isCreator = memberCount === 0;

    const color = avatar_color && AVATAR_COLORS.includes(avatar_color)
      ? avatar_color
      : AVATAR_COLORS[memberCount % AVATAR_COLORS.length];

    const member = await prisma.member.create({
      data: {
        board_id,
        name: name.trim(),
        avatar_color: color,
        is_creator: isCreator,
      },
    });

    const response = NextResponse.json(member, { status: 201 });
    return setMemberCookie(response, member.id, board_id);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A member with that name already exists on this board" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
  }
}
