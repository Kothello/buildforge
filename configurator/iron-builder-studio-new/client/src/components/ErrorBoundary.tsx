import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen" style={{ background: 'hsl(var(--background))' }}>
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Unable to render 3D view
            </h2>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>
              {this.state.error?.message || 'An error occurred'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
