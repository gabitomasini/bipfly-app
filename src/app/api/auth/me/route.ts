import { NextResponse } from "next/server";
import { getAuthUser, isUserAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    const isAdmin = isUserAdmin(user);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin,
      },
    });
  } catch {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}
