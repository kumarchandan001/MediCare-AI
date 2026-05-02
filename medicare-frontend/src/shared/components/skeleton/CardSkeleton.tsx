import { Skeleton } from "./Skeleton";

export function CardSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-white/5 bg-[#0F1512] space-y-3">
      <Skeleton width="40%" height="10px" variant="text" />
      <Skeleton width="100%" height="60px" variant="rect" />
      <Skeleton width="70%" height="12px" variant="text" />
    </div>
  );
}
