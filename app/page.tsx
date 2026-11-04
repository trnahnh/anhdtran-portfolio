import Header from "@/components/Header";
import Highlights from "@/components/Highlights";
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
          <Highlights />
          {/* Measured work before the list of titles: the projects are the
              evidence, the roles are context for it. */}
          <ProjectsSection />
          <ExperienceSection featuredOnly />
          <ContactSection />
          <Footer />
      </PageShell>
    </div>
  );
}
