import Header from "@/components/Header";
import ProjectsSection from "@/components/ProjectsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Anh Tran",
  description: "The Most 'Finance-Bro' Tech Bro",
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
        <div className="space-y-16">
          <Header />
          <ProjectsSection showAll />
          <ContactSection />
          <Footer />
        </div>
      </main>
    </div>
  );
}
