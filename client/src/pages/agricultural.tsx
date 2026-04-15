import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Tractor, Wind, Lock, Zap, Wrench, TrendingUp } from "lucide-react";
import { Link } from "wouter";

// Images
import agriculturalHero from "@assets/generated_images/agricultural_steel_barn.png";

export default function Agricultural() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      icon: <Tractor className="w-6 h-6" />,
      title: "Heavy-Duty Construction",
      description: "Engineered to handle demanding agricultural operations with reinforced frames and superior load capacity.",
    },
    {
      icon: <Wind className="w-6 h-6" />,
      title: "All-Weather Protection",
      description: "Steel construction withstands extreme weather, high winds, and heavy snow loads without structural compromise.",
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Maximum Security",
      description: "Protect your equipment and livestock with secure steel construction resistant to damage and theft.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Customizable Design",
      description: "Add ventilation, feeding systems, equipment storage, and specialized agricultural features.",
    },
    {
      icon: <Wrench className="w-6 h-6" />,
      title: "Easy Maintenance",
      description: "100% American-made steel requires minimal upkeep, saving time and money over decades of use.",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Increase Property Value",
      description: "Quality steel agricultural buildings add lasting value to your farm or ranch.",
    },
  ];

  const faqs = [
    {
      question: "What size agricultural facility can I build?",
      answer: "We design custom barns and storage facilities ranging from 1,000 to 20,000+ square feet. We can accommodate small family farms up to large commercial agricultural operations.",
    },
    {
      question: "Can you build facilities for specific animals?",
      answer: "Yes, we design facilities for cattle, horses, chickens, goats, and other livestock. Each design accounts for ventilation, animal safety, and agricultural management needs.",
    },
    {
      question: "What about equipment storage?",
      answer: "We incorporate large open spaces for tractors, combines, hay storage, and other farm equipment. Most designs include multiple access points for easy entry and exit.",
    },
    {
      question: "How do I handle ventilation and climate?",
      answer: "Our designs include natural ventilation through strategic openings and wall vents. Optional insulation and mechanical ventilation systems can be added for year-round climate control.",
    },
    {
      question: "Can I expand my facility later?",
      answer: "Absolutely. Steel construction is modular, so you can add sections or extensions in the future without disrupting the structural integrity of the original building.",
    },
    {
      question: "How long will an agricultural steel building last?",
      answer: "With proper maintenance, our 100% American-made steel buildings last 50+ years. The steel frame is protected by durable coatings that resist rust and weather damage.",
    },
    {
      question: "Do you install hay storage systems?",
      answer: "Yes, we can integrate hay storage systems, feed storage areas, and equipment racks designed specifically for agricultural use.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden mt-16">
          <img
            src={agriculturalHero}
            alt="Agricultural Steel Buildings"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
          
          <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 tracking-tight leading-tight" data-testid="text-hero-title">
              Agricultural Steel Buildings
            </h1>
            <p className="text-lg sm:text-xl mb-8 text-white/90 leading-relaxed">
              Heavy-duty steel barns and machine storage designed to withstand demanding agricultural environments. Built with 100% American-made steel for generations of reliability.
            </p>
            <Button 
              size="lg"
              onClick={() => scrollToSection('cta')}
              className="bg-white text-primary hover:bg-white/90 font-semibold text-lg px-8 py-6 h-auto"
              data-testid="button-request-consultation"
            >
              Request a Consultation
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold mb-16 tracking-tight text-center" data-testid="text-why-choose">
              Why Choose Steel for Your Farm or Ranch?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="p-8 flex flex-col gap-4 hover-elevate" data-testid={`card-feature-${index}`}>
                  <div className="text-primary">{feature.icon}</div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Uses Section */}
        <section className="py-20 sm:py-32 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold mb-10 tracking-tight text-center" data-testid="text-uses">
              Agricultural Building Applications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-primary">Livestock Facilities</h3>
                <p className="text-muted-foreground leading-relaxed">Barns for cattle, horses, chickens, goats, and other animals with ventilation, feeding systems, and proper animal spacing.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-primary">Equipment Storage</h3>
                <p className="text-muted-foreground leading-relaxed">Large open spaces for tractors, combines, hay balers, and other farm machinery with easy access and protection.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-primary">Hay & Grain Storage</h3>
                <p className="text-muted-foreground leading-relaxed">Specialized storage for feed, grain, hay, and other agricultural products with climate control options.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-primary">Working Space</h3>
                <p className="text-muted-foreground leading-relaxed">Weather-protected areas for equipment maintenance, animal care, and agricultural operations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold mb-16 tracking-tight text-center" data-testid="text-faq">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-border/40 rounded-lg overflow-hidden hover-elevate cursor-pointer transition-all"
                  onClick={() => toggleFAQ(index)}
                  data-testid={`faq-item-${index}`}
                >
                  <div className="bg-white dark:bg-slate-950 p-6 flex items-start justify-between gap-4">
                    <h3 className="text-lg font-bold text-primary flex-1">{faq.question}</h3>
                    <ChevronDown
                      className={`w-5 h-5 text-primary flex-shrink-0 transition-transform ${
                        openFAQ === index ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  {openFAQ === index && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 pb-6 text-muted-foreground leading-relaxed border-t border-border/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 sm:py-32 bg-primary text-primary-foreground" id="cta">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight" data-testid="text-final-cta">
              Ready to Build Your Agricultural Facility?
            </h2>
            <p className="text-xl mb-10 text-primary-foreground/90 leading-relaxed">
              Get a custom steel building solution designed for your farm or ranch's unique needs.
            </p>
            <Link href="/quote">
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold text-lg px-8 py-6 h-auto"
                data-testid="button-get-quote-cta"
              >
                Get a Quote
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
