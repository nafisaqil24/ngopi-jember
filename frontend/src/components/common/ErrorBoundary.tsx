import { Component, type ErrorInfo, type ReactNode } from "react";
import MainLayout from "../../layouts/MainLayout";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <MainLayout>
          <div className="mx-auto my-20 max-w-md rounded-2xl bg-red-50 p-8 text-center ring-1 ring-red-200">
            <h2 className="text-xl font-black text-red-900">Wah, halaman mengalami kendala.</h2>
            <p className="mt-3 text-sm text-red-700 leading-relaxed">
              Terjadi kesalahan tak terduga pada aplikasi. Silakan muat ulang halaman ini.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-terracotta px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-terracotta/90 transition"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </MainLayout>
      );
    }

    return this.props.children;
  }
}
