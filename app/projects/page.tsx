import Header from "@/components/Header";
import PageShell from "@/components/PageShell";
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
      <PageShell>
          <Header />
          <ProjectsSection showAll />
          <ContactSection />
          <Footer />
      </PageShell>
    </div>
  );
}
