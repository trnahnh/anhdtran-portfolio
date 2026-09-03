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
      {/* React hoists this into <head>. The scan cannot start until the
          asset is in, so a first visit fetches it alongside the scripts. */}
      <link rel="preload" as="image" href="/profile/portrait-scan.png" />
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
