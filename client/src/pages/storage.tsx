import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Wrench, Shield, Zap, Clock, DollarSign, Lock } from "lucide-react";
import { Link } from "wouter";

// Images
import storageHero from "@assets/generated_images/premium_storage_workshop.png";

export default function Storage() {
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
      icon: <Wrench className="w-6 h-6" />,
      title: "Professional Quality",
      description: "Built to commercial standards with premium materials and expert craftsmanship for reliable performance.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Maximum Protection",
      description: "Steel construction protects your valuable equipment and belongings from weather, theft, and damage.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Easy Customization",
      description: "Add electrical, insulation, climate control, and specialized features tailored to your needs.",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Quick Installation",
      description: "Prefabricated components mean faster construction and less disruption to your property.",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Cost-Effective",
      description: "Lower long-term costs due to minimal maintenance and durability of 100% American-made steel.",
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Secure Storage",
      description: "Heavy-duty steel frame and siding with reinforced doors provide superior security.",
    },
  ];

  const faqs = [
    {
      question: "What size workshop or storage facility can I build?",
      answer: "We can design custom shops and storage facilities ranging from small 500 sq ft workshops to large 10,000+ sq ft facilities. Your needs and budget determine the final size.",
    },
    {
      question: "Can I add electric and climate control?",
      answer: "Absolutely. We can integrate electrical systems, HVAC, insulation, and other utilities. Discuss your specific needs and we'll design accordingly.",
    },
    {
      question: "How long does construction take?",
      answer: "Most projects take 3-6 months from design to completion, depending on size and complexity. Prefabricated components speed up the installation phase significantly.",
    },
    {
      question: "Can I use it for both storage and a workshop?",
      answer: "Yes! Many customers create multi-purpose spaces with designated storage areas and work zones all under one steel roof.",
    },
    {
      question: "Will I need a building permit?",
      answer: "Yes, building permits are required. We handle all architectural drawings and documentation to streamline the permitting process.",
    },
    {
      question: "How much will it cost?",
      answer: "Costs vary based on size, features, and location. Basic facilities start around $30-50 per square foot. We provide detailed quotes after understanding your requirements.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden mt-16">
          <img
            src={storageHero}
            alt="Shops & Premium Storage"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
          
          <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 tracking-tight leading-tight" data-testid="text-hero-title">
              Shops & Premium Storage
            </h1>
            <p className="text-lg sm:text-xl mb-8 text-white/90 leading-relaxed">
              Professional workshop spaces and premium storage facilities built with 100% American-made cold-formed steel. Perfect for businesses, hobbyists, and serious craftspeople who demand quality.
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
              Why Choose Steel Workshops & Storage?
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

        {/* Perfect For Section */}
        <section className="py-20 sm:py-32 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold mb-10 tracking-tight text-center" data-testid="text-perfect-for">
              Who Can Benefit?
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-2xl font-bold text-primary mb-3">For Hobbyists & Enthusiasts</h3>
                <p>
                  Whether you're into woodworking, metalworking, auto restoration, or any craft, a dedicated workshop space gives you the room and protection your projects deserve. Steel construction means your tools and materials stay protected from the elements year-round.
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-primary mb-3">For Small Businesses</h3>
                <p>
                  Contractors, mechanics, fabricators, and artisans need reliable, professional spaces. A steel workshop builds credibility with clients while providing the durable infrastructure your business depends on.
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-primary mb-3">For Equipment Storage</h3>
                <p>
                  Lawn care equipment, tractors, ATVs, boats, RVs—protect your valuable assets in a secure, climate-controlled environment. Steel buildings resist theft and damage better than any other construction method.
                </p>
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
              Ready to Build Your Workshop or Storage Facility?
            </h2>
            <p className="text-xl mb-10 text-primary-foreground/90 leading-relaxed">
              Get a custom quote for a professional steel facility tailored to your specific needs and budget.
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
