import { Button } from "@/components/ui/button";

interface BuildingCardProps {
  title: string;
  description: string;
  image: string;
  label: string;
}

export default function BuildingCard({ title, description, image, label }: BuildingCardProps) {
  return (
    <div className="group overflow-hidden rounded-lg bg-background border border-border/40 transition-all duration-300 hover:shadow-lg hover:border-border/60">
      {/* Image Container */}
      <div className="relative h-72 overflow-hidden bg-muted">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Category Label & Title */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="inline-block text-xs font-semibold tracking-wider text-white/80 mb-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
            {label}
          </span>
          <h3 className="text-2xl font-bold text-white leading-tight" data-testid={`text-card-title-${title.replace(/\s+/g, '-').toLowerCase()}`}>
            {title}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-sm text-muted-foreground mb-6 line-clamp-2 h-10" data-testid={`text-card-description-${title.replace(/\s+/g, '-').toLowerCase()}`}>
          {description}
        </p>
        <Button 
          variant="outline" 
          className="w-full rounded-md transition-all duration-300 hover:bg-foreground hover:text-background" 
          data-testid={`button-view-details-${title.replace(/\s+/g, '-').toLowerCase()}`}
        >
          View Details
        </Button>
      </div>
    </div>
  );
}
