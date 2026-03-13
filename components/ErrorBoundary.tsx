import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'An unexpected error occurred.';
      let isFirestoreError = false;
      
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.operationType) {
          isFirestoreError = true;
          errorMessage = `데이터베이스 접근 권한이 없거나 오류가 발생했습니다. (${parsed.operationType})`;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">오류가 발생했습니다</h2>
            <p className="text-gray-600 text-sm">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-blue-700 transition-colors mt-4"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
