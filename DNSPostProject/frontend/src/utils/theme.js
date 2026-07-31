/**
 * Theme Manager Utility
 */
export const ThemeManager = {
    init() {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        this.apply(theme);
    },
    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    },
    toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.apply(next);
        return next;
    },
    get current() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }
};
