import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth(options?: { redirectOnUnauthenticated?: boolean; redirectPath?: string }) {
  const [, navigate] = useLocation();
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const logoutMutation = trpc.auth.logout.useMutation();

  const user = meQuery.data ?? null;
  const loading = meQuery.isLoading;
  const error = meQuery.error;
  const isAuthenticated = !!user;

  useEffect(() => {
    if (!loading && !isAuthenticated && options?.redirectOnUnauthenticated) {
      navigate(options.redirectPath ?? "/");
    }
  }, [loading, isAuthenticated, options?.redirectOnUnauthenticated, options?.redirectPath]);

  async function logout() {
    await logoutMutation.mutateAsync();
    meQuery.refetch();
    navigate("/");
  }

  return { user, loading, error, isAuthenticated, logout, refresh: meQuery.refetch };
}
