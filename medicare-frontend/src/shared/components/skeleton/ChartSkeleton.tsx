import { Skeleton } from "./Skeleton";

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="space-y-4">
      {/* Chart header */}
      <div className="flex justify-between">
        <Skeleton width="100px" height="10px" variant="text" />
        <Skeleton width="80px" height="24px" variant="rect" className="rounded-full" />
      </div>
      {/* Chart body */}
      <div className="relative" style={{ height }}>
        {/* Fake bars */}
        <div className="absolute inset-0 flex items-end gap-2 px-2">
          {[65, 80, 45, 90, 60, 75, 85].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
