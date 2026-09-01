import Header from "@/components/Header";
import PageShell from "@/components/PageShell";
import ExperienceSection from "@/components/ExperienceSection";
import ProjectsSection from "@/components/ProjectsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import IntroScreen from "@/components/IntroScreen";
import MatrixCalibration from "@/components/matrix/MatrixCalibration";

export default function Home() {
  return (
    <div className="min-h-screen">
      <MatrixCalibration />
      <IntroScreen />
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
