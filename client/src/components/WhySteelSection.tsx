import { Card } from "@/components/ui/card";
import { Shield, DollarSign, Flame, Wrench } from "lucide-react";

export default function WhySteelSection() {
  const benefits = [
    {
      icon: Shield,
      title: "Superior Durability",
      description: "Steel doesn't rot, warp, or crack like wood. Resistant to pests, mold, and weather damage.",
    },
    {
      icon: DollarSign,
      title: "Cost-Efficient",
      description: "Lower maintenance costs and longer lifespan mean better value over time compared to wood structures.",
    },
    {
      icon: Flame,
      title: "Fire Resistant",
      description: "Steel is non-combustible, providing better fire protection than wood construction.",
    },
    {
      icon: Wrench,
      title: "Low Maintenance",
      description: "No painting, sealing, or treating required. Steel buildings maintain their integrity with minimal upkeep.",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" data-testid="text-why-steel-title">
            Why Steel vs Wood?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            BuildForge specializes in cold-formed steel construction. Here's why steel outperforms traditional wood buildings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card key={index} className="p-6 text-center hover-elevate transition-all duration-300">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2" data-testid={`text-benefit-title-${index}`}>
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground" data-testid={`text-benefit-description-${index}`}>
                  {benefit.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
