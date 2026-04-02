'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="text-center py-12">
            <p className="text-gray-500">Something went wrong</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
