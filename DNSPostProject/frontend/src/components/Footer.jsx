import React from 'react';

export function Footer({ hasSidebar = false }) {
    return (
        <footer className={`py-6 px-8 border-t border-slate-200 bg-white text-center text-xs text-slate-500 ${hasSidebar ? 'lg:ml-64' : ''}`}>
            <p className="font-semibold text-slate-700">AGMR College of Engineering — Examination Management System</p>
            <p className="text-[11px] text-slate-400 mt-1">Autonomous Examination Portal & Proctoring Engine • Final Year BE CSE</p>
        </footer>
    );
}

export default Footer;
