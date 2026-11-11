const iconPaths = {
    dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    customers: <><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="7.5" r="3.5" /><path d="M17 11a3.5 3.5 0 0 0 0-6.8M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" /></>,
    leads: <><path d="M4 20v-1.5A3.5 3.5 0 0 1 7.5 15h4A3.5 3.5 0 0 1 15 18.5V20" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="M17 8h4M19 6v4M17.5 15.5 19 17l3-3" /></>,
    followUps: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M7 2v4M17 2v4M3 9h18M7 13h4M7 17h2M15 14l1.5 1.5L20 12" /></>,
    packages: <><path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9L12 3Z" /><path d="m3.8 7.7 8.2 4.5 8.2-4.5M12 12.2V21M7.5 5.4l8.4 4.5" /></>,
    bookings: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" /></>,
    payments: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /><path d="m3 7 5-3 5 5 7-5" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    notification: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    customersAdd: <><circle cx="9" cy="8" r="4" /><path d="M2.5 20v-1a5.5 5.5 0 0 1 5.5-5.5h2a5.5 5.5 0 0 1 4.3 2M19 14v7M15.5 17.5h7" /></>,
    bookingAdd: <><rect x="3.5" y="5" width="14" height="15" rx="2" /><path d="M7 3v4M14 3v4M3.5 10h14M21 7v7M17.5 10.5h7" /></>,
    packageAdd: <><path d="m11 3 8 4.5v9L11 21l-8-4.5v-9L11 3Z" /><path d="m3.3 7.7 7.7 4.4 7.7-4.4M11 12.1V21M20 4v6M17 7h6" /></>,
    arrowUp: <><path d="m7 14 5-5 5 5M12 9v11" /></>,
    plane: <><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" /></>,
    travelers: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-1.5a5 5 0 0 1 10 0V20M16 11a3 3 0 1 0-1.2-5.8M17 15a4.5 4.5 0 0 1 4 4.5V20" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    chevronLeft: <><path d="m15 18-6-6 6-6" /></>,
    chevronRight: <><path d="m9 18 6-6-6-6" /></>
};

export default function DashboardIcon({ name, className = "h-5 w-5" }) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            viewBox="0 0 24 24"
        >
            {iconPaths[name] || iconPaths.dashboard}
        </svg>
    );
}