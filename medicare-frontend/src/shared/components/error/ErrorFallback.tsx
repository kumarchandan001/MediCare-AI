interface ErrorFallbackProps {
  error: Error | null;
  reset?: () => void;
}

export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-[rgba(255,61,90,0.1)] border border-[rgba(255,61,90,0.2)] flex items-center justify-center mb-5 text-[#FF3D5A] text-2xl">
        <i className="fas fa-triangle-exclamation" />
      </div>

      {/* Title */}
      <h3 className="text-white font-bold text-lg mb-2 tracking-tight">
        Something went wrong
      </h3>

      {/* Error message */}
      <p className="text-white/40 text-sm mb-6 max-w-md leading-relaxed">
        {error?.message ||
          "An unexpected error occurred. Our team has been notified."}
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        {reset && (
          <button
            onClick={() => {
              // DOM corruption errors (removeChild) can't be recovered by
              // re-rendering — a full reload is needed to fix the tree.
              if (error?.message?.includes("removeChild")) {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-[#00F5C8] text-[#080C0B] font-bold text-sm hover:bg-[#00D4A8] transition-colors"
          >
            Try Again
          </button>
        )}
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 font-semibold text-sm hover:bg-white/[0.08] transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
