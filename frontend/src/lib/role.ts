export type Role = "worker" | "company";
const KEY = "corex_role";

export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "worker" || v === "company" ? v : null;
}

export function setRole(role: Role) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, role);
}

export function clearRole() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
