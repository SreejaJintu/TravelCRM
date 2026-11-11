import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardCharts from "../components/DashboardCharts";
import DashboardIcon from "../components/DashboardIcon";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRecentActivity from "../components/DashboardRecentActivity";
import { useAuth } from "../context/useAuth";
import { getDashboardSummary } from "../services/dashboardApi";

function localDateString(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function businessToday() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());
    const value = (type) => parts.find((part) => part.type === type).value;
    return new Date(Date.UTC(Number(value("year")), Number(value("month")) - 1, Number(value("day"))));
}

function periodFor(option) {
    const today = businessToday();
    const toDate = localDateString(today);
    if (option === "Today") return { fromDate: toDate, toDate };
    if (option === "This Week") {
        const from = new Date(today);
        from.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
        return { fromDate: localDateString(from), toDate };
    }
    if (option === "This Year") {
        return { fromDate: `${today.getUTCFullYear()}-01-01`, toDate };
    }
    return {
        fromDate: `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-01`,
        toDate
    };
}

function messageFrom(error) {
    return error.response?.data?.detail ||
        error.response?.data?.title ||
        error.message ||
        "Dashboard data could not be loaded.";
}

function formatCurrency(value, currency) {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
    } catch {
        return `${currency} ${Number(value).toFixed(2)}`;
    }
}

const cardDefinitions = [
    { label: "Total bookings", field: "totalBookings", icon: "bookings", accent: "teal" },
    { label: "Confirmed bookings", field: "confirmedBookings", icon: "bookingAdd", accent: "blue" },
    { label: "Upcoming trips", field: "upcomingTrips", icon: "plane", accent: "gold" },
    { label: "Total customers", field: "totalCustomers", icon: "customers", accent: "teal" },
    { label: "Total leads", field: "totalLeads", icon: "leads", accent: "blue" }
];

const moneyCards = [
    { label: "Revenue received", field: "totalRevenueReceived", icon: "payments", accent: "teal" },
    { label: "Outstanding balance", field: "outstandingBalance", icon: "reports", accent: "coral" },
    { label: "Pending payments", field: "pendingPayments", icon: "payments", accent: "gold" }
];

function DashboardCard({ label, value, icon, accent }) {
    const accentClasses = {
        teal: "bg-[#e2f2ed] text-[#21836f]",
        blue: "bg-[#e5eff8] text-[#477fac]",
        gold: "bg-[#f7f0dc] text-[#a17d27]",
        coral: "bg-[#fae9e3] text-[#c56f55]"
    };

    return (
        <article className="min-h-32 rounded-lg border border-[#e3ebe7] bg-white p-5 shadow-[0_3px_14px_rgba(27,65,57,0.035)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-[#647b76]">{label}</p>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accentClasses[accent]}`}>
                    <DashboardIcon name={icon} className="h-5 w-5" />
                </span>
            </div>
            <p className="mt-5 text-2xl font-semibold leading-tight text-[#203a36]">{value}</p>
        </article>
    );
}

function LoadingCards() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-lg border border-[#e3ebe7] bg-white p-5">
                    <div className="h-4 w-2/3 rounded bg-[#edf2ef]" />
                    <div className="mt-7 h-7 w-1/2 rounded bg-[#edf2ef]" />
                </div>
            ))}
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === "admin";
    const [period, setPeriod] = useState("This Month");
    const [range, setRange] = useState(() => periodFor("This Month"));
    const [search, setSearch] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [result, setResult] = useState({ key: null, summary: null, error: "" });
    const { fromDate, toDate } = range;
    const requestKey = `${fromDate}\u0000${toDate}\u0000${reloadKey}`;
    const loading = result.key !== requestKey;
    const summary = result.key === requestKey ? result.summary : null;
    const error = result.key === requestKey ? result.error : "";

    useEffect(() => {
        const controller = new AbortController();
        getDashboardSummary({ fromDate, toDate }, controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) {
                    setResult({ key: requestKey, summary: result, error: "" });
                }
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setResult({ key: requestKey, summary: null, error: messageFrom(requestError) });
                }
            });
        return () => controller.abort();
    }, [fromDate, toDate, reloadKey, requestKey]);

    const searchTerm = search.trim().toLocaleLowerCase();
    const filtered = useMemo(() => {
        if (!summary || !searchTerm) return summary;
        const includes = (...values) => values.some((value) =>
            String(value ?? "").toLocaleLowerCase().includes(searchTerm));
        return {
            ...summary,
            recentBookings: summary.recentBookings.filter((item) =>
                includes(item.bookingNumber, item.customerName, item.packageName, item.bookingStatus)),
            recentPayments: summary.recentPayments.filter((item) =>
                includes(item.bookingNumber, item.customerName, item.paymentMethod, item.paymentStatus)),
            upcomingTripsList: summary.upcomingTripsList.filter((item) =>
                includes(item.customerName, item.packageName, item.bookingStatus)),
            followUpsDueToday: summary.followUpsDueToday.filter((item) =>
                includes(item.customerName, item.followUpType, item.assignedStaff, item.followUpStatus))
        };
    }, [searchTerm, summary]);

    const selectPeriod = (value) => {
        setPeriod(value);
        if (value !== "Custom") setRange(periodFor(value));
    };

    const changeRange = (field, value) => {
        setPeriod("Custom");
        setRange((current) => ({ ...current, [field]: value }));
    };

    const cardValues = summary && [
        ...cardDefinitions.map((card) => ({
            ...card,
            value: summary[card.field]
        })),
        ...moneyCards.map((card) => ({
            ...card,
            value: summary.financials.length === 0
                ? formatCurrency(0, "INR")
                : summary.financials.map((financial) =>
                    formatCurrency(financial[card.field], financial.currency)).join(" · ")
        }))
    ];

    return (
        <DashboardLayout
            title={isAdmin ? "Admin dashboard" : "Dashboard"}
            search={search}
            onSearch={setSearch}
            searchLabel="Filter dashboard activity"
            searchPlaceholder="Search recent activity…"
        >
            <div className="mx-auto max-w-[1500px] space-y-6">
                <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52706b]">Agency overview</p>
                        <h1 className="mt-2 text-3xl font-semibold text-[#1d3533]">
                            Good day{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
                        </h1>
                        <p className="mt-2 text-sm text-[#667d79]">
                            Live business metrics, activity, and travel performance.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1 text-xs font-semibold text-[#526b65]">
                            Date range
                            <select
                                value={period}
                                onChange={(event) => selectPeriod(event.target.value)}
                                className="min-h-10 rounded-md border border-[#dce6e2] bg-white px-3 text-sm font-normal text-[#314a45]"
                            >
                                <option>Today</option>
                                <option>This Week</option>
                                <option>This Month</option>
                                <option>This Year</option>
                                <option value="Custom">Custom range</option>
                            </select>
                        </label>
                        {period === "Custom" && (
                            <>
                                <label className="flex flex-col gap-1 text-xs font-semibold text-[#526b65]">
                                    From
                                    <input type="date" value={range.fromDate} max={range.toDate} onChange={(event) => changeRange("fromDate", event.target.value)} className="min-h-10 rounded-md border border-[#dce6e2] bg-white px-3 text-sm font-normal text-[#314a45]" />
                                </label>
                                <label className="flex flex-col gap-1 text-xs font-semibold text-[#526b65]">
                                    To
                                    <input type="date" value={range.toDate} min={range.fromDate} onChange={(event) => changeRange("toDate", event.target.value)} className="min-h-10 rounded-md border border-[#dce6e2] bg-white px-3 text-sm font-normal text-[#314a45]" />
                                </label>
                            </>
                        )}
                    </div>
                </section>

                {error && (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        <span>{error}</span>
                        <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="font-semibold underline">Retry</button>
                    </div>
                )}

                {loading ? (
                    <LoadingCards />
                ) : summary && (
                    <>
                        <section aria-label="Business summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {cardValues.map((stat) => (
                                <DashboardCard key={stat.label} {...stat} />
                            ))}
                        </section>

                        <DashboardCharts data={summary} />

                        <DashboardRecentActivity
                            data={filtered}
                            currencyFormatter={formatCurrency}
                        />

                        <section className="flex flex-wrap gap-3 border-t border-[#e3ebe7] pt-5">
                            <Link to="/bookings" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d6e0dc] bg-white px-4 text-sm font-semibold text-[#397d70] hover:bg-[#edf6f2]">
                                <DashboardIcon name="bookings" className="h-4 w-4" />View bookings
                            </Link>
                            <Link to="/payments" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d6e0dc] bg-white px-4 text-sm font-semibold text-[#397d70] hover:bg-[#edf6f2]">
                                <DashboardIcon name="payments" className="h-4 w-4" />View payments
                            </Link>
                        </section>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
