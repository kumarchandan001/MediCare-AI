import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/config/constants";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#080C0B]">
      <div className="text-[6rem] font-black text-white/10 leading-none mb-4">
        404
      </div>
      <h2 className="text-white font-bold text-xl mb-2">Page Not Found</h2>
      <p className="text-white/40 text-sm mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate(ROUTES.DASHBOARD)}
        className="px-6 py-3 rounded-xl bg-[#00F5C8] text-[#080C0B] font-bold text-sm hover:bg-[#00D4A8] transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

export default NotFound;
