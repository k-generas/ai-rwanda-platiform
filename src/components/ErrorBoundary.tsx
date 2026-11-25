import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.'
    };
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.error && parsed.operationType) {
          friendlyMessage = `Database ${parsed.operationType} error on "${parsed.path ?? 'collection'}": ${parsed.error}`;
        }
      } catch {
        // Non-JSON message
      }

      return (
        <div className="min-h-screen bg-[#F9F9FB] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-black/10 rounded-2xl p-8">
            <p className="text-xs font-medium text-[#5D5D66] mb-2">Application Recovery</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0D0D0F] mb-3">
              Something interrupted this view
            </h1>
            <p className="text-sm text-[#5D5D66] leading-relaxed mb-6 break-words">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-black/85 transition-colors"
            >
              Reload platform
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
