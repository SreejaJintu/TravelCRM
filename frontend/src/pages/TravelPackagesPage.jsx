import { useCallback, useEffect, useMemo, useState } from "react";
import CustomerDialog from "../components/CustomerDialog";
import DashboardIcon from "../components/DashboardIcon";
import DashboardLayout from "../components/DashboardLayout";
import TravelPackageDetailsDialog from "../components/TravelPackageDetailsDialog";
import TravelPackageFormDialog from "../components/TravelPackageFormDialog";
import { useAuth } from "../context/useAuth";
import { getLeadErrorMessage } from "../utils/leadErrors";
import { getTravelPackage, getTravelPackages, setTravelPackageActive } from "../services/travelPackageApi";

const pageSize = 12;
const fieldClass = "min-h-10 w-full rounded-md border border-[#d6e0dc] bg-white px-3 text-sm text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10";

function formatPrice(value, currency) {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
    } catch {
        return `${currency} ${Number(value).toFixed(2)}`;
    }
}

function PackageCard({ packageData, isAdmin, onView, onEdit, onToggleActive }) {
    return (
        <article className="overflow-hidden rounded-lg border border-[#e3ebe7] bg-white shadow-[0_3px_14px_rgba(27,65,57,0.035)]">
            <button type="button" onClick={() => onView(packageData)} className="block w-full text-left">
                {packageData.coverImageUrl
                    ? <img src={packageData.coverImageUrl} alt={`${packageData.packageName} cover`} loading="lazy" className="h-48 w-full object-cover" />
                    : <div className="grid h-48 place-items-center bg-[#eaf4f0] text-[#338374]"><DashboardIcon name="packages" className="h-12 w-12" /></div>}
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-[#71847e]">{packageData.packageCode} · {packageData.packageType}</p><h2 className="mt-1 truncate text-base font-semibold text-[#203a36]">{packageData.packageName}</h2><p className="mt-1 text-xs text-[#71847e]">{packageData.destination}, {packageData.country}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${packageData.isActive ? "bg-[#e3f3ed] text-[#237761]" : "bg-[#edf1ef] text-[#667772]"}`}>{packageData.isActive ? "Active" : "Inactive"}</span></div>
                    <div className="mt-4 flex items-end justify-between border-t border-[#edf1ef] pt-3"><p className="text-xs text-[#71847e]">{packageData.durationDays} days · {packageData.durationNights} nights</p><div className="text-right"><p className="text-sm font-bold text-[#267d6d]">From {formatPrice(packageData.basePrice, packageData.currency)}</p><p className="mt-1 text-[11px] text-[#71847e]">Infant: {packageData.infantPrice === 0 ? "Free" : formatPrice(packageData.infantPrice, packageData.currency)}</p></div></div>
                </div>
            </button>
            {isAdmin && <div className="flex justify-end gap-2 border-t border-[#edf1ef] px-4 py-3"><button type="button" onClick={() => onEdit(packageData)} className="rounded px-3 py-1.5 text-xs font-semibold text-[#526b65] hover:bg-[#f1f5f3]">Edit</button><button type="button" onClick={() => onToggleActive(packageData)} className={`rounded px-3 py-1.5 text-xs font-semibold ${packageData.isActive ? "text-[#a64c3f] hover:bg-[#fcf0ed]" : "text-[#237761] hover:bg-[#edf6f2]"}`}>{packageData.isActive ? "Deactivate" : "Activate"}</button></div>}
        </article>
    );
}

export default function TravelPackagesPage() {
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === "admin";
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filters, setFilters] = useState({ packageType: "", minDurationDays: "", maxDurationDays: "", minPrice: "", maxPrice: "" });
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ items: [], page: 1, pageSize, totalCount: 0, totalPages: 0 });
    const [loadedKey, setLoadedKey] = useState("");
    const [requestError, setRequestError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const requestKey = useMemo(() => JSON.stringify({ search: debouncedSearch, ...filters, page, reloadKey }), [debouncedSearch, filters, page, reloadKey]);
    const loading = requestKey !== loadedKey;
    const error = requestError?.key === requestKey ? requestError.message : "";
    const reload = useCallback(() => setReloadKey((value) => value + 1), []);

    useEffect(() => {
        const controller = new AbortController();
        getTravelPackages({
            search: debouncedSearch || undefined,
            packageType: filters.packageType || undefined,
            minDurationDays: filters.minDurationDays || undefined,
            maxDurationDays: filters.maxDurationDays || undefined,
            minPrice: filters.minPrice || undefined,
            maxPrice: filters.maxPrice || undefined,
            page,
            pageSize
        }, controller.signal)
            .then((response) => {
                if (!controller.signal.aborted) {
                    setResult(response);
                    setRequestError(null);
                    setLoadedKey(requestKey);
                }
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setRequestError({ key: requestKey, message: getLeadErrorMessage(requestError) });
                    setLoadedKey(requestKey);
                }
            });
        return () => controller.abort();
    }, [debouncedSearch, filters, page, reloadKey, requestKey]);

    const openEdit = async (packageSummary) => {
        setDialog({ type: "loading" });
        try {
            const packageData = await getTravelPackage(packageSummary.travelPackageId);
            setDialog({ type: "edit", packageData });
        } catch (requestError) {
            setDialog(null);
            setNotice(getLeadErrorMessage(requestError));
        }
    };

    const openDetails = async (packageSummary) => {
        setDialog({ type: "loading" });
        try {
            const packageData = await getTravelPackage(packageSummary.travelPackageId);
            setDialog({ type: "details", packageData });
        } catch (requestError) {
            setDialog(null);
            setNotice(getLeadErrorMessage(requestError));
        }
    };

    const saveComplete = async (packageId, options = {}) => {
        reload();
        if (options.keepDialogOpen) {
            const packageData = await getTravelPackage(packageId);
            setDialog((current) => current?.type === "edit" ? { ...current, packageData } : current);
            return;
        }
        setDialog(null);
        setNotice(options.partialError
            ? `Package saved, but some itinerary, list, or image changes did not finish: ${options.partialError}`
            : "Travel package saved.");
    };

    const toggleActive = async (packageData) => {
        const active = !packageData.isActive;
        try {
            await setTravelPackageActive(packageData.travelPackageId, active);
            setNotice(`${packageData.packageName} ${active ? "activated" : "deactivated"}.`);
            reload();
        } catch (requestError) {
            setNotice(getLeadErrorMessage(requestError));
        }
    };

    const updateFilter = (key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    };
    const firstRecord = result.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const lastRecord = Math.min(page * pageSize, result.totalCount);

    return (
        <DashboardLayout title="Travel packages" search={search} onSearch={setSearch} searchLabel="Search travel packages by name, destination, country, or code" searchPlaceholder="Search travel packages...">
            <div className="mx-auto max-w-[1440px] space-y-6">
                <section className="flex flex-wrap items-end justify-between gap-4">
                    <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52706b]">Travel catalog</p><h1 className="mt-2 text-3xl font-semibold text-[#1d3533]">Travel packages</h1><p className="mt-2 text-sm text-[#667d79]">Explore curated trips and destination experiences.</p></div>
                    {isAdmin && <button type="button" onClick={() => setDialog({ type: "create" })} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#176b68] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#125956]"><span aria-hidden="true" className="text-lg">+</span>Create package</button>}
                </section>

                {notice && <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-[#d8e6e1] bg-white px-4 py-3 text-sm text-[#345650]"><span>{notice}</span><button type="button" onClick={() => setNotice("")} className="font-semibold text-[#176b68] hover:underline">Dismiss</button></div>}
                {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={reload} className="font-semibold underline">Try again</button></div>}

                <section className="grid gap-3 rounded-lg border border-[#e3ebe7] bg-white p-4 shadow-[0_3px_14px_rgba(27,65,57,0.035)] sm:grid-cols-2 lg:grid-cols-6">
                    <label className="text-xs font-semibold text-[#526b65]">Search
                        <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} mt-1.5`} placeholder="Name, destination, country..." />
                    </label>
                    <label className="text-xs font-semibold text-[#526b65]">Package type<input value={filters.packageType} onChange={(event) => updateFilter("packageType", event.target.value)} className={`${fieldClass} mt-1.5`} placeholder="Any type" /></label>
                    <label className="text-xs font-semibold text-[#526b65]">Minimum days<input type="number" min="1" value={filters.minDurationDays} onChange={(event) => updateFilter("minDurationDays", event.target.value)} className={`${fieldClass} mt-1.5`} /></label>
                    <label className="text-xs font-semibold text-[#526b65]">Maximum days<input type="number" min="1" value={filters.maxDurationDays} onChange={(event) => updateFilter("maxDurationDays", event.target.value)} className={`${fieldClass} mt-1.5`} /></label>
                    <label className="text-xs font-semibold text-[#526b65]">Minimum price<input type="number" min="0" step="0.01" value={filters.minPrice} onChange={(event) => updateFilter("minPrice", event.target.value)} className={`${fieldClass} mt-1.5`} /></label>
                    <label className="text-xs font-semibold text-[#526b65]">Maximum price<input type="number" min="0" step="0.01" value={filters.maxPrice} onChange={(event) => updateFilter("maxPrice", event.target.value)} className={`${fieldClass} mt-1.5`} /></label>
                </section>

                <section>
                    <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-[#203a36]">{loading ? "Loading packages..." : `${result.totalCount} ${result.totalCount === 1 ? "package" : "packages"}`}</h2><span className="text-xs text-[#82928d]">Page size {pageSize}</span></div>
                    {loading && result.items.length === 0 ? <div role="status" className="rounded-lg border border-[#e3ebe7] bg-white p-12 text-center text-sm text-[#71847e]">Loading travel packages...</div>
                        : !loading && result.items.length === 0 ? <div className="rounded-lg border border-[#e3ebe7] bg-white p-12 text-center"><DashboardIcon name="packages" className="mx-auto h-10 w-10 text-[#338374]" /><p className="mt-3 text-sm font-semibold text-[#314a45]">No packages found</p><p className="mt-1 text-xs text-[#7c8f89]">Try changing your search or filters.</p></div>
                            : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{result.items.map((item) => <PackageCard key={item.travelPackageId} packageData={item} isAdmin={isAdmin} onView={openDetails} onEdit={openEdit} onToggleActive={toggleActive} />)}</div>}
                    <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e3ebe7] bg-white px-4 py-3.5"><p className="text-xs text-[#7c8f89]">{loading ? "Updating packages..." : `Showing ${firstRecord}–${lastRecord} of ${result.totalCount}`}</p><div className="flex items-center gap-2"><span className="mr-1 text-xs text-[#7c8f89]">Page {result.totalPages === 0 ? 0 : page} of {result.totalPages}</span><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={loading || page <= 1} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-md border border-[#dfe8e4] text-[#526b65] disabled:opacity-40"><DashboardIcon name="chevronLeft" className="h-4 w-4" /></button><button type="button" onClick={() => setPage((value) => Math.min(result.totalPages, value + 1))} disabled={loading || page >= result.totalPages} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-md border border-[#dfe8e4] text-[#526b65] disabled:opacity-40"><DashboardIcon name="chevronRight" className="h-4 w-4" /></button></div></footer>
                </section>
            </div>
            {dialog?.type === "loading" && <CustomerDialog title="Loading package" onClose={() => setDialog(null)}><div role="status" className="p-8 text-center text-sm text-[#71847e]">Loading travel package details...</div></CustomerDialog>}
            {dialog?.type === "create" && <TravelPackageFormDialog onClose={() => setDialog(null)} onSaved={saveComplete} />}
            {dialog?.type === "edit" && <TravelPackageFormDialog key={dialog.packageData.travelPackageId} packageData={dialog.packageData} onClose={() => setDialog(null)} onSaved={saveComplete} />}
            {dialog?.type === "details" && <TravelPackageDetailsDialog packageData={dialog.packageData} isAdmin={isAdmin} onClose={() => setDialog(null)} onEdit={() => openEdit(dialog.packageData)} />}
        </DashboardLayout>
    );
}
