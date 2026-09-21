import { cookies } from "next/headers";
import crypto from "crypto";
import { createSession, deleteSessionByToken, findSessionByToken } from "./db";
import { User } from "./types";

export const SESSION_COOKIE_NAME = "session_token";
export const SESSION_MAX_AGE_SECONDS = 60 * 24 * 60 * 60; // 60 dias

/**
 * Gera um token de sessão criptograficamente seguro (64 caracteres hex)
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Gera um código OTP de 6 dígitos criptograficamente seguro
 */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Cria uma sessão no banco de dados e define o cookie HTTP-only na resposta
 */
export async function createAndSetSession(userId: number): Promise<string> {
  const token = generateSessionToken();
  await createSession(userId, token, 60);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return token;
}

/**
 * Remove o cookie de sessão e invalida o token no banco de dados
 */
export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (tokenCookie && tokenCookie.value) {
    await deleteSessionByToken(tokenCookie.value);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Obtém o usuário autenticado a partir dos cookies da requisição atual (Server Components / Route Handlers)
 */
export async function getAuthUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!tokenCookie || !tokenCookie.value) {
      return null;
    }

    const sessionData = await findSessionByToken(tokenCookie.value);
    if (!sessionData) {
      return null;
    }

    return sessionData.user;
  } catch {
    return null;
  }
}

/**
 * Verifica se um usuário possui privilégios de administrador.
 * Se ADMIN_EMAILS não estiver configurada, retorna true (compatibilidade retroativa / dev mode).
 * Se ADMIN_EMAILS estiver configurada, verifica se o e-mail do usuário consta na lista.
 */
export function isUserAdmin(user: User | null): boolean {
  if (!user) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) return true;
  return adminEmails.includes(user.email.toLowerCase());
}

