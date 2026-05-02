import { Skeleton } from "./Skeleton";

export function HeroScoreSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {["recovery", "strain", "sleep"].map((type) => (
        <div
          key={type}
          className="p-6 rounded-2xl border border-white/5 bg-[#0F1512] flex flex-col items-center space-y-4"
        >
          <Skeleton width="60px" height="10px" variant="text" />
          <Skeleton width="100px" height="64px" variant="rect" />
          <Skeleton width="90px" height="90px" variant="circle" />
          <Skeleton width="80px" height="12px" variant="text" />
        </div>
      ))}
    </div>
  );
}
