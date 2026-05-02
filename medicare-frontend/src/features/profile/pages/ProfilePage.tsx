import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import ProfileHeader from "../components/ProfileHeader";
import InfoSection from "../components/InfoSection";
import HealthProfileSection from "../components/HealthProfileSection";
import PreferencesSection from "../components/PreferencesSection";
import LanguageSwitcher from "../components/LanguageSwitcher";
import SecuritySection from "../components/SecuritySection";
import LogoutConfirmation from "../components/LogoutConfirmation";

import GoogleFitConnectCard from "@/features/googleFit/components/GoogleFitConnectCard";

export default function ProfilePage() {
  return (
    <ErrorBoundary>
      <div className="animate-page-in max-w-4xl mx-auto">
        {/* Profile Header */}
        <ProfileHeader />

        {/* Two-column layout on desktop, tight gaps on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5 mt-3 sm:mt-5">
          {/* LEFT column */}
          <div className="space-y-3 sm:space-y-5">
            <InfoSection />
            <PreferencesSection />
            <LanguageSwitcher />
          </div>

          {/* RIGHT column */}
          <div className="space-y-3 sm:space-y-5">
            <HealthProfileSection />
            <SecuritySection />
          </div>
        </div>

        {/* Connected Apps — Google Fit */}
        <div className="mt-3 sm:mt-5">
          <GoogleFitConnectCard />
        </div>

        {/* Full-width logout zone */}
        <div className="mt-3 sm:mt-5">
          <LogoutConfirmation />
        </div>

        {/* Bottom spacing for mobile nav */}
        <div className="h-4 sm:h-6" />
      </div>
    </ErrorBoundary>
  );
}

export { ProfilePage };
