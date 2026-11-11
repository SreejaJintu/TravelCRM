import { useMemo, useState } from "react";

const statusColors = {
    Inquiry: "#78928b",
    Quotation: "#6687a5",
    Pending: "#d0a640",
    Confirmed: "#23836f",
    Cancelled: "#c56f55",
    Completed: "#4b9468"
};
const funnelColors = ["#9ab9af", "#65998b", "#357d70", "#176b68"];
const chartGrid = "#e8efec";

function ChartPanel({ title, description, children, className = "" }) {
    return (
        <section className={`min-w-0 rounded-lg border border-[#e3ebe7] bg-white p-5 shadow-[0_3px_14px_rgba(27,65,57,0.035)] sm:p-6 ${className}`}>
            <div className="mb-4">
                <h2 className="text-sm font-semibold text-[#29443e]">{title}</h2>
                {description && <p className="mt-1 text-xs text-[#7b8d88]">{description}</p>}
            </div>
            {children}
        </section>
    );
}

function EmptyChart() {
    return <p className="grid min-h-48 place-items-center text-center text-sm text-[#82928d]">No data for this date range.</p>;
}

function monthLabel(value) {
    const [year, month] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" })
        .format(new Date(year, month - 1, 1));
}

function formatCompact(value) {
    return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function LineChart({ points, valueFormatter = formatCompact, color = "#23836f" }) {
    if (points.length === 0) return <EmptyChart />;
    const width = 620;
    const height = 235;
    const left = 48;
    const right = 12;
    const top = 12;
    const bottom = 40;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const max = Math.max(...points.map((point) => point.value), 1);
    const coords = points.map((point, index) => ({
        ...point,
        x: left + (points.length === 1 ? plotWidth / 2 : (index * plotWidth) / (points.length - 1)),
        y: top + plotHeight - (point.value / max) * plotHeight
    }));
    const path = coords.map((point) => `${point.x},${point.y}`).join(" ");

    return (
        <div className="w-full overflow-x-auto">
            <svg role="img" aria-label="Monthly trend chart" viewBox={`0 0 ${width} ${height}`} className="h-56 min-w-[420px] w-full">
                {[0, 0.5, 1].map((fraction) => {
                    const y = top + plotHeight * fraction;
                    return (
                        <g key={fraction}>
                            <line x1={left} x2={width - right} y1={y} y2={y} stroke={chartGrid} />
                            <text x={left - 8} y={y + 4} textAnchor="end" fill="#82928d" fontSize="10">
                                {valueFormatter(max * (1 - fraction))}
                            </text>
                        </g>
                    );
                })}
                <polyline points={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                {coords.map((point) => (
                    <g key={point.label}>
                        <circle cx={point.x} cy={point.y} r="4" fill="white" stroke={color} strokeWidth="2">
                            <title>{`${monthLabel(point.label)}: ${valueFormatter(point.value)}`}</title>
                        </circle>
                    </g>
                ))}
                {coords.filter((_, index) => index === 0 || index === coords.length - 1 || index % Math.ceil(coords.length / 6) === 0).map((point) => (
                    <text key={point.label} x={point.x} y={height - 12} textAnchor="middle" fill="#82928d" fontSize="10">
                        {monthLabel(point.label)}
                    </text>
                ))}
            </svg>
        </div>
    );
}

function BookingTrend({ items }) {
    return (
        <ChartPanel title="Monthly booking trends" description="Bookings grouped by their creation month.">
            <LineChart points={items.map((item) => ({ label: item.month, value: item.totalBookings }))} />
        </ChartPanel>
    );
}

function RevenueTrend({ items }) {
    const currencies = useMemo(() => [...new Set(items.map((item) => item.currency))].sort(), [items]);
    const [currency, setCurrency] = useState("");
    const selectedCurrency = currencies.includes(currency) ? currency : currencies[0];
    const points = items
        .filter((item) => item.currency === selectedCurrency)
        .map((item) => ({ label: item.month, value: item.revenueReceived }));

    return (
        <ChartPanel
            title="Monthly revenue received"
            description="Completed payments minus completed refunds, by payment date."
        >
            {currencies.length > 1 && (
                <label className="mb-2 flex items-center justify-end gap-2 text-xs text-[#71847e]">
                    Currency
                    <select value={selectedCurrency} onChange={(event) => setCurrency(event.target.value)} className="rounded border border-[#dce6e2] bg-white px-2 py-1 text-[#314a45]">
                        {currencies.map((item) => <option key={item}>{item}</option>)}
                    </select>
                </label>
            )}
            {selectedCurrency
                ? <LineChart points={points} valueFormatter={formatCompact} color="#477fac" />
                : <EmptyChart />}
        </ChartPanel>
    );
}

function BookingStatusChart({ items }) {
    const allStatuses = ["Inquiry", "Quotation", "Pending", "Confirmed", "Cancelled", "Completed"];
    const counts = allStatuses.map((status) => ({
        status,
        count: items.find((item) => item.bookingStatus === status)?.count ?? 0
    }));
    const total = counts.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) {
        return <ChartPanel title="Booking status distribution"><EmptyChart /></ChartPanel>;
    }

    const radius = 62;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <ChartPanel title="Booking status distribution" description="Current persisted booking statuses in the selected period.">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
                <svg role="img" aria-label="Booking status distribution donut chart" viewBox="0 0 180 180" className="h-44 w-44 shrink-0">
                    <circle cx="90" cy="90" r={radius} fill="none" stroke="#edf2ef" strokeWidth="24" />
                    {counts.filter((item) => item.count > 0).map((item) => {
                        const length = (item.count / total) * circumference;
                        const circle = (
                            <circle
                                key={item.status}
                                cx="90"
                                cy="90"
                                r={radius}
                                fill="none"
                                stroke={statusColors[item.status]}
                                strokeWidth="24"
                                strokeDasharray={`${length} ${circumference - length}`}
                                strokeDashoffset={-offset}
                                transform="rotate(-90 90 90)"
                            >
                                <title>{`${item.status}: ${item.count}`}</title>
                            </circle>
                        );
                        offset += length;
                        return circle;
                    })}
                    <text x="90" y="86" textAnchor="middle" fill="#29443e" fontSize="22" fontWeight="700">{total}</text>
                    <text x="90" y="105" textAnchor="middle" fill="#82928d" fontSize="10">bookings</text>
                </svg>
                <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-xs sm:w-auto sm:grid-cols-1">
                    {counts.map((item) => (
                        <li key={item.status} className="flex items-center gap-2 text-[#526b65]">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[item.status] }} />
                            <span>{item.status}</span>
                            <span className="ml-auto font-semibold text-[#314a45]">{item.count}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </ChartPanel>
    );
}

function PopularPackages({ items }) {
    const max = Math.max(...items.map((item) => item.bookingCount), 1);
    return (
        <ChartPanel title="Popular travel packages" description="Most-booked packages in the selected period.">
            {items.length === 0 ? <EmptyChart /> : (
                <ul className="space-y-4 py-2">
                    {items.map((item) => (
                        <li key={item.packageName} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                            <span className="truncate text-xs font-medium text-[#526b65]" title={item.packageName}>{item.packageName}</span>
                            <span className="text-xs font-semibold text-[#314a45]">{item.bookingCount}</span>
                            <span className="col-span-2 h-2 overflow-hidden rounded-full bg-[#edf2ef]">
                                <span className="block h-full rounded-full bg-[#23836f]" style={{ width: `${(item.bookingCount / max) * 100}%` }} />
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </ChartPanel>
    );
}

function LeadFunnel({ data }) {
    const stages = [
        ["New", data.newLeads],
        ["Contacted", data.contactedLeads],
        ["Qualified", data.qualifiedLeads],
        ["Converted", data.convertedLeads]
    ];
    const max = Math.max(...stages.map(([, count]) => count), 1);
    return (
        <ChartPanel title="Lead conversion funnel" description="Leads currently in each persisted status.">
            <div className="space-y-4 py-2">
                {stages.map(([label, count], index) => (
                    <div key={label} className="grid grid-cols-[82px_minmax(0,1fr)_40px] items-center gap-3">
                        <span className="text-xs font-medium text-[#526b65]">{label}</span>
                        <div className="h-7 overflow-hidden rounded bg-[#edf2ef]">
                            <div className="flex h-full items-center rounded px-2 text-[10px] font-semibold text-white" style={{ width: `${Math.max(count > 0 ? 8 : 0, (count / max) * 100)}%`, backgroundColor: funnelColors[index] }}>
                                {count > 0 ? label : ""}
                            </div>
                        </div>
                        <span className="text-right text-xs font-semibold text-[#314a45]">{count}</span>
                    </div>
                ))}
            </div>
        </ChartPanel>
    );
}

export default function DashboardCharts({ data }) {
    return (
        <section aria-label="Business analytics" className="grid min-w-0 gap-5 xl:grid-cols-2">
            <BookingTrend items={data.bookingTrends} />
            <RevenueTrend items={data.revenueTrends} />
            <BookingStatusChart items={data.bookingStatusDistribution} />
            <PopularPackages items={data.popularPackages} />
            <LeadFunnel data={data.leadFunnel} />
        </section>
    );
}
