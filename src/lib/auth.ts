import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./db";

const MEMBER_COOKIE = "memberId";
const BOARD_COOKIE = "boardId";

export async function getMemberId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(MEMBER_COOKIE)?.value ?? null;
}

export async function getBoardId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(BOARD_COOKIE)?.value ?? null;
}

export function setMemberCookie(
  response: NextResponse,
  memberId: string,
  boardId: string
): NextResponse {
  response.cookies.set(MEMBER_COOKIE, memberId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
  response.cookies.set(BOARD_COOKIE, boardId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export function getMemberIdFromRequest(request: NextRequest): string | null {
  return request.cookies.get(MEMBER_COOKIE)?.value ?? null;
}

export function getBoardIdFromRequest(request: NextRequest): string | null {
  return request.cookies.get(BOARD_COOKIE)?.value ?? null;
}

export type BoardAuth = {
  board: { id: string; name: string; timezone: string | null; invite_token: string };
  member: { id: string; name: string; board_id: string; is_creator: boolean; avatar_color: string };
};

/**
 * Extracts boardId and memberId from cookies, validates membership.
 * Returns { board, member } or a NextResponse error.
 */
export async function withBoardAuth(
  request: NextRequest
): Promise<BoardAuth | NextResponse> {
  const memberId = getMemberIdFromRequest(request);
  const boardId = getBoardIdFromRequest(request);

  if (!memberId || !boardId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, board_id: boardId, active: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Not a member of this board" }, { status: 403 });
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return { board, member };
}

export function isAuthError(
  result: BoardAuth | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
