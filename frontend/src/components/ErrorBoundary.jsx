import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error caught by boundary:', error);
    console.error('Error Info:', errorInfo);
    
    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // This would send to a service like Sentry, LogRocket, etc.
    console.log('Would send to error logging service:', { error, errorInfo });
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-3xl shadow-2xl border border-red-100 p-8 text-center">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="bg-red-100 p-6 rounded-full">
                  <AlertTriangle className="text-red-600" size={48} />
                </div>
              </div>

              {/* Error Message */}
              <h1 className="text-3xl font-black text-slate-900 mb-2">Oops!</h1>
              <p className="text-slate-600 font-medium mb-6">
                Something went wrong. Our team has been notified. Please try again.
              </p>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-left">
                  <p className="text-xs font-bold text-red-700 mb-2">Error Details:</p>
                  <p className="text-[11px] text-red-600 font-mono overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <p className="text-[10px] text-red-600 mt-3 font-mono overflow-auto max-h-20">
                      {this.state.errorInfo.componentStack}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleReset}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} /> Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Go Home
                </button>
              </div>

              {/* Error Count */}
              {this.state.errorCount > 3 && (
                <p className="text-xs text-slate-400 mt-4">
                  Experiencing persistent issues? Please contact support.
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
