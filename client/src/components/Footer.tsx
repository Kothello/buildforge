import { Link } from "wouter";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="bg-muted border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              <Logo className="w-32" />
            </div>
            <p className="text-sm text-muted-foreground">
              Cold-formed steel building experts. Durable, cost-efficient construction solutions.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Building Types</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/residential" className="hover:text-foreground transition-colors">Residential Steel</Link></li>
              <li><Link href="/agricultural" className="hover:text-foreground transition-colors">Agricultural</Link></li>
              <li><Link href="/commercial" className="hover:text-foreground transition-colors">Commercial</Link></li>
              <li><Link href="/storage" className="hover:text-foreground transition-colors">Equestrian</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">Projects</Link></li>
              <li><Link href="/quote" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link href="/about" className="hover:text-foreground transition-colors">Why Steel?</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>1-800-STEEL-PRO</li>
              <li>info@buildforge.com</li>
              <li>123 Steel Drive</li>
              <li>Industrial Park, IP 12345</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} BuildForge. All rights reserved. Cold-formed steel building specialists.</p>
        </div>
      </div>
    </footer>
  );
}
