import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useProfileStore } from "../store/profileStore";
import { authApi } from "@/features/auth/api/authApi";
import { useToast } from "@/store/toastStore";
import { env } from "@/config/env";

export default function ProfileHeader() {
  const { user, setUser } = useAuthStore();
  const { userInfo, lastSaved } = useProfileStore();
  const [imgError, setImgError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const displayName = userInfo.full_name || user?.first_name
    ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
    : user?.username || "User";
  const email = user?.email || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = user?.created_at
    ? new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(user.created_at))
    : "Recently";

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    try {
      setIsUploading(true);
      const res = await authApi.uploadAvatar(file);
      if (user) {
        setUser({ ...user, profile_picture_url: res.profile_picture_url });
        toast.success("Profile picture updated!");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const avatarUrl = user?.profile_picture_url 
    ? `${env.API_URL}${user.profile_picture_url}` 
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.surface[2]} 0%, ${theme.colors.surface[1]} 100%)`,
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${theme.colors.accent.primary}, ${theme.colors.health.strain.DEFAULT}, ${theme.colors.health.sleep.DEFAULT})`,
        }}
      />

      {/* Always horizontal layout — compact on mobile */}
      <div className="p-4 sm:p-6 lg:p-8 flex flex-row items-center gap-3 sm:gap-5">
        {/* Avatar — smaller on mobile */}
        <div className="relative shrink-0 group">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*" 
          />
          <button
            onClick={handleAvatarClick}
            disabled={isUploading}
            className="w-14 h-14 sm:w-20 sm:h-20 lg:w-[100px] lg:h-[100px] rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden relative transition-transform hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.accent.primary}20, ${theme.colors.accent.primary}08)`,
              border: `2px solid ${theme.colors.accent.border}`,
              boxShadow: theme.shadows.accent,
            }}
          >
            {isUploading ? (
              <i className="fas fa-spinner-third animate-spin text-xl sm:text-2xl" style={{ color: theme.colors.accent.primary }} />
            ) : avatarUrl && !imgError ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : userInfo.full_name || user?.first_name ? (
              <span
                className="text-lg sm:text-2xl lg:text-3xl font-black"
                style={{ color: theme.colors.accent.primary }}
              >
                {initials}
              </span>
            ) : (
              <i
                className="fas fa-user text-lg sm:text-2xl lg:text-3xl"
                style={{ color: theme.colors.accent.primary, opacity: 0.6 }}
              />
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <i className="fas fa-camera text-white text-lg sm:text-xl"></i>
            </div>
          </button>

          {/* Online indicator */}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center"
            style={{
              background: theme.colors.surface[1],
              border: `2px solid ${theme.colors.surface[2]}`,
            }}
          >
            <div
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse-dot"
              style={{ background: theme.colors.health.recovery.DEFAULT }}
            />
          </div>
        </div>

        {/* Info — left-aligned always */}
        <div className="flex-1 min-w-0">
          <h1
            className="font-black text-base sm:text-xl lg:text-2xl truncate"
            style={{ color: theme.colors.text.primary }}
          >
            {displayName}
          </h1>
          <p
            className="text-xs sm:text-sm truncate mt-0.5"
            style={{ color: theme.colors.text.muted }}
          >
            {email}
          </p>
          <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-3 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold"
              style={{
                background: theme.colors.accent.subtle,
                color: theme.colors.accent.primary,
                border: `1px solid ${theme.colors.accent.border}`,
              }}
            >
              <i className="fas fa-shield-check text-[8px] sm:text-[10px]" />
              {user?.email_verified ? "Verified" : "Unverified"}
            </span>
            <span
              className="text-[10px] sm:text-xs"
              style={{ color: theme.colors.text.subtle }}
            >
              <i className="fas fa-calendar-alt mr-1 opacity-60" />
              Since {memberSince}
            </span>
          </div>
        </div>

        {/* Last saved indicator — desktop only */}
        {lastSaved && (
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: theme.colors.health.recovery.bg,
              border: `1px solid ${theme.colors.health.recovery.border}`,
            }}
          >
            <i
              className="fas fa-cloud-check text-[10px]"
              style={{ color: theme.colors.health.recovery.DEFAULT }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: theme.colors.health.recovery.DEFAULT }}
            >
              Saved
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export { ProfileHeader };
