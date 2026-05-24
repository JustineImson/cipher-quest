import React from 'react';
import { logApp } from '../services/logService';
import { auth } from '../services/firebase';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Global Error Caught:", error, errorInfo);
    // Log the error to Firestore
    const uid = auth.currentUser?.uid || null;
    logApp.error('SYSTEM_ERROR', { 
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500)
    }, uid);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0f] text-[#c96a6a] font-mono p-6">
          <h1 className="text-2xl mb-4 uppercase tracking-widest font-bold">System Override</h1>
          <p className="text-sm text-[#e8dcc0] mb-6 max-w-md text-center">
            A critical system error has occurred. The incident has been recorded in the audit logs for administrator review.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#1a0f0f] border border-[#c96a6a]/50 text-[#c96a6a] text-sm uppercase hover:bg-[#c96a6a] hover:text-[#0a0a0f] transition-all"
          >
            Reboot System
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
