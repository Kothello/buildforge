import { useLocation } from "wouter";

const NotFound = () => {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>404</h1>
        <p className="mb-4 text-xl" style={{ color: 'hsl(var(--muted-foreground))' }}>Oops! Page not found</p>
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>Attempted route: {location}</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
