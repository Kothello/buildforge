import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Warehouse, Shield, TrendingUp, Zap, Wrench, BarChart3 } from "lucide-react";
import { Link } from "wouter";

// Images
import commercialHero from "@assets/generated_images/commercial_steel_facility.png";

export default function Commercial() {
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
      icon: <Warehouse className="w-6 h-6" />,
      title: "Massive Open Spans",
      description: "Steel construction allows large column-free spaces perfect for warehousing, manufacturing, and logistics operations.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Engineered Durability",
      description: "Built to code with 100% American-made steel for maximum structural integrity and long-term reliability.",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Scalable Solutions",
      description: "Start with what you need today and expand later. Steel buildings adapt to your growing business.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Full Integration",
      description: "Add electrical, HVAC, loading docks, climate control, and specialized systems for your industry.",
    },
    {
      icon: <Wrench className="w-6 h-6" />,
      title: "Low Maintenance",
      description: "Durable American steel means fewer repairs and lower maintenance costs throughout the building's life.",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Cost-Effective ROI",
      description: "Lower operational costs and minimal maintenance add up to exceptional return on investment.",
    },
  ];

  const faqs = [
    {
      question: "What types of commercial buildings can you design?",
      answer: "We design warehouses, light industrial facilities, offices, retail spaces, manufacturing facilities, logistics centers, and mixed-use buildings. Any commercial application where durability and cost-efficiency matter.",
    },
    {
      question: "How large can commercial buildings get?",
      answer: "Steel construction can handle buildings from 5,000 to 100,000+ square feet. We've successfully designed facilities for major logistics operations and manufacturing centers.",
    },
    {
      question: "Can you accommodate loading docks and roll-up doors?",
      answer: "Absolutely. We integrate large overhead doors, loading docks, drive-in access, and other commercial requirements into the design from the beginning.",
    },
    {
      question: "What about office space and climate control?",
      answer: "We can create mixed-use facilities with office areas, climate-controlled spaces, and climate-controlled storage. Your specific operational needs guide the design.",
    },
    {
      question: "How long does it take to build a commercial facility?",
      answer: "Design to completion typically takes 4-8 months depending on size and complexity. Prefabricated components reduce on-site construction time significantly.",
    },
    {
      question: "Can I get LEED certification?",
      answer: "Steel buildings are inherently sustainable. We can incorporate energy-efficient systems, renewable energy options, and sustainable materials to support LEED certification goals.",
    },
    {
      question: "What about future modifications?",
      answer: "Steel structures are flexible. You can modify layouts, add sections, or upgrade systems later without structural concerns. This adaptability protects your investment.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden mt-16">
          <img
            src={commercialHero}
            alt="Commercial Steel Facilities"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
          
          <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 tracking-tight leading-tight" data-testid="text-hero-title">
              Commercial Steel Facilities
            </h1>
            <p className="text-lg sm:text-xl mb-8 text-white/90 leading-relaxed">
              Large-scale warehouses, offices, and light industrial facilities engineered with 100% American-made steel for maximum efficiency and longevity. Built to grow with your business.
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
              Why Steel for Commercial Facilities?
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

        {/* Applications Section */}
        <section className="py-20 sm:py-32 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold mb-10 tracking-tight text-center" data-testid="text-applications">
              Commercial Applications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-primary">Warehousing & Logistics</h3>
                <p className="text-muted-foreground leading-relaxed">Large open spaces for inventory storage, fulfillment centers, and distribution operations with climate control options.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-primary">Manufacturing & Assembly</h3>
                <p className="text-muted-foreground leading-relaxed">Heavy-duty facilities designed for industrial operations, with customized layouts for production lines and equipment.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-primary">Office & Retail</h3>
                <p className="text-muted-foreground leading-relaxed">Professional commercial spaces with climate control, electrical systems, and design flexibility for office or retail use.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-primary">Mixed-Use Facilities</h3>
                <p className="text-muted-foreground leading-relaxed">Combine warehouse, office, and service areas under one steel roof for operational efficiency.</p>
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
              Ready to Build Your Commercial Facility?
            </h2>
            <p className="text-xl mb-10 text-primary-foreground/90 leading-relaxed">
              Let's discuss your business needs and design a steel solution that grows with you.
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
