import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Não expõe stack trace ou estado interno no console em produção
  }

  handleReload = () => {
    this.setState({ hasError: false });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            backgroundColor: 'var(--background, #f8fafc)',
            color: 'var(--text-primary, #0f172a)',
            fontFamily: 'inherit',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '2rem',
              textAlign: 'center',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--border, #e2e8f0)',
              backgroundColor: 'var(--surface, #ffffff)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <ShieldAlert size={26} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Não foi possível exibir esta seção
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #64748b)',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
              }}
            >
              Ocorreu uma falha temporária na visualização. Nenhum dado foi comprometido.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
              }}
            >
              <RotateCcw size={16} /> Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
