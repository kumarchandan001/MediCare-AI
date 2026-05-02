import { SpinnerLoader } from "./SpinnerLoader";

export function FullScreenLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080C0B]/90 backdrop-blur-sm">
      <SpinnerLoader size="lg" />
      <p className="mt-4 text-white/50 text-sm">{message}</p>
    </div>
  );
}
