import { SessionOptions } from "iron-session"

export interface SessionData {
  isAdmin: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_SECRET!,
  cookieName: "bolao-admin-session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8, // 8 hours
  },
}
