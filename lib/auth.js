import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getToken() {
  const session = await getSession();
  return session?.access_token || null;
}

export async function apiFetch(endpoint, options = {}) {
  const token = await getToken();
  if (!token) throw new Error("No autenticado");
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) throw new Error("Sesion expirada");
  if (res.status === 403) throw new Error("No autorizado");
  return res.json();
}
