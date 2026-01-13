export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Simple password login URL
export const getLoginUrl = (redirectTo?: string) => {
  return redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
};
