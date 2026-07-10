import { auth } from "@/auth";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.error("AUTH_SECRET is not defined");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const token = jwt.sign(
      { userId: session.user.id },
      secret,
      { expiresIn: "1h" }
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating socket token:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
