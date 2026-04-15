import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { getCRMBuilderUrl } from "@/lib/crmIntegration";

export default function Header() {
  const builderUrl = getCRMBuilderUrl();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-8">
          {/* Logo */}
          <Link href="/" className="text-sm font-semibold tracking-tight whitespace-nowrap" data-testid="link-pf">
            PF
          </Link>

          {/* Center Nav */}
          <nav className="flex items-center justify-center flex-1 gap-3 sm:gap-6">
            <div className="w-px h-4 bg-border/40 hidden sm:block" />
            <Link
              href="/about"
              data-testid="link-about"
              className="text-xs sm:text-sm font-medium text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap"
            >
              About Us
            </Link>
            <Link
              href="/quote"
              data-testid="link-quote"
              className="text-xs sm:text-sm font-medium text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap"
            >
              Get A Quote
            </Link>
          </nav>

          {/* Right: CTA Button - Links to CRM Builder */}
          <a href={builderUrl} target="_blank" rel="noopener noreferrer">
            <Button
              variant="default"
              size="sm"
              className="rounded-md bg-foreground text-background hover:bg-foreground/90 whitespace-nowrap text-xs sm:text-sm"
              data-testid="button-3d-studio"
            >
              3D Studio +
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
