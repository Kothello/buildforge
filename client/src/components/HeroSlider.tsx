import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

// Images
import slide1Image from "@assets/generated_images/premium_steel_advantage_hero.png";
import slide2Image from "@assets/generated_images/residential_barndominium_feature.png";
import slide3Image from "@assets/generated_images/premium_storage_workshop.png";
import slide4Image from "@assets/generated_images/agricultural_steel_barn.png";
import slide5Image from "@assets/generated_images/commercial_steel_facility.png";

interface Slide {
  id: number;
  image: string;
  heading: string;
  subheading: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

const slides: Slide[] = [
  {
    id: 1,
    image: slide1Image,
    heading: "BuildForge",
    subheading: "Built Strong. Built To Last.",
    description: "Cold-formed steel construction using 100% American-made steel delivers unmatched durability, performance, and cost-efficiency for residential, commercial, and agricultural buildings.",
    buttonText: "Learn More",
    buttonLink: "/about",
  },
  {
    id: 2,
    image: slide2Image,
    heading: "Residential & Barndominiums",
    subheading: "Modern Steel-Framed Homes",
    description: "Modern steel-framed homes and barndominiums that combine contemporary design with superior durability and energy efficiency.",
    buttonText: "Learn More",
    buttonLink: "/residential",
  },
  {
    id: 3,
    image: slide3Image,
    heading: "Shops & Premium Storage",
    subheading: "Professional Workshop Spaces",
    description: "Professional workshop spaces and premium storage facilities built with cold-formed steel for hobbyists and businesses alike.",
    buttonText: "Learn More",
    buttonLink: "/storage",
  },
  {
    id: 4,
    image: slide4Image,
    heading: "Agricultural Steel Buildings",
    subheading: "Heavy-Duty Farm Facilities",
    description: "Heavy-duty steel barns and machine storage designed to withstand demanding agricultural environments and operations.",
    buttonText: "Learn More",
    buttonLink: "/agricultural",
  },
  {
    id: 5,
    image: slide5Image,
    heading: "Commercial Steel Facilities",
    subheading: "Enterprise-Scale Solutions",
    description: "Large-scale warehouses, offices, and light industrial facilities engineered with steel for maximum efficiency and longevity.",
    buttonText: "Learn More",
    buttonLink: "/commercial",
  },
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Auto-advance slides every 7 seconds
  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [isAutoPlay]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlay(false);
    // Resume autoplay after 10 seconds
    setTimeout(() => setIsAutoPlay(true), 10000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlay(false);
    // Resume autoplay after 10 seconds
    setTimeout(() => setIsAutoPlay(true), 10000);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlay(false);
    // Resume autoplay after 10 seconds
    setTimeout(() => setIsAutoPlay(true), 10000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe(e.targetTouches[0]?.clientX);
  };

  const handleSwipe = (clientX?: number) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50; // Minimum swipe distance in pixels

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped left → next slide
        nextSlide();
      } else {
        // Swiped right → previous slide
        prevSlide();
      }
    }

    // Reset touch positions
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const slide = slides[currentSlide];

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-background" 
      data-testid="hero-slider"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={(e) => {
        setShowControls(true);
        handleTouchStart(e);
      }}
      onTouchEnd={(e) => {
        handleTouchEnd(e);
        // Delay hiding controls to allow button clicks to register
        setTimeout(() => setShowControls(false), 300);
      }}
    >
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {slides.map((s, index) => (
          <div
            key={s.id}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{
              opacity: index === currentSlide ? 1 : 0,
              pointerEvents: index === currentSlide ? "auto" : "none",
            }}
            data-testid={`hero-slide-${s.id}`}
          >
            {/* Background Image */}
            <img
              src={s.image}
              alt={s.heading}
              className="absolute inset-0 w-full h-full object-cover"
              loading={index <= 1 ? "eager" : "lazy"}
            />

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60" />

            {/* Content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white px-4 max-w-5xl mx-auto">
                <h1
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 tracking-tight leading-tight"
                  data-testid={`hero-heading-${s.id}`}
                >
                  {s.heading}
                </h1>
                <p className="text-2xl sm:text-3xl font-semibold mb-4" data-testid={`hero-subheading-${s.id}`}>
                  {s.subheading}
                </p>
                <p className="text-lg sm:text-xl mb-8 text-white/90 max-w-3xl mx-auto" data-testid={`hero-description-${s.id}`}>
                  {s.description}
                </p>
                <div
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href={s.buttonLink}>
                    <Button
                      size="lg"
                      className="bg-white text-foreground hover:bg-white/90 font-semibold text-lg px-8 py-6 h-auto"
                      data-testid={`hero-button-${s.id}`}
                    >
                      {s.buttonText}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Left Arrow */}
      <button
        onClick={prevSlide}
        className={`absolute left-2 sm:left-6 md:left-8 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-white/10 sm:bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 sm:hover:bg-white/25 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          pointerEvents: showControls ? 'auto' : 'none',
        }}
        aria-label="Previous slide"
        data-testid="button-slider-prev"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Right Arrow */}
      <button
        onClick={nextSlide}
        className={`absolute right-2 sm:right-6 md:right-8 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-white/10 sm:bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 sm:hover:bg-white/25 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          pointerEvents: showControls ? 'auto' : 'none',
        }}
        aria-label="Next slide"
        data-testid="button-slider-next"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2" data-testid="slider-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide
                ? "bg-white w-8"
                : "bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`Go to slide ${index + 1}`}
            data-testid={`dot-${index}`}
          />
        ))}
      </div>

      {/* Slide Counter (optional) */}
      <div className="absolute top-8 right-8 z-20 text-white/70 text-sm font-medium" data-testid="slide-counter">
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  );
}
