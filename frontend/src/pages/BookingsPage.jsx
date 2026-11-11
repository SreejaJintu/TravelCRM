import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BookingDetailsDialog from "../components/BookingDetailsDialog";
import BookingFormDialog from "../components/BookingFormDialog";
import DashboardIcon from "../components/DashboardIcon";
import DashboardLayout from "../components/DashboardLayout";
import PaymentFormDialog from "../components/PaymentFormDialog";
import { useAuth } from "../context/useAuth";
import { getBooking, getBookings } from "../services/bookingApi";

const pageSize = 10;
const statuses = ["Inquiry", "Quotation", "Pending", "Confirmed", "Cancelled", "Completed"];
const statusStyles = {
    Inquiry: "bg-[#e6eef8] text-[#4c7095]",
    Quotation: "bg-[#f8f0db] text-[#987522]",
    Pending: "bg-[#fae9e3] text-[#b7654d]",
    Confirmed: "bg-[#e3f3ed] text-[#237761]",
    Cancelled: "bg-[#fae8e7] text-[#a84e48]",
    Completed: "bg-[#dff2e7] text-[#217047]"
};
const paymentStatusStyles = {
    Unpaid: "bg-[#edf1ef] text-[#647b76]",
    "Partially Paid": "bg-[#f8f0db] text-[#987522]",
    Paid: "bg-[#e3f3ed] text-[#237761]",
    Overpaid: "bg-[#fae8e7] text-[#a84e48]"
};

function messageFrom(error) {
    return error.response?.data?.detail || error.response?.data?.title || error.message || "Bookings could not be loaded.";
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? "—"
        : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function money(value, currency) {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value ?? 0);
    } catch {
        return `${currency} ${Number(value ?? 0).toFixed(2)}`;
    }
}

export default function BookingsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === "admin";
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const leadId = searchParams.get("leadId");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState("");
    const [travelStartFrom, setTravelStartFrom] = useState("");
    const [travelStartTo, setTravelStartTo] = useState("");
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ items: [], page: 1, pageSize, totalCount: 0, totalPages: 0 });
    const [loadedRequestKey, setLoadedRequestKey] = useState(null);
    const [requestError, setRequestError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [dialogLoading, setDialogLoading] = useState(false);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const requestKey = `${debouncedSearch}\u0000${status}\u0000${travelStartFrom}\u0000${travelStartTo}\u0000${page}\u0000${reloadKey}`;
    const loading = loadedRequestKey !== requestKey;
    const error = requestError?.key === requestKey ? requestError.message : "";

    useEffect(() => {
        const controller = new AbortController();
        getBookings({
            search: debouncedSearch || undefined,
            status: status || undefined,
            travelStartFrom: travelStartFrom || undefined,
            travelStartTo: travelStartTo || undefined,
            page,
            pageSize
        }, controller.signal)
            .then((response) => {
                if (!controller.signal.aborted) {
                    setResult(response);
                    setRequestError(null);
                    setLoadedRequestKey(requestKey);
                }
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    setRequestError({ key: requestKey, message: messageFrom(error) });
                    setLoadedRequestKey(requestKey);
                }
            });
        return () => controller.abort();
    }, [debouncedSearch, page, reloadKey, requestKey, status, travelStartFrom, travelStartTo]);

    const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

    const openDetails = async (item) => {
        setDialogLoading(true);
        try {
            const details = await getBooking(item.bookingId);
            setDialog({ type: "details", booking: details });
        } catch (error) {
            setNotice(messageFrom(error));
        } finally {
            setDialogLoading(false);
        }
    };

    const onSaved = async (saved) => {
        setDialog(null);
        if (leadId) navigate("/bookings", { replace: true });
        setNotice(`Booking ${saved.bookingNumber} saved.`);
        refresh();
    };

    const onDetailsUpdated = async (updated) => {
        setDialog({ type: "details", booking: updated });
        setNotice(`${updated.bookingNumber} updated.`);
        refresh();
    };

    const onPaymentSaved = async (saved) => {
        const bookingId = saved.payment.bookingId;
        const bookingNumber = saved.payment.bookingNumber;
        refresh();
        try {
            const updatedBooking = await getBooking(bookingId);
            setDialog({ type: "details", booking: updatedBooking });
            setNotice(`Payment #${saved.payment.paymentId} recorded for ${bookingNumber}.`);
        } catch (error) {
            setDialog((current) => current?.type === "payment"
                ? {
                    type: "details",
                    booking: {
                        ...current.booking,
                        paymentSummary: saved.summary
                    }
                }
                : current);
            setNotice(`Payment recorded, but the booking summary could not be refreshed: ${messageFrom(error)}`);
        }
    };

    const clearFilters = () => {
        setStatus("");
        setTravelStartFrom("");
        setTravelStartTo("");
        setSearch("");
        setPage(1);
    };

    const firstRecord = result.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const lastRecord = Math.min(page * pageSize, result.totalCount);
    const inputClass = "min-h-10 rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#314a45] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10";
    const visibleDialog = dialog ?? (leadId ? { type: "form", leadId } : null);

    return (
        <DashboardLayout
            title="Bookings"
            search={search}
            onSearch={setSearch}
            searchLabel="Search booking number or customer name"
            searchPlaceholder="Search bookings or customers…"
        >
            <div className="mx-auto max-w-[1500px] space-y-6">
                <section className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm text-[#71847e]">Manage reservations, travelers, and booking status.</p>
                        <p className="mt-1 text-xs text-[#8a9994]">{result.totalCount} booking{result.totalCount === 1 ? "" : "s"} found</p>
                    </div>
                    <button type="button" onClick={() => setDialog({ type: "form" })} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#176b68] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#125956] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b68]">
                        <DashboardIcon name="bookingAdd" className="h-4 w-4" />
                        Create booking
                    </button>
                </section>

                {notice && (
                    <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-[#cde5d9] bg-[#eef8f3] px-4 py-3 text-sm text-[#286b53]">
                        <span>{notice}</span>
                        <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message" className="font-semibold">×</button>
                    </div>
                )}

                <section className="rounded-lg border border-[#e3ebe7] bg-white p-4 shadow-[0_3px_14px_rgba(27,65,57,0.035)] sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
                        <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-[#526b65]">Status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={inputClass}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
                        <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-[#526b65]">Travel starts from</span><input type="date" value={travelStartFrom} onChange={(event) => { setTravelStartFrom(event.target.value); setPage(1); }} className={inputClass} /></label>
                        <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-[#526b65]">Travel starts through</span><input type="date" value={travelStartTo} min={travelStartFrom || undefined} onChange={(event) => { setTravelStartTo(event.target.value); setPage(1); }} className={inputClass} /></label>
                        <button type="button" onClick={clearFilters} className="min-h-10 self-end rounded-md px-3 text-sm font-semibold text-[#397d70] hover:bg-[#edf6f2]">Clear filters</button>
                    </div>
                </section>

                <section className="overflow-hidden rounded-lg border border-[#e3ebe7] bg-white shadow-[0_3px_14px_rgba(27,65,57,0.035)]">
                    {loading ? (
                        <div className="px-6 py-16 text-center text-sm text-[#71847e]">Loading bookings…</div>
                    ) : error ? (
                        <div className="px-6 py-14 text-center">
                            <p role="alert" className="text-sm text-rose-700">{error}</p>
                            <button type="button" onClick={refresh} className="mt-4 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white">Try again</button>
                        </div>
                    ) : result.items.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <p className="text-sm font-semibold text-[#314a45]">No bookings found</p>
                            <p className="mt-1 text-sm text-[#71847e]">Create a booking or adjust your search and filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1450px] border-collapse text-left">
                                <thead>
                                    <tr className="bg-[#f8faf9] text-[10px] font-bold uppercase tracking-[0.08em] text-[#83938e]">
                                        <th className="px-4 py-3.5 sm:px-5">Booking</th>
                                        <th className="px-4 py-3.5">Customer</th>
                                        <th className="px-4 py-3.5">Package / destination</th>
                                        <th className="px-4 py-3.5">Travel dates</th>
                                        <th className="px-4 py-3.5">Travelers</th>
                                        <th className="px-4 py-3.5 text-right">Booking total</th>
                                        <th className="px-4 py-3.5 text-right">Amount paid</th>
                                        <th className="px-4 py-3.5 text-right">Balance</th>
                                        <th className="px-4 py-3.5">Payment status</th>
                                        <th className="px-4 py-3.5">Status</th>
                                        <th className="px-4 py-3.5">Assigned staff</th>
                                        <th className="px-4 py-3.5 text-right sm:px-5">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#edf1ef]">
                                    {result.items.map((item) => (
                                        <tr key={item.bookingId} className="transition hover:bg-[#fbfcfb]">
                                            <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-[#397d70] sm:px-5">{item.bookingNumber}</td>
                                            <td className="min-w-[155px] px-4 py-4"><p className="text-sm font-semibold text-[#314a45]">{item.customerName}</p></td>
                                            <td className="min-w-[180px] px-4 py-4"><p className="text-sm font-medium text-[#314a45]">{item.packageName}</p><p className="mt-1 text-xs text-[#71847e]">{item.destination}</p></td>
                                            <td className="whitespace-nowrap px-4 py-4 text-xs text-[#667d77]">{formatDate(item.travelStartDate)}<br /><span className="mt-1 inline-block text-[#8a9994]">to {formatDate(item.travelEndDate)}</span></td>
                                            <td className="whitespace-nowrap px-4 py-4 text-xs text-[#667d77]">{item.numberOfAdults + item.numberOfChildren + item.numberOfInfants} total<br /><span className="text-[#8a9994]">{item.numberOfAdults}A · {item.numberOfChildren}C · {item.numberOfInfants}I</span></td>
                                            <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-[#314a45]">{money(item.paymentSummary?.bookingTotal ?? item.totalAmount, item.currency)}</td>
                                            <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-[#314a45]">{money(item.paymentSummary?.netPaid ?? 0, item.currency)}</td>
                                            <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-[#314a45]">{money(item.paymentSummary?.balanceAmount ?? item.totalAmount, item.currency)}</td>
                                            <td className="whitespace-nowrap px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${paymentStatusStyles[item.paymentSummary?.paymentStatus] || paymentStatusStyles.Unpaid}`}>{item.paymentSummary?.paymentStatus || "Unpaid"}</span></td>
                                            <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[item.bookingStatus] || "bg-[#edf1ef] text-[#647b76]"}`}>{item.bookingStatus}</span></td>
                                            <td className="whitespace-nowrap px-4 py-4 text-xs text-[#667d77]">{item.assignedToName || "Unassigned"}</td>
                                            <td className="px-4 py-4 text-right sm:px-5"><button type="button" onClick={() => openDetails(item)} disabled={dialogLoading} className="rounded px-2 py-1.5 text-xs font-semibold text-[#397d70] hover:bg-[#edf6f2] disabled:opacity-50">{dialogLoading ? "Loading…" : "Details"}</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loading && !error && result.totalPages > 0 && (
                        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9efec] px-4 py-4 text-xs text-[#71847e] sm:px-5">
                            <span>Showing {firstRecord}–{lastRecord} of {result.totalCount}</span>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#dce6e2] px-3 font-semibold text-[#526b65] hover:bg-[#f5f8f6] disabled:opacity-40"><DashboardIcon name="chevronLeft" className="h-4 w-4" />Previous</button>
                                <span className="px-2">Page {page} of {result.totalPages}</span>
                                <button type="button" onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))} disabled={page >= result.totalPages} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#dce6e2] px-3 font-semibold text-[#526b65] hover:bg-[#f5f8f6] disabled:opacity-40">Next<DashboardIcon name="chevronRight" className="h-4 w-4" /></button>
                            </div>
                        </footer>
                    )}
                </section>
            </div>

            {visibleDialog?.type === "form" && (
                <BookingFormDialog
                    booking={visibleDialog.booking}
                    initialLeadId={visibleDialog.leadId}
                    isAdmin={isAdmin}
                    onClose={() => {
                        setDialog(null);
                        if (leadId) navigate("/bookings", { replace: true });
                    }}
                    onSaved={onSaved}
                />
            )}
            {visibleDialog?.type === "details" && (
                <BookingDetailsDialog
                    booking={visibleDialog.booking}
                    isAdmin={isAdmin}
                    onClose={() => setDialog(null)}
                    onEdit={() => setDialog({ type: "form", booking: visibleDialog.booking })}
                    onUpdated={onDetailsUpdated}
                    onRecordPayment={() => {
                        setDialog({
                            type: "payment",
                            bookingId: visibleDialog.booking.bookingId,
                            booking: visibleDialog.booking
                        });
                    }}
                />
            )}
            {visibleDialog?.type === "payment" && (
                <PaymentFormDialog
                    initialBookingId={visibleDialog.bookingId}
                    onClose={() => setDialog({ type: "details", booking: visibleDialog.booking })}
                    onSaved={onPaymentSaved}
                />
            )}
        </DashboardLayout>
    );
}
