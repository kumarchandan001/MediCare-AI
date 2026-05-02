import { Skeleton } from "./Skeleton";

export function MetricCardSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-white/5 bg-[#0F1512] space-y-4">
      {/* Top row: label + icon */}
      <div className="flex justify-between">
        <Skeleton width="80px" height="10px" variant="text" />
        <Skeleton width="32px" height="32px" variant="rect" className="rounded-lg" />
      </div>
      {/* Big metric number */}
      <Skeleton width="120px" height="48px" variant="rect" />
      {/* Trend badge */}
      <Skeleton width="60px" height="20px" variant="rect" className="rounded-full" />
      {/* Progress track */}
      <Skeleton width="100%" height="3px" variant="rect" className="rounded-full" />
    </div>
  );
}
