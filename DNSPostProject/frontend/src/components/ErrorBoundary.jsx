import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[React Error Boundary]', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', padding: 24, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                    <div style={{ width: 64, height: 64, background: '#fdf2f4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <span className="material-symbols-outlined" style={{ color: '#a8364b', fontSize: 32 }}>error</span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#2d3335', marginBottom: 8 }}>Component Render Error</h2>
                    <p style={{ fontSize: 13, color: '#5a6062', maxWidth: 480, marginBottom: 20 }}>
                        {this.state.error?.message || 'An unexpected rendering error occurred.'}
                    </p>
                    <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/login'; }} style={{ background: '#2f56c8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                        Return to Login
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
