function formatDate(value, dateOnly = false) {
    if (!value) return "—";
    const date = dateOnly
        ? new Date(`${String(value).slice(0, 10)}T00:00:00`)
        : new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : new Intl.DateTimeFormat(undefined, dateOnly
            ? { year: "numeric", month: "short", day: "numeric" }
            : { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Section({ title, children }) {
    return (
        <section className="min-w-0 rounded-lg border border-[#e3ebe7] bg-white shadow-[0_3px_14px_rgba(27,65,57,0.035)]">
            <h2 className="border-b border-[#e9efec] px-5 py-4 text-sm font-semibold text-[#29443e]">{title}</h2>
            {children}
        </section>
    );
}

function EmptyState({ children }) {
    return <p className="px-5 py-8 text-center text-sm text-[#82928d]">{children}</p>;
}

function RecentBookings({ items, currencyFormatter }) {
    return (
        <Section title="Recent bookings">
            {items.length === 0 ? <EmptyState>No bookings in this date range.</EmptyState> : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left text-xs">
                        <thead className="bg-[#f8faf9] text-[10px] uppercase tracking-wide text-[#83938e]">
                            <tr>
                                <th className="px-4 py-3">Booking number</th><th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Package</th><th className="px-4 py-3">Travel date</th>
                                <th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Booking total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf1ef]">
                            {items.map((item) => (
                                <tr key={item.bookingNumber}>
                                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#397d70]">{item.bookingNumber}</td>
                                    <td className="px-4 py-3 font-medium text-[#314a45]">{item.customerName}</td>
                                    <td className="px-4 py-3 text-[#667d77]">{item.packageName}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-[#667d77]">{formatDate(item.travelStartDate, true)}</td>
                                    <td className="px-4 py-3 text-[#667d77]">{item.bookingStatus}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#314a45]">{currencyFormatter(item.bookingTotal, item.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Section>
    );
}

function RecentPayments({ items, currencyFormatter }) {
    return (
        <Section title="Recent payments">
            {items.length === 0 ? <EmptyState>No payments in this date range.</EmptyState> : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-xs">
                        <thead className="bg-[#f8faf9] text-[10px] uppercase tracking-wide text-[#83938e]">
                            <tr>
                                <th className="px-4 py-3">Payment date</th><th className="px-4 py-3">Booking</th>
                                <th className="px-4 py-3">Customer</th><th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf1ef]">
                            {items.map((item, index) => (
                                <tr key={`${item.bookingNumber}-${item.paymentDate}-${index}`}>
                                    <td className="whitespace-nowrap px-4 py-3 text-[#667d77]">{formatDate(item.paymentDate)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#397d70]">{item.bookingNumber}</td>
                                    <td className="px-4 py-3 font-medium text-[#314a45]">{item.customerName}</td>
                                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#314a45]">{currencyFormatter(item.amount, item.currency)}</td>
                                    <td className="px-4 py-3 text-[#667d77]">{item.paymentMethod}</td>
                                    <td className="px-4 py-3 text-[#667d77]">{item.paymentStatus}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Section>
    );
}

function UpcomingTrips({ items }) {
    return (
        <Section title="Upcoming trips">
            {items.length === 0 ? <EmptyState>No upcoming trips in this date range.</EmptyState> : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-xs">
                        <thead className="bg-[#f8faf9] text-[10px] uppercase tracking-wide text-[#83938e]">
                            <tr>
                                <th className="px-4 py-3">Customer</th><th className="px-4 py-3">Package</th>
                                <th className="px-4 py-3">Travel start</th><th className="px-4 py-3">Travel end</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf1ef]">
                            {items.map((item, index) => (
                                <tr key={`${item.customerName}-${item.travelStartDate}-${index}`}>
                                    <td className="px-4 py-3 font-medium text-[#314a45]">{item.customerName}</td>
                                    <td className="px-4 py-3 text-[#667d77]">{item.packageName}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-[#667d77]">{formatDate(item.travelStartDate, true)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-[#667d77]">{formatDate(item.travelEndDate, true)}</td>
                                    <td className="px-4 py-3 text-[#667d77]">{item.bookingStatus}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Section>
    );
}

function DueFollowUps({ items }) {
    return (
        <Section title="Follow-ups due today">
            {items.length === 0 ? <EmptyState>No pending follow-ups due today.</EmptyState> : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-xs">
                        <thead className="bg-[#f8faf9] text-[10px] uppercase tracking-wide text-[#83938e]">
                            <tr>
                                <th className="px-4 py-3">Customer / lead</th><th className="px-4 py-3">Follow-up date</th>
                                <th className="px-4 py-3">Type</th><th className="px-4 py-3">Assigned staff</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf1ef]">
                            {items.map((item, index) => (
                                <tr key={`${item.customerName}-${item.followUpDate}-${index}`}>
                                    <td className="px-4 py-3 font-medium text-[#314a45]">{item.customerName}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-[#667d77]">{formatDate(item.followUpDate)}</td>
                                    <td className="px-4 py-3 text-[#667d77]">{item.followUpType}</td>
                                    <td className="px-4 py-3 text-[#667d77]">{item.assignedStaff}</td>
                                    <td className="px-4 py-3 text-[#667d77]">{item.followUpStatus}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Section>
    );
}

export default function DashboardRecentActivity({ data, currencyFormatter }) {
    return (
        <div className="space-y-5">
            <RecentBookings items={data.recentBookings} currencyFormatter={currencyFormatter} />
            <RecentPayments items={data.recentPayments} currencyFormatter={currencyFormatter} />
            <div className="grid gap-5 xl:grid-cols-2">
                <UpcomingTrips items={data.upcomingTripsList} />
                <DueFollowUps items={data.followUpsDueToday} />
            </div>
        </div>
    );
}
