import Header from "@/components/Header";
import ProfileSection from "@/components/ProfileSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import ProfileIntroScreen from "@/components/ProfileIntroScreen";

export const metadata = {
  title: "Anh Tran",
  description: "The Most 'Finance-Bro' Tech Bro",
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen">
      <ProfileIntroScreen />
      <main className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
        <div className="space-y-16">
          <Header />
          <ProfileSection />
          <ContactSection />
          <Footer />
        </div>
      </main>
    </div>
  );
}
