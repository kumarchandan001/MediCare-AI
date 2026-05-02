export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-[rgba(255,179,0,0.1)] border border-[rgba(255,179,0,0.2)] flex items-center justify-center mb-5 text-[#FFB300] text-2xl">
        <i className="fas fa-wifi-slash" />
      </div>
      <h3 className="text-white font-bold text-lg mb-2">No Internet Connection</h3>
      <p className="text-white/40 text-sm mb-6 max-w-md">
        Please check your connection and try again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl bg-[#00F5C8] text-[#080C0B] font-bold text-sm hover:bg-[#00D4A8] transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
