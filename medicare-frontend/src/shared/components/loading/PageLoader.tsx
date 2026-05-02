export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080C0B]">
      {/* Brand logo */}
      <div className="w-14 h-14 rounded-2xl bg-[#00F5C8] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,245,200,0.3)]">
        <i
          className="fas fa-heart-pulse"
          style={{ color: "#080C0B", fontSize: "1.4rem" }}
        />
      </div>

      {/* App name */}
      <div className="text-white font-black text-xl tracking-tight mb-2">
        MediCare AI
      </div>

      {/* Loading indicator */}
      <div className="flex items-center gap-1 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#00F5C8]"
            style={{
              animation: "bounce 1.2s infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Tagline */}
      <p className="text-white/30 text-xs mt-4 tracking-widest uppercase">
        Loading your health data...
      </p>
    </div>
  );
}
