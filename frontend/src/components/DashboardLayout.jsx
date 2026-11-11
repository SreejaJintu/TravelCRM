import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DashboardIcon from "./DashboardIcon";

const navigation = [
    { label: "Dashboard", icon: "dashboard", path: "/dashboard" },
    { label: "Customers", icon: "customers", path: "/customers" },
    { label: "Leads", icon: "leads", path: "/leads" },
    { label: "Follow-ups", icon: "followUps", path: "/follow-ups" },
    { label: "Travel packages", icon: "packages", path: "/travel-packages" },
    { label: "Bookings", icon: "bookings", path: "/bookings" },
    { label: "Payments", icon: "payments", path: "/payments" },
    { label: "Reports", icon: "reports", path: "/reports" }
];

function initialsFor(name) {
    return name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
}

function Sidebar({ user, onLogout, onNavigate, onClose, mobile = false }) {
    const location = useLocation();
    return (
        <aside className={`flex h-full w-[260px] shrink-0 flex-col bg-[#163d3b] text-white ${mobile ? "shadow-2xl" : ""}`}>
            <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-6">
                <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e6c96f] text-lg font-black text-[#163d3b]">T</span>
                    <div>
                        <p className="text-sm font-bold tracking-wide">TRAVEL CRM</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[#a9c5bd]">Agency workspace</p>
                    </div>
                </div>
                {mobile && (
                    <button type="button" onClick={onClose} aria-label="Close navigation" className="rounded-md p-2 text-[#c5d8d1] hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
                        <DashboardIcon name="close" />
                    </button>
                )}
            </div>

            <div className="px-4 pt-7">
                <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#85a69c]">Workspace</p>
                <nav aria-label="Main navigation" className="mt-3 space-y-1">
                    {navigation.map((item) => {
                        const path = item.label === "Dashboard" && user?.role?.toLowerCase() === "admin"
                            ? "/admin/dashboard"
                            : item.path;
                        const active = path === location.pathname;
                        const className = `group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c96f] ${active ? "bg-[#225b55] text-white shadow-sm" : "text-[#c2d5ce] hover:bg-white/10 hover:text-white"}`;
                        const content = (
                            <>
                                <DashboardIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                                <span className="flex-1">{item.label}</span>
                                {!path && <span className="text-[9px] font-medium text-[#89a89f]">SOON</span>}
                            </>
                        );

                        return path ? (
                            <Link
                                key={item.label}
                                to={path}
                                onClick={() => mobile && onClose()}
                                aria-current={active ? "page" : undefined}
                                className={className}
                            >
                                {content}
                            </Link>
                        ) : (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                    onNavigate(item.label);
                                    if (mobile) onClose();
                                }}
                                className={className}
                            >
                                {content}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-4">
                <div className="mb-4 rounded-md border border-white/10 bg-white/[0.05] p-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#b9ddd1] text-xs font-bold text-[#163d3b]">{initialsFor(user?.fullName)}</span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-white">{user?.fullName}</p>
                            <p className="mt-0.5 truncate text-[11px] text-[#a9c5bd]">{user?.email}</p>
                        </div>
                    </div>
                </div>
                <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[#c2d5ce] transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c96f]">
                    <DashboardIcon name="logout" className="h-[18px] w-[18px]" />
                    Log out
                </button>
            </div>
        </aside>
    );
}

function TopNavbar({ user, title, search, onSearch, searchLabel, searchPlaceholder, onOpenMenu, onLogout }) {
    return (
        <header className="sticky top-0 z-20 border-b border-[#e1e9e6] bg-white/95 backdrop-blur">
            <div className="flex min-h-[76px] items-center gap-3 px-4 sm:gap-4 sm:px-7 lg:px-9">
                <button type="button" onClick={onOpenMenu} aria-label="Open navigation" className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#e0e9e5] text-[#45635e] hover:bg-[#f4f8f6] focus-visible:outline-2 focus-visible:outline-[#176b68] lg:hidden">
                    <DashboardIcon name="menu" />
                </button>
                <h2 className="text-base font-semibold text-[#1d3533] sm:text-lg">{title}</h2>

                <label className="relative ml-auto hidden w-full max-w-[340px] md:block">
                    <span className="sr-only">{searchLabel}</span>
                    <DashboardIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#849690]" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => onSearch(event.target.value)}
                        placeholder={searchPlaceholder}
                        className="h-10 w-full rounded-md border border-[#e0e9e5] bg-[#f8faf9] pl-10 pr-3 text-sm text-[#20332f] outline-none transition placeholder:text-[#899792] focus:border-[#176b68] focus:bg-white focus:ring-4 focus:ring-[#176b68]/10"
                    />
                </label>

                <button type="button" aria-label="Notifications" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-md text-[#607570] transition hover:bg-[#f2f7f5] hover:text-[#176b68] focus-visible:outline-2 focus-visible:outline-[#176b68]">
                    <DashboardIcon name="notification" />
                    <span className="absolute right-[9px] top-[8px] h-2 w-2 rounded-full border-2 border-white bg-[#e58668]" />
                </button>

                <div className="hidden h-8 w-px bg-[#e1e9e6] sm:block" />
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dcece6] text-xs font-bold text-[#225b55]">{initialsFor(user?.fullName)}</span>
                    <div className="hidden min-w-0 xl:block">
                        <p className="max-w-[150px] truncate text-sm font-semibold text-[#29423d]">{user?.fullName}</p>
                        <p className="text-[11px] text-[#7b8d88]">{user?.role}</p>
                    </div>
                    <span className="hidden max-w-[105px] truncate text-xs font-semibold text-[#29423d] sm:inline xl:hidden">{user?.fullName}</span>
                    <button type="button" onClick={onLogout} className="ml-1 hidden rounded-md px-2.5 py-2 text-xs font-semibold text-[#48635d] hover:bg-[#f2f7f5] hover:text-[#176b68] focus-visible:outline-2 focus-visible:outline-[#176b68] xl:block">
                        Log out
                    </button>
                </div>
            </div>
            <div className="px-4 pb-3 sm:px-7 md:hidden">
                <label className="relative block">
                    <span className="sr-only">{searchLabel}</span>
                    <DashboardIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#849690]" />
                    <input type="search" value={search ?? ""} onChange={(event) => onSearch?.(event.target.value)} placeholder={searchPlaceholder} className="h-10 w-full rounded-md border border-[#e0e9e5] bg-[#f8faf9] pl-10 pr-3 text-sm text-[#20332f] outline-none placeholder:text-[#899792] focus:border-[#176b68] focus:bg-white focus:ring-4 focus:ring-[#176b68]/10" />
                </label>
            </div>
        </header>
    );
}

export default function DashboardLayout({
    children,
    title = "Dashboard",
    search = "",
    searchLabel = "Search bookings and trips",
    searchPlaceholder = "Search bookings, travelers...",
    onSearch = () => {},
    onPlaceholderNavigation = () => {}
}) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <div className="min-h-screen bg-[#f4f7f6]">
            <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
                <Sidebar user={user} onLogout={handleLogout} onNavigate={onPlaceholderNavigation} />
            </div>
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
                    <button type="button" className="absolute inset-0 bg-[#102e2c]/60" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} />
                    <div className="relative h-full">
                        <Sidebar user={user} onLogout={handleLogout} onNavigate={onPlaceholderNavigation} onClose={() => setMobileMenuOpen(false)} mobile />
                    </div>
                </div>
            )}
            <div className="min-h-screen lg:pl-[260px]">
                <TopNavbar user={user} title={title} search={search} onSearch={onSearch} searchLabel={searchLabel} searchPlaceholder={searchPlaceholder} onOpenMenu={() => setMobileMenuOpen(true)} onLogout={handleLogout} />
                <main className="px-4 py-7 sm:px-7 sm:py-9 lg:px-9">
                    {children}
                </main>
            </div>
        </div>
    );
}