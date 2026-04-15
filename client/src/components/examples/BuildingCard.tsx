import BuildingCard from "../BuildingCard";
import farmImage from "@assets/generated_images/farm_building_with_tractor.png";

export default function BuildingCardExample() {
  return (
    <div className="p-8 max-w-sm">
      <BuildingCard
        title="Modern Farm Building"
        description="Durable construction with versatile storage space for all your agricultural needs."
        image={farmImage}
        category="Farm Buildings"
      />
    </div>
  );
}
