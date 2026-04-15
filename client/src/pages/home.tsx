import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import HeroSlider from "@/components/HeroSlider";
import { getCRMBuilderUrl } from "@/lib/crmIntegration";

// Images
import studioImage from "@assets/generated_images/3d_studio_visualization.png";

export default function Home() {
  const builderUrl = getCRMBuilderUrl();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        {/* Hero Slider - Horizontal Rotating Hero */}
        <HeroSlider />

        {/* 2. Advantage Section - Why BuildForge */}
        <section className="py-20 sm:py-32 bg-background" id="advantage">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-8 tracking-tight" data-testid="text-advantage-title">
              Why BuildForge
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              At BuildForge, we engineer every building with cold-formed steel—offering superior strength, fire resistance, and longevity that wood simply cannot match. Our precision manufacturing ensures consistent quality, while our comprehensive warranty gives you peace of mind for decades to come. From initial design to final installation, we deliver steel buildings that exceed expectations in durability, performance, and value.
            </p>
            <Link href="/about">
              <Button 
                size="lg"
                className="bg-white text-foreground hover:bg-white/90 font-semibold text-lg px-8 py-6 h-auto"
                data-testid="button-explore-advantage"
              >
                Explore Our Advantage
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* 3. 3D Studio Section */}
        <section className="relative py-24 sm:py-32 overflow-hidden" id="3d-studio">
          <img
            src={studioImage}
            alt="3D Studio Design Tool"
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/60" />
          
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight" data-testid="text-studio-title">
              Your Vision. Our Steel.
            </h2>
            <p className="text-xl text-white font-semibold mb-8">
              Design and visualize your building in our interactive 3D Studio. See your project come to life before construction begins.
            </p>
            <a href={builderUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="font-semibold text-lg px-8 py-6 h-auto"
                data-testid="button-start-designing"
              >
                Start Designing
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </a>
          </div>
        </section>

      </main>
      
      <Footer />
    </div>
  );
}
