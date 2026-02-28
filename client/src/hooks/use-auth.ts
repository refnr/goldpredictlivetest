import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserResponse, LoginInput, RegisterInput, UpdateProfileInput } from "@shared/models/auth";
import { apiRequest } from "@/lib/queryClient";

async function fetchUser(): Promise<UserResponse | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<UserResponse | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      queryClient.removeQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.removeQueries({ queryKey: ["/api/predictions/usage"] });
      queryClient.removeQueries({ queryKey: ["/api/signals"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      queryClient.removeQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.removeQueries({ queryKey: ["/api/predictions/usage"] });
      queryClient.removeQueries({ queryKey: ["/api/signals"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.removeQueries({ queryKey: ["/api/predictions/usage"] });
      queryClient.removeQueries({ queryKey: ["/api/signals"] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileInput) => {
      const res = await apiRequest("PUT", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutate,
    updateProfile: updateProfileMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    updateProfileError: updateProfileMutation.error,
  };
}
