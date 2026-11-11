import DashboardIcon from "./DashboardIcon";

const statusStyles = {
    Confirmed: "bg-[#e3f3ed] text-[#237761]",
    Pending: "bg-[#f8f0db] text-[#987522]",
    Processing: "bg-[#e6eef8] text-[#4c7095]"
};

export default function RecentBookings({ bookings }) {
    return (
        <section className="min-w-0 rounded-lg border border-[#e3ebe7] bg-white shadow-[0_3px_14px_rgba(27,65,57,0.035)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9efec] px-5 py-5 sm:px-6">
                <div>
                    <h2 className="font-semibold text-[#203a36]">Recent bookings</h2>
                    <p className="mt-1 text-xs text-[#7c8f89]">Latest traveler reservations</p>
                </div>
                <button type="button" className="rounded-md px-3 py-2 text-xs font-semibold text-[#176b68] transition hover:bg-[#edf6f2] focus-visible:outline-2 focus-visible:outline-[#176b68]">
                    View all
                </button>
            </div>
            {bookings.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-[#71847e]">No bookings match your search.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                        <thead>
                            <tr className="bg-[#f8faf9] text-[10px] font-bold uppercase tracking-[0.08em] text-[#83938e]">
                                <th scope="col" className="px-5 py-3.5 sm:px-6">Booking ID</th>
                                <th scope="col" className="px-4 py-3.5">Customer</th>
                                <th scope="col" className="px-4 py-3.5">Destination</th>
                                <th scope="col" className="px-4 py-3.5">Travel date</th>
                                <th scope="col" className="px-4 py-3.5">Status</th>
                                <th scope="col" className="px-5 py-3.5 text-right sm:px-6">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf1ef] text-xs">
                            {bookings.map((booking) => (
                                <tr key={booking.id} className="transition hover:bg-[#fbfcfb]">
                                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#347c70] sm:px-6">{booking.id}</td>
                                    <td className="whitespace-nowrap px-4 py-4 font-medium text-[#314a45]">{booking.customer}</td>
                                    <td className="whitespace-nowrap px-4 py-4 text-[#71847e]">{booking.destination}</td>
                                    <td className="whitespace-nowrap px-4 py-4 text-[#71847e]">{booking.travelDate}</td>
                                    <td className="whitespace-nowrap px-4 py-4">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[booking.status] || "bg-[#edf1ef] text-[#647b76]"}`}>
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-[#314a45] sm:px-6">{booking.amount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="flex items-center justify-between border-t border-[#e9efec] px-5 py-3.5 text-[11px] text-[#81918c] sm:px-6">
                <span>Showing {bookings.length} sample bookings</span>
                <button type="button" aria-label="More booking options" className="rounded p-1 text-[#7b8d88] hover:bg-[#f2f7f5] hover:text-[#176b68] focus-visible:outline-2 focus-visible:outline-[#176b68]">
                    <DashboardIcon name="more" className="h-5 w-5" />
                </button>
            </div>
        </section>
    );
}