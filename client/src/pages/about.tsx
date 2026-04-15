import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

// Images
import heroBannerImage from "@assets/generated_images/steel_construction_hero_banner.png";
import materialsImage from "@assets/generated_images/sleek_steel_framing_detail.png";
import residentialSteelImage from "@assets/generated_images/modern_residential_metal_home_photo.png";
import fabricationImage from "@assets/generated_images/steel_fabrication_workshop_photo.png";
import residentialBgImage from "@assets/generated_images/modern_residential_steel_home.png";
import commercialBgImage from "@assets/generated_images/modern_commercial_steel_building.png";
import agriculturalBgImage from "@assets/generated_images/modern_agricultural_steel_facility.png";
import communityBgImage from "@assets/generated_images/modern_community_steel_center.png";

export default function About() {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
          <img
            src={heroBannerImage}
            alt="Built Stronger. Lasts Longer. Looks Better."
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60" />
          
          <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
            <p className="text-lg sm:text-xl font-semibold mb-4 tracking-wide uppercase" data-testid="text-about-hero-label">
              About BuildForge
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-tight" data-testid="text-about-hero-title">
              Built Stronger. Lasts Longer. Looks Better.
            </h1>
            <p className="text-lg sm:text-xl mb-8 text-white/90 leading-relaxed">
              When you build with BuildForge, you build something that lasts. We specialize exclusively in 100% American-made cold-formed steel construction, delivering unmatched durability, performance, and cost-efficiency for residential, commercial, and agricultural projects.
            </p>
            <Link href="/quote">
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="button-get-quote-hero"
              >
                Get a Quote
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Our Materials Section */}
        <section className="py-6 sm:py-12 bg-white dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight pb-6 border-b-2 border-primary/20 inline-block" data-testid="text-materials-heading">
                Our Materials
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <p className="text-lg text-muted-foreground leading-loose max-w-lg">
                  Quality is at the heart of BuildForge. From the smallest fastener to the main framing members, we leave nothing to chance. At the core of every building is high-strength 100% American-made cold-formed steel—engineered to deliver superior structural performance, fire resistance, and longevity that traditional materials simply cannot match.
                </p>
                <p className="text-lg text-muted-foreground leading-loose max-w-lg">
                  Unlike competitors who source materials from various suppliers, we maintain in-house control of key components using our American-made steel standards. Our precision roll-formed framing ensures consistent quality and perfect fit every time, eliminating the variability found in conventional construction. Our corrosion-resistant coatings protect your investment for decades, maintaining structural integrity in any climate.
                </p>
                <p className="text-lg text-muted-foreground leading-loose max-w-lg">
                  Combined with a tight building envelope and energy-efficient design, our 100% American steel buildings deliver exceptional performance while reducing long-term maintenance costs. The result is structural reliability you can count on—buildings that stand strong for generations with minimal upkeep.
                </p>
              </div>
              <div className="rounded-xl overflow-hidden shadow-xl">
                <img src={materialsImage} alt="Cold-formed steel framing detail" className="w-full h-96 object-cover" data-testid="image-materials" />
              </div>
            </div>
          </div>
        </section>

        {/* Our People Section */}
        <section className="py-6 sm:py-12 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight pb-6 border-b-2 border-primary/20 inline-block" data-testid="text-people-heading">
                Our People
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="rounded-xl overflow-hidden shadow-xl">
                <img src={residentialSteelImage} alt="Modern residential steel building" className="w-full h-96 object-cover" data-testid="image-people" />
              </div>
              <div className="space-y-6">
                <p className="text-lg text-muted-foreground leading-loose max-w-lg">
                  The difference between a good building and a great building is craftsmanship. Regardless of materials, a structure is only as good as the people who construct it. At BuildForge, we are true craftsmen dedicated to building 100% American-made steel structures that exceed your expectations.
                </p>
                <p className="text-lg text-muted-foreground leading-loose max-w-lg">
                  All of our crews are full-time specialists dedicated exclusively to steel construction. Our foremen are seasoned professionals with years of hands-on experience in American steel building, and our team brings consistent expertise regardless of project size. This isn't seasonal work—it's a career built on pride, accountability, and customer satisfaction.
                </p>
                <p className="text-lg text-muted-foreground leading-loose max-w-lg">
                  From initial design through final installation of your American-made steel building, our people work closely with you to ensure your vision becomes reality. We combine in-house design support with a genuine partnership mindset. You're not just hiring a contractor—you're partnering with a team committed to your long-term success and satisfaction.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Warranty Section */}
        <section className="py-6 sm:py-12 bg-white dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight pb-6 border-b-2 border-primary/20 inline-block" data-testid="text-warranty-heading">
                Our Warranty
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <p className="text-lg text-muted-foreground leading-loose max-w-lg">
                  The buck stops here. Our warranty is simple and strong: we stand directly behind our 100% American-made steel work. It's handled in-house with no third-party intermediaries, covers both materials and workmanship, and is backed by our company's full commitment to accountability. When you call us, we take care of you.
                </p>
                <p className="text-lg text-muted-foreground leading-loose max-w-lg">
                  This isn't just a warranty document—it's our promise. We've engineered your 100% American steel building to last, and we're confident enough to back that promise with our reputation, resources, and unwavering support. We stand behind every BuildForge building we deliver, period.
                </p>
              </div>
              <div className="rounded-xl overflow-hidden shadow-xl">
                <img src={fabricationImage} alt="Steel fabrication precision" className="w-full h-96 object-cover" data-testid="image-warranty" />
              </div>
            </div>
          </div>
        </section>

        {/* What We Build Section */}
        <section className="py-6 sm:py-12 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight pb-6 border-b-2 border-primary/20 inline-block" data-testid="text-build-heading">
                We Can Build It
              </h2>
            </div>
            
            <p className="text-xl text-muted-foreground text-center leading-loose max-w-2xl mx-auto mb-16">
              Whether it's residential or agricultural, commercial or community, BuildForge brings expertise and precision to all our projects.
            </p>
            
            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="relative p-10 rounded-xl border border-border/40 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden group min-h-64" data-testid="card-residential" style={{ backgroundImage: `url(${residentialBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors duration-300"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-5 tracking-tight uppercase text-white" data-testid="text-residential-card">Residential</h3>
                  <p className="text-white/90 leading-loose">
                    Modern steel-framed homes and barndominiums combining contemporary design with superior durability and energy efficiency.
                  </p>
                </div>
              </div>
              <div className="relative p-10 rounded-xl border border-border/40 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden group min-h-64" data-testid="card-commercial" style={{ backgroundImage: `url(${commercialBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors duration-300"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-5 tracking-tight uppercase text-white" data-testid="text-commercial-card">Commercial</h3>
                  <p className="text-white/90 leading-loose">
                    Professional office spaces, retail facilities, and industrial buildings engineered for performance and aesthetics.
                  </p>
                </div>
              </div>
              <div className="relative p-10 rounded-xl border border-border/40 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden group min-h-64" data-testid="card-agricultural" style={{ backgroundImage: `url(${agriculturalBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors duration-300"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-5 tracking-tight uppercase text-white" data-testid="text-agricultural-card">Agricultural</h3>
                  <p className="text-white/90 leading-loose">
                    Barns, equipment storage, and farm facilities built with steel durability to withstand harsh agricultural environments.
                  </p>
                </div>
              </div>
              <div className="relative p-10 rounded-xl border border-border/40 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden group min-h-64" data-testid="card-community" style={{ backgroundImage: `url(${communityBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors duration-300"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-5 tracking-tight uppercase text-white" data-testid="text-community-card">Community</h3>
                  <p className="text-white/90 leading-loose">
                    Churches, community centers, and gathering spaces designed with steel's strength and flexible interior layouts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 sm:py-32 bg-primary text-primary-foreground">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-10 tracking-tight leading-tight" data-testid="text-cta-heading">
              Ready to start your project?
            </h2>
            <Link href="/quote">
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="button-get-quote"
              >
                Get a Quote
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
