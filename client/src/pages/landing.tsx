import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-slate-950 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto space-y-6">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Building2 className="w-12 h-12 text-cyan-500" />
          </div>
        </div>
        
        <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          SteelFlow One
        </h1>
        
        <p className="text-xl text-slate-400">
          Premium CRM built for the steel building industry. Manage leads, pricing, and contracts with world-class automation.
        </p>

        <div className="pt-8">
          <a href="/api/login">
            <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white">
              Sign In
            </Button>
          </a>
        </div>

        <p className="text-sm text-slate-500 pt-4">
          Sign in with your account to continue
        </p>
      </div>
    </div>
  );
}
