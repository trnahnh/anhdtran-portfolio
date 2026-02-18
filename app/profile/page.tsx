import Header from "@/components/Header";
import ProfileSection from "@/components/ProfileSection";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Anh Tran — Profile",
  description: "The Most 'Finance-Bro' Tech Bro",
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
        <div className="space-y-16">
          <Header />
          <ProfileSection />
          <Footer />
        </div>
      </main>
    </div>
  );
}
