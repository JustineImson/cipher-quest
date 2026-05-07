import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-black text-red-500 p-8">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <pre className="text-sm whitespace-pre-wrap max-w-2xl">
            {this.state.error?.toString?.() || "Unknown error"}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 border border-red-500 rounded hover:bg-red-900/30"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
