import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Caught error in ${this.props.name || "Component"}:`, error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-neutral-900 border border-red-900/50 rounded-2xl text-white flex flex-col items-center justify-center gap-2 text-center my-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <div className="text-xs font-semibold text-neutral-300">
            Не удалось загрузить визуализацию {this.props.name ? `(${this.props.name})` : ""}
          </div>
          <button
            onClick={this.handleReset}
            className="mt-1 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Повторить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
