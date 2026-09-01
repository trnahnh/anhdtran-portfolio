import Header from "@/components/Header";
import PageShell from "@/components/PageShell";
import ProfileSection from "@/components/ProfileSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import CardIntroScreen from "@/components/CardIntroScreen";
import SolarSystem from "@/components/SolarSystem";
import ConditionalSplashCursor from "@/components/ConditionalSplashCursor";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import EnterSpaceButton from "@/components/EnterSpaceButton";

export const metadata = {
  title: "Anh Tran",
  description: "The Most 'Finance-Bro' Tech Bro",
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen relative z-10">
      <ErrorBoundary>
        <ConditionalSplashCursor />
      </ErrorBoundary>
      <SolarSystem />
      <CardIntroScreen />
      <PageShell className="relative z-2">
          <Header />
          <ProfileSection />
          <ContactSection />
          <EnterSpaceButton />
          <Footer />
      </PageShell>
    </div>
  );
}
