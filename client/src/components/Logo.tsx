export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox="0 0 200 120"
        className="w-full h-full"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Building outline with gable roof */}
        <path d="M 40 30 L 100 10 L 160 30 L 160 100 L 40 100 Z" fill="currentColor" />
        
        {/* Inner building detail - white space */}
        <path d="M 50 35 L 100 20 L 150 35 L 150 100 L 50 100 Z" fill="white" />
        
        {/* Vertical siding lines */}
        <line x1="70" y1="40" x2="70" y2="100" stroke="currentColor" strokeWidth="2" />
        <line x1="80" y1="38" x2="80" y2="100" stroke="currentColor" strokeWidth="2" />
        <line x1="90" y1="36" x2="90" y2="100" stroke="currentColor" strokeWidth="2" />
        <line x1="100" y1="35" x2="100" y2="100" stroke="currentColor" strokeWidth="2" />
        <line x1="110" y1="36" x2="110" y2="100" stroke="currentColor" strokeWidth="2" />
        <line x1="120" y1="38" x2="120" y2="100" stroke="currentColor" strokeWidth="2" />
        <line x1="130" y1="40" x2="130" y2="100" stroke="currentColor" strokeWidth="2" />
        
        {/* Door opening */}
        <rect x="55" y="65" width="35" height="35" fill="white" />
        
        {/* Roof detail */}
        <line x1="100" y1="20" x2="100" y2="35" stroke="currentColor" strokeWidth="2" />
      </svg>
      
      <div className="text-center mt-2">
        <div className="font-bold text-xl tracking-tight leading-tight">BUILDFORGE</div>
      </div>
    </div>
  );
}
