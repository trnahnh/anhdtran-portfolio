import Header from "@/components/Header";
import ExperienceSection from "@/components/ExperienceSection";
import ProjectsSection from "@/components/ProjectsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import IntroScreen from "@/components/IntroScreen";

export default function Home() {
  return (
    <div className="min-h-screen">
      <IntroScreen />
      <main className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
        <div className="space-y-16">
          <Header />
          <ExperienceSection />
          <ProjectsSection />
          <ContactSection />
          <Footer />
        </div>
      </main>
    </div>
  );
}
