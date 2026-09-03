import Header from "@/components/Header";
import PageShell from "@/components/PageShell";
import ExperienceSection from "@/components/ExperienceSection";
import ProjectsSection from "@/components/ProjectsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import PortraitScan from "@/components/PortraitScan";

export default function Home() {
  return (
    <div className="min-h-screen">
      <PortraitScan />
      <PageShell>
          <Header />
          <ExperienceSection />
          <ProjectsSection />
          <ContactSection />
          <Footer />
      </PageShell>
    </div>
  );
}
