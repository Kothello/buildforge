import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Home, Zap, Wrench, Clock, DollarSign, Wind } from "lucide-react";
import { Link } from "wouter";

// Images
import residentialHero from "@assets/generated_images/residential_barndominium_feature.png";
import modernMinimalistImage from "@assets/generated_images/modern_minimalist_steel_home.png";
import luxuryBarndominiumImage from "@assets/generated_images/luxury_barndominium_interior.png";
import urbanLoftImage from "@assets/generated_images/urban_loft_steel_warehouse.png";
import contemporaryRanchImage from "@assets/generated_images/contemporary_ranch_steel_building.png";

export default function Residential() {
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
      icon: <Home className="w-6 h-6" />,
      title: "Superior Durability",
      description: "Steel-framed homes last decades longer than wood construction with minimal maintenance and superior structural integrity.",
    },
    {
      icon: <Wrench className="w-6 h-6" />,
      title: "Low Maintenance",
      description: "No rot, no termites, no warping. Steel requires virtually no ongoing maintenance, saving you thousands over time.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Energy Efficiency",
      description: "Modern insulation and energy systems in steel homes reduce heating and cooling costs significantly year-round.",
    },
    {
      icon: <Wind className="w-6 h-6" />,
      title: "Weather Resistance",
      description: "Steel frames withstand extreme weather, high winds, and heavy snow loads without structural compromise.",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Faster Construction",
      description: "Prefabricated steel components mean quicker builds—move into your home months sooner than traditional construction.",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Long-Term Value",
      description: "Lower maintenance, energy savings, and superior durability mean better resale value and lifetime savings.",
    },
  ];

  const designStyles = [
    {
      name: "Modern Minimalist",
      description: "Clean lines, open floor plans, and large glass areas. Perfect for contemporary living with natural light and flexible spaces.",
      size: "1,500–3,500 sq ft",
      idealFor: "Families wanting modern aesthetics and low-maintenance living",
      image: modernMinimalistImage,
    },
    {
      name: "Luxury Barndominium",
      description: "High ceilings, mixed materials (steel + wood accents), and premium finishes. Combines rustic charm with upscale comfort.",
      size: "2,500–5,000 sq ft",
      idealFor: "High-end buyers seeking unique, statement homes",
      image: luxuryBarndominiumImage,
    },
    {
      name: "Urban Loft Style",
      description: "Industrial aesthetic with exposed steel elements, polished concrete, and modern amenities. Urban sophistication in any location.",
      size: "1,000–2,500 sq ft",
      idealFor: "Young professionals and empty nesters preferring walkable, efficient spaces",
      image: urbanLoftImage,
    },
    {
      name: "Contemporary Ranch",
      description: "Low-profile designs with wide overhangs, steel siding, and expansive patios. Blends traditional comfort with modern efficiency.",
      size: "2,000–4,000 sq ft",
      idealFor: "Families who appreciate classic ranch feel with cutting-edge durability",
      image: contemporaryRanchImage,
    },
  ];

  const processSteps = [
    {
      number: "1",
      title: "Consultation",
      description: "Discuss your vision, lifestyle, and budget. We understand your unique needs and preferences.",
    },
    {
      number: "2",
      title: "Design & Plan",
      description: "Our architects create custom floor plans and 3D renderings using our interactive design tool.",
    },
    {
      number: "3",
      title: "Quote & Approval",
      description: "Receive a detailed, transparent quote. Review everything before moving forward.",
    },
    {
      number: "4",
      title: "Permitting & Prep",
      description: "We handle architectural drawings, permits, and site preparation for a smooth process.",
    },
    {
      number: "5",
      title: "Construction",
      description: "Professional installation by our trained crews with regular progress updates and quality inspections.",
    },
    {
      number: "6",
      title: "Move-In",
      description: "Final walkthrough, finishing touches, and handoff. Your dream home is ready to live in.",
    },
  ];

  const faqs = [
    {
      question: "What is the lifespan of a steel-framed home?",
      answer: "Steel homes can last 100+ years with minimal maintenance. The steel frame is protected by paint and coatings that last 30+ years. Unlike wood, steel won't rot, warp, or decay, making it a truly lifetime investment.",
    },
    {
      question: "How much will a steel-framed home or barndominium cost?",
      answer: "Costs vary based on size, finishes, and location. Most steel homes range from $150–$300 per square foot fully finished. While initial costs may be comparable to wood construction, the long-term savings on maintenance and energy make steel significantly cheaper over time.",
    },
    {
      question: "Can I customize the design?",
      answer: "Absolutely. We offer full customization. Whether you want a specific floor plan, unique finishes, or special features, our team will work with you to create your ideal home. We also offer design templates if you prefer to start with proven layouts.",
    },
    {
      question: "How long does construction take?",
      answer: "Most steel homes take 6–12 months from design to move-in, depending on complexity and weather. The prefabricated nature of our steel components speeds up the construction phase compared to traditional wood-framed homes.",
    },
    {
      question: "Will my insurance be different?",
      answer: "Many insurers offer discounts for steel homes due to superior fire resistance and durability. We recommend speaking with your insurance provider—most welcome the structural advantages of steel construction.",
    },
    {
      question: "Can I finance a steel home?",
      answer: "Yes. Most traditional lenders will finance steel homes. Because they're considered permanent structures with superior value, financing is typically straightforward. We're happy to provide documentation for your lender.",
    },
    {
      question: "What about resale value?",
      answer: "Steel homes hold their value well and often appreciate faster than wood homes due to their durability and modern appeal. Buyers increasingly seek low-maintenance steel construction, making resale easier and stronger.",
    },
    {
      question: "Do you offer financing options?",
      answer: "We work with local and national lenders and can connect you with financing partners. We also offer flexible payment plans during the design and construction phases.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden mt-16">
          <img
            src={residentialHero}
            alt="Residential & Barndominiums"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
          
          <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 tracking-tight leading-tight" data-testid="text-hero-title">
              Residential & Barndominiums
            </h1>
            <p className="text-lg sm:text-xl mb-8 text-white/90 leading-relaxed">
              Modern steel-framed homes and barndominiums that combine contemporary design with superior durability and energy efficiency. Built with 100% American-made steel for a lifetime of comfort and minimal maintenance.
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

        {/* What Is Section */}
        <section className="py-20 sm:py-32 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold mb-10 tracking-tight text-center" data-testid="text-what-is">
              What Is a Residential Steel Home or Barndominium?
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                A residential steel home is a modern dwelling constructed with a steel frame instead of traditional wood framing. Steel-framed homes offer the same comfort and design flexibility as wood homes, but with superior durability, strength, and longevity. They can range from sleek modern minimalist designs to spacious luxury barndominiums that blend rustic aesthetics with contemporary luxury.
              </p>
              <p>
                A barndominium is a hybrid design that combines residential living space with additional utility space—such as a workshop, garage, or hobby area—all under one steel roof. Originally popularized in rural areas, barndominiums have become increasingly popular as premium residences for people who value space, flexibility, and a unique lifestyle. Steel construction is ideal for barndominium designs because of the large open spans and structural flexibility steel provides.
              </p>
              <p>
                Both residential steel homes and barndominiums built by BuildForge are engineered for maximum performance, designed with your lifestyle in mind, and built to last a century or more. With minimal maintenance and superior energy efficiency, a steel home is a smart investment in your future.
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold mb-16 tracking-tight text-center" data-testid="text-why-choose">
              Why Choose Steel-Framed Homes & Barndominiums?
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

        {/* Design Styles Section */}
        <section className="py-20 sm:py-32 bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold mb-16 tracking-tight text-center" data-testid="text-design-styles">
              Design Styles & Floor Plan Ideas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {designStyles.map((style, index) => (
                <div
                  key={index}
                  className="relative h-96 rounded-lg overflow-hidden hover-elevate group"
                  data-testid={`card-style-${index}`}
                >
                  <img
                    src={style.image}
                    alt={style.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                  
                  <div className="relative z-10 h-full p-8 flex flex-col justify-end">
                    <h3 className="text-2xl font-bold mb-3 text-white">{style.name}</h3>
                    <p className="text-white/90 mb-6 leading-relaxed">{style.description}</p>
                    <div className="space-y-2 border-t border-white/20 pt-4">
                      <p className="text-sm text-white/80">
                        <span className="font-semibold">Typical Size:</span> {style.size}
                      </p>
                      <p className="text-sm text-white/80">
                        <span className="font-semibold">Ideal For:</span> {style.idealFor}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold mb-16 tracking-tight text-center" data-testid="text-how-works">
              How the Process Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {processSteps.map((step, index) => (
                <div key={index} className="flex flex-col" data-testid={`step-${index}`}>
                  <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mb-6">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed flex-1">{step.description}</p>
                  {index < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 w-0.5 h-20 bg-primary/20 mt-8" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 sm:py-32 bg-background">
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
              Ready to Build Your Dream Home?
            </h2>
            <p className="text-xl mb-10 text-primary-foreground/90 leading-relaxed">
              Discover how a steel-framed home or barndominium can offer superior durability, energy efficiency, and design flexibility. Let's bring your vision to life.
            </p>
            <Link href="/quote">
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold text-lg px-8 py-6 h-auto"
                data-testid="button-get-quote-cta"
              >
                Request a Consultation
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
