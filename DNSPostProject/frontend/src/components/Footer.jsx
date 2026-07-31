import React from 'react';

export function Footer({ hasSidebar = false }) {
    return (
        <footer className="site-footer" style={{ marginLeft: hasSidebar ? 260 : 0 }}>
            <p className="font-bold">AGMR College of Engineering — Online Examination System</p>
            <p className="text-xs opacity-75 mt-1">Developer: Sayed Zaid Kazi | Production SaaS v3.0</p>
        </footer>
    );
}
