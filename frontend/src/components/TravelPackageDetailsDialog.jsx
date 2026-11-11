import CustomerDialog from "./CustomerDialog";

function price(value, currency) {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
    } catch {
        return `${currency} ${Number(value).toFixed(2)}`;
    }
}

export default function TravelPackageDetailsDialog({ packageData, isAdmin, onClose, onEdit }) {
    const cover = packageData.images.find((image) => image.isPrimary)?.imageUrl ?? packageData.coverImageUrl;
    return (
        <CustomerDialog title={packageData.packageName} description={`${packageData.packageCode} · ${packageData.destination}, ${packageData.country}`} onClose={onClose} width="max-w-4xl">
            <div className="max-h-[82vh] overflow-y-auto p-5 sm:p-7">
                {cover && <img src={cover} alt={`${packageData.packageName} cover`} className="max-h-[340px] w-full rounded-lg object-cover" />}
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        ["Destination", `${packageData.destination}, ${packageData.country}`],
                        ["Duration", `${packageData.durationDays} days / ${packageData.durationNights} nights`],
                        ["Type", packageData.packageType],
                        ["Starting price", price(packageData.basePrice, packageData.currency)],
                        ["Adult price", price(packageData.adultPrice, packageData.currency)],
                        ["Child price", price(packageData.childPrice, packageData.currency)],
                        ["Infant price", packageData.infantPrice === 0 ? `Free (${price(0, packageData.currency)})` : price(packageData.infantPrice, packageData.currency)],
                        ["Status", packageData.isActive ? "Active" : "Inactive"]
                    ].map(([label, value]) => <div key={label} className="rounded-md bg-[#f7faf8] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#82928d]">{label}</p><p className="mt-1 text-sm font-medium text-[#314a45]">{value}</p></div>)}
                </div>
                <section className="mt-6"><h3 className="text-sm font-semibold text-[#203a36]">About this package</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#526b65]">{packageData.description}</p></section>
                {packageData.images.length > 1 && <section className="mt-6"><h3 className="text-sm font-semibold text-[#203a36]">Gallery</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{packageData.images.filter((image) => !image.cleanupPending).map((image) => <img key={image.packageImageId} src={image.imageUrl} alt={`${packageData.packageName} gallery`} className="h-28 w-full rounded-md object-cover" />)}</div></section>}
                <section className="mt-6"><h3 className="text-sm font-semibold text-[#203a36]">Itinerary</h3><div className="mt-3 space-y-3">{packageData.itinerary.map((day) => <article key={day.itineraryId} className="rounded-md border border-[#e3ebe7] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#267d6d]">Day {day.dayNumber}</p><h4 className="mt-1 text-sm font-semibold text-[#314a45]">{day.title}</h4><p className="mt-1 text-sm text-[#667d77]">{day.description}</p>{(day.accommodation || day.mealsIncluded) && <p className="mt-2 text-xs text-[#82928d]">{[day.accommodation, day.mealsIncluded].filter(Boolean).join(" · ")}</p>}</article>)}{packageData.itinerary.length === 0 && <p className="text-xs text-[#82928d]">Itinerary details coming soon.</p>}</div></section>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <section><h3 className="text-sm font-semibold text-[#203a36]">Included</h3><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#526b65]">{packageData.inclusions.map((item) => <li key={item.id}>{item.description}</li>)}</ul>{packageData.inclusions.length === 0 && <p className="mt-2 text-xs text-[#82928d]">No inclusions listed.</p>}</section>
                    <section><h3 className="text-sm font-semibold text-[#203a36]">Not included</h3><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#526b65]">{packageData.exclusions.map((item) => <li key={item.id}>{item.description}</li>)}</ul>{packageData.exclusions.length === 0 && <p className="mt-2 text-xs text-[#82928d]">No exclusions listed.</p>}</section>
                </div>
                <footer className="mt-7 flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Close</button>
                    {isAdmin && <button type="button" onClick={onEdit} className="min-h-10 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125956]">Edit package</button>}
                </footer>
            </div>
        </CustomerDialog>
    );
}
