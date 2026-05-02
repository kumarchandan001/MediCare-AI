import { Skeleton } from "./Skeleton";

export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div
        className="px-5 py-3 bg-white/[0.03] rounded-t-xl"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "16px",
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width="60px" height="8px" variant="text" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={ri}
          className="px-5 py-4 border-b border-white/5"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "16px",
          }}
        >
          {Array.from({ length: cols }).map((_, ci) => (
            <Skeleton
              key={ci}
              height="12px"
              variant="text"
              width={ci === 0 ? "80%" : "60%"}
              style={{ animationDelay: `${ri * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
