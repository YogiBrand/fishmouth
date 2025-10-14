import React from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // In production, this could send to a logging service
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-6">
          <div className="max-w-xl w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-xl mb-6">
              <span className="text-2xl">🐟</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-8">
              The app hit an unexpected error. Please try reloading the page or head back home.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={this.handleReload} className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg transition">
                Reload
              </button>
              <Link to="/" className="px-6 py-3 rounded-xl font-semibold bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 shadow-sm transition">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }
    // eslint-disable-next-line react/prop-types
    return this.props.children;
  }
}

export default ErrorBoundary;





