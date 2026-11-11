import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardIcon from "../components/DashboardIcon";
import DashboardLayout from "../components/DashboardLayout";
import PaymentDetailsDialog from "../components/PaymentDetailsDialog";
import PaymentFormDialog from "../components/PaymentFormDialog";
import {
    changePaymentStatus,
    deletePayment,
    getPayment,
    getPayments
} from "../services/paymentApi";

const pageSize = 10;
const paymentStatuses = ["Pending", "Completed", "Failed"];
const paymentMethods = ["Cash", "BankTransfer", "UPI", "Card", "Other"];
const statusStyles = {
    Pending: "bg-[#f8f0db] text-[#987522]",
    Completed: "bg-[#e3f3ed] text-[#237761]",
    Failed: "bg-[#fae8e7] text-[#a84e48]",
};

function messageFrom(error) {
    return error.response?.data?.detail || error.response?.data?.title || error.message || "Payments could not be loaded.";
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function money(value, currency = "INR") {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value ?? 0);
    } catch {
        return `${currency} ${Number(value ?? 0).toFixed(2)}`;
    }
}

export default function PaymentsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialBookingId = searchParams.get("bookingId");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState("");
    const [method, setMethod] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ items: [], page: 1, pageSize, totalCount: 0, totalPages: 0 });
    const [loadedKey, setLoadedKey] = useState(null);
    const [requestError, setRequestError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(() => initialBookingId ? { type: "form", bookingId: initialBookingId } : null);
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const requestKey = `${debouncedSearch}\u0000${status}\u0000${method}\u0000${from}\u0000${to}\u0000${page}\u0000${reloadKey}`;
    const loading = loadedKey !== requestKey;
    const error = requestError?.key === requestKey ? requestError.message : "";

    useEffect(() => {
        const controller = new AbortController();
        getPayments({
            search: debouncedSearch || undefined,
            status: status || undefined,
            method: method || undefined,
            from: from || undefined,
            to: to || undefined,
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
            .catch((requestErrorValue) => {
                if (!controller.signal.aborted) {
                    setRequestError({ key: requestKey, message: messageFrom(requestErrorValue) });
                    setLoadedKey(requestKey);
                }
            });
        return () => controller.abort();
    }, [debouncedSearch, from, method, page, reloadKey, requestKey, status, to]);

    const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

    const openDetails = async (item) => {
        setBusy(true);
        try {
            const details = await getPayment(item.paymentId);
            setDialog({ type: "details", details });
        } catch (requestErrorValue) {
            setNotice(messageFrom(requestErrorValue));
        } finally {
            setBusy(false);
        }
    };

    const closeDialog = () => {
        setDialog(null);
        if (initialBookingId) navigate("/payments", { replace: true });
    };

    const onSaved = async (saved) => {
        setDialog({ type: "details", details: saved });
        setNotice(`Payment #${saved.payment.paymentId} saved.`);
        if (initialBookingId) navigate("/payments", { replace: true });
        refresh();
    };

    const onStatusChange = async (nextStatus) => {
        const payment = dialog?.details?.payment;
        if (!payment || !window.confirm(`Mark payment #${payment.paymentId} as ${nextStatus.toLowerCase()}?`)) return;
        setBusy(true);
        try {
            const updated = await changePaymentStatus(payment.paymentId, nextStatus);
            setDialog({ type: "details", details: updated });
            setNotice(`Payment #${payment.paymentId} marked ${nextStatus.toLowerCase()}.`);
            refresh();
        } catch (requestErrorValue) {
            setNotice(messageFrom(requestErrorValue));
        } finally {
            setBusy(false);
        }
    };

    const onDelete = async () => {
        const payment = dialog?.details?.payment;
        if (!payment || !window.confirm(`Delete pending payment #${payment.paymentId}?`)) return;
        setBusy(true);
        try {
            await deletePayment(payment.paymentId);
            setDialog(null);
            setNotice(`Payment #${payment.paymentId} deleted.`);
            refresh();
        } catch (requestErrorValue) {
            setNotice(messageFrom(requestErrorValue));
        } finally {
            setBusy(false);
        }
    };

    const clearFilters = () => {
        setStatus("");
        setMethod("");
        setFrom("");
        setTo("");
        setSearch("");
        setPage(1);
    };
    const inputClass = "min-h-10 rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#314a45] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10";

    return (
        <DashboardLayout
            title="Payments"
            search={search}
            onSearch={setSearch}
            searchLabel="Search booking reference or customer"
            searchPlaceholder="Search booking or customer…"
        >
            <div className="mx-auto max-w-[1500px] space-y-6">
                <section className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm text-[#71847e]">Track manually recorded receipts and refunds.</p>
                        <p className="mt-1 text-xs text-[#8a9994]">{result.totalCount} payment{result.totalCount === 1 ? "" : "s"} found</p>
                    </div>
                    <button type="button" onClick={() => setDialog({ type: "form" })} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#176b68] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#125956]">
                        <DashboardIcon name="payments" className="h-4 w-4" />
                        Record payment
                    </button>
                </section>

                {notice && <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-[#cde5d9] bg-[#eef8f3] px-4 py-3 text-sm text-[#286b53]"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss" className="font-semibold">×</button></div>}

                <section className="rounded-lg border border-[#e3ebe7] bg-white p-4 shadow-[0_3px_14px_rgba(27,65,57,0.035)] sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-[#526b65]">Status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={inputClass}><option value="">All statuses</option>{paymentStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
                        <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-[#526b65]">Method</span><select value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }} className={inputClass}><option value="">All methods</option>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</select></label>
                        <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-[#526b65]">From</span><input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className={inputClass} /></label>
                        <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-[#526b65]">To</span><input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className={inputClass} /></label>
                        <button type="button" onClick={clearFilters} className="min-h-10 self-end rounded-md px-3 text-sm font-semibold text-[#176b68] hover:bg-[#f1f7f5]">Clear filters</button>
                    </div>
                </section>

                <section className="overflow-hidden rounded-lg border border-[#e3ebe7] bg-white shadow-[0_3px_14px_rgba(27,65,57,0.035)]">
                    {loading || busy ? (
                        <div role="status" className="px-5 py-12 text-center text-sm text-[#71847e]">Loading payments…</div>
                    ) : error ? (
                        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-5 py-10 text-sm text-[#a84e48]"><span>{error}</span><button type="button" onClick={refresh} className="font-semibold underline">Retry</button></div>
                    ) : result.items.length === 0 ? (
                        <div className="px-5 py-12 text-center"><p className="text-sm font-semibold text-[#314a45]">No payments found</p><p className="mt-1 text-sm text-[#71847e]">Try changing the filters or record a payment.</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[980px] text-left text-sm">
                                <thead className="bg-[#f8faf9] text-xs uppercase tracking-wide text-[#71847e]"><tr><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Booking / customer</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Type / method</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Actions</th></tr></thead>
                                <tbody className="divide-y divide-[#edf1ef]">
                                    {result.items.map((item) => (
                                        <tr key={item.paymentId} className="hover:bg-[#fbfcfb]">
                                            <td className="px-4 py-3 font-semibold text-[#314a45]">#{item.paymentId}</td>
                                            <td className="px-4 py-3"><p className="font-semibold text-[#314a45]">{item.bookingNumber}</p><p className="mt-0.5 text-xs text-[#71847e]">{item.customerName}</p></td>
                                            <td className="px-4 py-3 font-semibold text-[#314a45]">{money(item.amount, item.currency)}</td>
                                            <td className="px-4 py-3"><p className="text-[#314a45]">{item.paymentType}</p><p className="mt-0.5 text-xs text-[#71847e]">{item.paymentMethod}</p></td>
                                            <td className="px-4 py-3 text-[#667d77]">{formatDate(item.paymentDate)}</td>
                                            <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[item.paymentStatus] || "bg-[#edf1ef] text-[#647b76]"}`}>{item.paymentStatus}</span></td>
                                            <td className="max-w-[160px] truncate px-4 py-3 text-[#667d77]" title={item.transactionReference || ""}>{item.transactionReference || "—"}</td>
                                            <td className="px-4 py-3"><button type="button" onClick={() => openDetails(item)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#176b68] hover:bg-[#eef6f3]">View</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9efec] px-4 py-3">
                        <p className="text-xs text-[#71847e]">{result.totalCount === 0 ? "0 records" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, result.totalCount)} of ${result.totalCount}`}</p>
                        <div className="flex gap-2">
                            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-9 rounded-md border border-[#dce6e2] px-3 text-xs font-semibold text-[#526b65] disabled:opacity-40">Previous</button>
                            <button type="button" disabled={page >= result.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="min-h-9 rounded-md border border-[#dce6e2] px-3 text-xs font-semibold text-[#526b65] disabled:opacity-40">Next</button>
                        </div>
                    </footer>
                </section>
            </div>

            {dialog?.type === "form" && <PaymentFormDialog initialBookingId={dialog.bookingId ?? initialBookingId} onClose={closeDialog} onSaved={onSaved} />}
            {dialog?.type === "edit" && <PaymentFormDialog payment={dialog.payment} onClose={() => setDialog({ type: "details", details: dialog.details })} onSaved={onSaved} />}
            {dialog?.type === "details" && (
                <PaymentDetailsDialog
                    details={dialog.details}
                    busy={busy}
                    onClose={closeDialog}
                    onEdit={() => setDialog({ type: "edit", payment: dialog.details.payment, details: dialog.details })}
                    onComplete={() => onStatusChange("Completed")}
                    onFail={() => onStatusChange("Failed")}
                    onDelete={onDelete}
                />
            )}
        </DashboardLayout>
    );
}
