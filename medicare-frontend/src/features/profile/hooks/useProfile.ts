import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
import { QUERY_KEYS, CACHE_TIMES } from "@/config/constants";

export function useProfile() {
  const profile = useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE,
    queryFn: profileApi.getProfile,
    gcTime: CACHE_TIMES.USER_PROFILE,
  });

  return { profile: profile.data, isLoading: profile.isLoading };
}
