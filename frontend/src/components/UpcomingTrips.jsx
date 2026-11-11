import DashboardIcon from "./DashboardIcon";

const markerStyles = {
    teal: "bg-[#e2f2ed] text-[#21836f]",
    coral: "bg-[#fae9e3] text-[#c56f55]",
    gold: "bg-[#f7f0dc] text-[#a17d27]"
};

const statusStyles = {
    Confirmed: "text-[#237761]",
    Pending: "text-[#987522]"
};

export default function UpcomingTrips({ trips }) {
    return (
        <section className="rounded-lg border border-[#e3ebe7] bg-white shadow-[0_3px_14px_rgba(27,65,57,0.035)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e9efec] px-5 py-5">
                <div>
                    <h2 className="font-semibold text-[#203a36]">Upcoming trips</h2>
                    <p className="mt-1 text-xs text-[#7c8f89]">Next departures</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e7f2ee] text-[#348574]">
                    <DashboardIcon name="plane" className="h-[18px] w-[18px]" />
                </span>
            </div>
            {trips.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[#71847e]">No trips match your search.</p>
            ) : (
                <ul className="divide-y divide-[#edf1ef] px-5">
                    {trips.map((trip) => (
                        <li key={`${trip.customer}-${trip.destination}`} className="flex gap-3.5 py-4">
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${markerStyles[trip.color] || markerStyles.teal}`}>
                                <DashboardIcon name="plane" className="h-[18px] w-[18px]" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                                    <h3 className="truncate text-sm font-semibold text-[#314a45]">{trip.destination}</h3>
                                    <span className={`text-[10px] font-semibold ${statusStyles[trip.status] || "text-[#647b76]"}`}>{trip.status}</span>
                                </div>
                                <p className="mt-1 truncate text-xs text-[#71847e]">{trip.customer}</p>
                                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-[#82928d]">
                                    <span className="inline-flex items-center gap-1.5"><DashboardIcon name="calendar" className="h-3.5 w-3.5" />{trip.travelDate}</span>
                                    <span className="inline-flex items-center gap-1.5"><DashboardIcon name="travelers" className="h-3.5 w-3.5" />{trip.travelers} travelers</span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <div className="border-t border-[#e9efec] px-5 py-3.5">
                <p className="text-[11px] text-[#81918c]">Showing sample itineraries</p>
            </div>
        </section>
    );
}