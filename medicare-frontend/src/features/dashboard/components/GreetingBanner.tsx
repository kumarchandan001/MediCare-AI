import { useEffect, useState } from "react";
import { theme } from "@/config/theme";
import { useAuthStore } from "@/features/auth/store/authStore";

interface GreetingBannerProps {
  insight?: string;
}

export function GreetingBanner({ insight }: GreetingBannerProps) {
  const { user } = useAuthStore();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const update = () => {
      const h = new Date().getHours();
      if (h < 12) setGreeting("Good Morning");
      else if (h < 17) setGreeting("Good Afternoon");
      else if (h < 21) setGreeting("Good Evening");
      else setGreeting("Good Night");
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="relative rounded-2xl p-7 mb-6 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.surface[2]} 0%, rgba(0,245,200,0.04) 100%)`,
        border: `1px solid rgba(0,245,200,0.08)`,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute top-[-60px] right-[-60px] w-[200px] h-[200px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${theme.colors.accent.subtle}, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
        {/* Left: greeting */}
        <div>
          <h2
            className="font-black tracking-tight mb-1"
            style={{
              fontSize: theme.typography.sizes.h1,
              color: theme.colors.text.primary,
            }}
          >
            {greeting}
            {user?.first_name ? `, ${user.first_name}!` : "! 👋"}
          </h2>
          <p
            style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.muted,
            }}
          >
            Here's your health intelligence summary for today
          </p>
        </div>

        {/* Right: AI insight pill */}
        {insight && (
          <div
            className="flex items-center gap-3 rounded-xl px-5 py-4 max-w-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${theme.colors.border[2]}`,
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: theme.colors.accent.subtle,
                border: `1px solid ${theme.colors.accent.border}`,
              }}
            >
              <i
                className="fas fa-brain text-sm"
                style={{ color: theme.colors.accent.primary }}
              />
            </div>
            <p
              style={{
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.muted,
                lineHeight: 1.5,
              }}
            >
              {insight}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
