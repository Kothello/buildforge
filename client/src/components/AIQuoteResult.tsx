import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface MaterialItem {
  item: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
}

interface AIQuote {
  summary: string;
  materials: MaterialItem[];
  laborEstimate: string;
  totalEstimate: string;
  timelineWeeks: string;
  suggestions: string[];
}

export default function AIQuoteResult({ quote }: { quote: AIQuote }) {
  return (
    <Card className="p-8 mt-8 border-2 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary text-primary-foreground rounded-lg p-2">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-2xl font-bold">AI-Generated Estimate</h3>
          <p className="text-sm text-muted-foreground">Powered by Claude — for reference only, final pricing may vary</p>
        </div>
      </div>

      <p className="text-lg mb-6">{quote.summary}</p>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-primary/20">
              <th className="text-left py-3 pr-4 font-semibold">Material</th>
              <th className="text-left py-3 pr-4 font-semibold">Quantity</th>
              <th className="text-right py-3 pr-4 font-semibold">Unit Cost</th>
              <th className="text-right py-3 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.materials.map((m, i) => (
              <tr key={i} className="border-b border-muted">
                <td className="py-2 pr-4">{m.item}</td>
                <td className="py-2 pr-4 text-muted-foreground">{m.quantity}</td>
                <td className="py-2 pr-4 text-right">{m.unitCost}</td>
                <td className="py-2 text-right font-medium">{m.totalCost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-background rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Labor Estimate</p>
          <p className="text-xl font-bold">{quote.laborEstimate}</p>
        </div>
        <div className="bg-background rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Total Estimate</p>
          <p className="text-xl font-bold text-primary">{quote.totalEstimate}</p>
        </div>
        <div className="bg-background rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Build Timeline</p>
          <p className="text-xl font-bold">{quote.timelineWeeks}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-3">Value Engineering Suggestions</h4>
        <ul className="space-y-2">
          {quote.suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-primary font-bold mt-0.5">→</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
