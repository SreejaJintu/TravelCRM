import { useEffect, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import { assignBooking, changeBookingStatus, getAssignableBookingStaff } from "../services/bookingApi";
import { getBookingPayments } from "../services/paymentApi";

const nextStatuses = {
    Inquiry: ["Quotation", "Pending"],
    Quotation: ["Pending", "Confirmed"],
    Pending: ["Confirmed"],
    Confirmed: ["Completed"]
};

const statusStyles = {
    Inquiry: "bg-[#e6eef8] text-[#4c7095]",
    Quotation: "bg-[#f8f0db] text-[#987522]",
    Pending: "bg-[#fae9e3] text-[#b7654d]",
    Confirmed: "bg-[#e3f3ed] text-[#237761]",
    Cancelled: "bg-[#fae8e7] text-[#a84e48]",
    Completed: "bg-[#dff2e7] text-[#217047]"
};

function messageFrom(error, fallback = "The action could not be completed.") {
    return error.response?.data?.detail || error.response?.data?.title || error.message || fallback;
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? "—"
        : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function money(value, currency) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value ?? 0);
}

function formatPaymentDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function BookingDetailsDialog({ booking, isAdmin, onClose, onEdit, onUpdated, onRecordPayment }) {
    const [staff, setStaff] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(true);
    const [paymentHistoryError, setPaymentHistoryError] = useState("");
    const [assignee, setAssignee] = useState(booking.assignedToUserId ?? "");
    const [nextStatus, setNextStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isAdmin) return undefined;
        const controller = new AbortController();
        getAssignableBookingStaff(controller.signal)
            .then(setStaff)
            .catch((requestError) => {
                if (!controller.signal.aborted) setError(messageFrom(requestError));
            });
        return () => controller.abort();
    }, [isAdmin]);

    useEffect(() => {
        const controller = new AbortController();
        getBookingPayments(booking.bookingId, controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) {
                    setPaymentHistory(result.payments ?? []);
                    setPaymentHistoryError("");
                }
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setPaymentHistoryError(messageFrom(
                        requestError,
                        "Payment history could not be loaded."
                    ));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setPaymentHistoryLoading(false);
            });
        return () => controller.abort();
    }, [
        booking.bookingId,
        booking.paymentSummary?.grossPaid,
        booking.paymentSummary?.refundedAmount,
        booking.paymentSummary?.netPaid
    ]);

    const saveStatus = async (status) => {
        setBusy(true);
        setError("");
        try {
            const updated = await changeBookingStatus(booking.bookingId, status);
            await onUpdated(updated);
        } catch (requestError) {
            setError(messageFrom(requestError));
        } finally {
            setBusy(false);
        }
    };

    const saveAssignment = async () => {
        setBusy(true);
        setError("");
        try {
            const updated = await assignBooking(
                booking.bookingId,
                assignee ? Number(assignee) : null
            );
            await onUpdated(updated);
        } catch (requestError) {
            setError(messageFrom(requestError));
        } finally {
            setBusy(false);
        }
    };

    const cancel = async () => {
        if (!window.confirm(`Cancel booking ${booking.bookingNumber}?`)) return;
        setBusy(true);
        setError("");
        try {
            const updated = await changeBookingStatus(booking.bookingId, "Cancelled");
            await onUpdated(updated);
        } catch (requestError) {
            setError(messageFrom(requestError));
        } finally {
            setBusy(false);
        }
    };

    const canEdit = booking.isActive && !["Cancelled", "Completed"].includes(booking.bookingStatus);
    const availableStatuses = nextStatuses[booking.bookingStatus] ?? [];
    const paymentSummary = booking.paymentSummary;

    return (
        <CustomerDialog
            title={booking.bookingNumber}
            description={`${booking.packageName} · ${booking.destination}`}
            onClose={onClose}
            width="max-w-3xl"
        >
            <div className="space-y-6 p-5 sm:p-7">
                {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
                <section className="grid gap-4 sm:grid-cols-3">
                    <div><p className="text-xs text-[#7b8d88]">Status</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[booking.bookingStatus] || "bg-[#edf1ef] text-[#647b76]"}`}>{booking.bookingStatus}</span></div>
                    <div><p className="text-xs text-[#7b8d88]">Customer</p><p className="mt-1 text-sm font-semibold text-[#314a45]">{booking.customerName}</p><p className="mt-1 text-xs text-[#71847e]">{booking.customerEmail} · {booking.customerPhone}</p></div>
                    <div><p className="text-xs text-[#7b8d88]">Travel dates</p><p className="mt-1 text-sm font-semibold text-[#314a45]">{formatDate(booking.travelStartDate)} – {formatDate(booking.travelEndDate)}</p><p className="mt-1 text-xs text-[#71847e]">{booking.numberOfAdults} adults · {booking.numberOfChildren} children · {booking.numberOfInfants} infants</p></div>
                </section>

                {booking.leadNumber && <p className="rounded-md bg-[#f7faf8] px-4 py-3 text-sm text-[#526b65]">Converted from lead <span className="font-semibold">{booking.leadNumber}</span></p>}

                <section className="rounded-lg border border-[#e4ece8]">
                    <h3 className="border-b border-[#e9efec] px-4 py-3 text-sm font-semibold text-[#29443e]">Price breakdown</h3>
                    <dl className="space-y-2 px-4 py-4 text-sm">
                        <div className="flex justify-between gap-4"><dt className="text-[#71847e]">Adults · {money(booking.adultPrice, booking.currency)} each</dt><dd className="font-medium text-[#314a45]">{money(booking.adultPrice * booking.numberOfAdults, booking.currency)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-[#71847e]">Children · {money(booking.childPrice, booking.currency)} each</dt><dd className="font-medium text-[#314a45]">{money(booking.childPrice * booking.numberOfChildren, booking.currency)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-[#71847e]">Infants · {money(booking.infantPrice, booking.currency)} each</dt><dd className="font-medium text-[#314a45]">{money(booking.infantPrice * booking.numberOfInfants, booking.currency)}</dd></div>
                        <div className="flex justify-between gap-4 border-t border-[#edf1ef] pt-2"><dt className="text-[#71847e]">Base amount</dt><dd className="font-medium text-[#314a45]">{money(booking.baseAmount, booking.currency)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-[#71847e]">Discount</dt><dd className="font-medium text-[#314a45]">−{money(booking.discountAmount, booking.currency)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-[#71847e]">Additional charges</dt><dd className="font-medium text-[#314a45]">{money(booking.additionalCharges, booking.currency)}</dd></div>
                        <div className="flex justify-between gap-4 border-t border-[#edf1ef] pt-3 text-base"><dt className="font-semibold text-[#29443e]">Total</dt><dd className="font-bold text-[#176b68]">{money(booking.totalAmount, booking.currency)}</dd></div>
                    </dl>
                </section>

                <section>
                    <h3 className="text-sm font-semibold text-[#29443e]">Travelers</h3>
                    {booking.travelers.length === 0 ? (
                        <p className="mt-2 text-sm text-[#7b8d88]">No traveler names recorded.</p>
                    ) : (
                        <div className="mt-2 overflow-x-auto rounded-md border border-[#e4ece8]">
                            <table className="w-full min-w-[420px] text-left text-sm">
                                <thead className="bg-[#f8faf9] text-xs text-[#71847e]"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Date of birth</th><th className="px-3 py-2">Gender</th></tr></thead>
                                <tbody className="divide-y divide-[#edf1ef]">{booking.travelers.map((traveler) => <tr key={traveler.bookingTravelerId}><td className="px-3 py-2 font-medium text-[#314a45]">{traveler.fullName}</td><td className="px-3 py-2 text-[#667d77]">{traveler.travelerType}</td><td className="px-3 py-2 text-[#667d77]">{formatDate(traveler.dateOfBirth)}</td><td className="px-3 py-2 text-[#667d77]">{traveler.gender || "—"}</td></tr>)}</tbody>
                            </table>
                        </div>
                    )}
                </section>

                {booking.specialRequests && <section><h3 className="text-sm font-semibold text-[#29443e]">Special requests</h3><p className="mt-2 whitespace-pre-wrap text-sm text-[#667d77]">{booking.specialRequests}</p></section>}

                <section className="rounded-md border border-[#e4ece8] bg-[#f8faf9] px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-[#29443e]">Payment summary</h3>
                            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                                <div><dt className="text-xs text-[#71847e]">Total booking amount</dt><dd className="font-semibold text-[#314a45]">{money(paymentSummary?.bookingTotal ?? booking.totalAmount, booking.currency)}</dd></div>
                                <div><dt className="text-xs text-[#71847e]">Payments received</dt><dd className="font-semibold text-[#314a45]">{money(paymentSummary?.grossPaid, booking.currency)}</dd></div>
                                <div><dt className="text-xs text-[#71847e]">Pending payments</dt><dd className="font-semibold text-[#314a45]">{money(paymentSummary?.pendingAmount, booking.currency)}</dd></div>
                                <div><dt className="text-xs text-[#71847e]">Total refunded</dt><dd className="font-semibold text-[#314a45]">{money(paymentSummary?.refundedAmount, booking.currency)}</dd></div>
                                <div><dt className="text-xs text-[#71847e]">Net amount paid</dt><dd className="font-semibold text-[#314a45]">{money(paymentSummary?.netPaid, booking.currency)}</dd></div>
                                <div><dt className="text-xs text-[#71847e]">Remaining balance</dt><dd className="font-semibold text-[#314a45]">{money(paymentSummary?.balanceAmount, booking.currency)}</dd></div>
                            </dl>
                            <p className="mt-1 text-xs font-semibold text-[#176b68]">{paymentSummary?.paymentStatus ?? "Unpaid"}</p>
                        </div>
                        <button type="button" onClick={onRecordPayment} className="min-h-10 rounded-md bg-[#176b68] px-3 text-sm font-semibold text-white hover:bg-[#125956]">Record payment</button>
                    </div>
                </section>

                <section>
                    <h3 className="text-sm font-semibold text-[#29443e]">Payment history</h3>
                    {paymentHistoryLoading ? (
                        <p role="status" className="mt-2 text-sm text-[#7b8d88]">Loading payment history…</p>
                    ) : paymentHistoryError ? (
                        <p role="alert" className="mt-2 text-sm text-rose-700">{paymentHistoryError}</p>
                    ) : paymentHistory.length === 0 ? (
                        <p className="mt-2 text-sm text-[#7b8d88]">No payments recorded. Amount paid {money(0, booking.currency)} · Balance {money(paymentSummary?.balanceAmount ?? booking.totalAmount, booking.currency)} · Unpaid.</p>
                    ) : (
                        <div className="mt-2 overflow-x-auto rounded-md border border-[#e4ece8]">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-[#f8faf9] text-xs text-[#71847e]">
                                    <tr>
                                        <th className="px-3 py-2">Payment date</th>
                                        <th className="px-3 py-2">Amount</th>
                                        <th className="px-3 py-2">Type</th>
                                        <th className="px-3 py-2">Method</th>
                                        <th className="px-3 py-2">Transaction reference</th>
                                        <th className="px-3 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#edf1ef]">
                                    {paymentHistory.map((payment) => (
                                        <tr key={payment.paymentId}>
                                            <td className="whitespace-nowrap px-3 py-2 text-[#667d77]">{formatPaymentDate(payment.paymentDate)}</td>
                                            <td className="whitespace-nowrap px-3 py-2 font-medium text-[#314a45]">{money(payment.amount, booking.currency)}</td>
                                            <td className="px-3 py-2 text-[#314a45]">{payment.paymentType}</td>
                                            <td className="px-3 py-2 text-[#667d77]">{payment.paymentMethod}</td>
                                            <td className="max-w-[180px] truncate px-3 py-2 text-[#667d77]" title={payment.transactionReference || ""}>{payment.transactionReference || "—"}</td>
                                            <td className="px-3 py-2 text-[#667d77]">{payment.paymentStatus}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {isAdmin && (
                    <section className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <label className="flex-1"><span className="mb-1.5 block text-xs font-semibold text-[#344e48]">Assigned staff</span><select value={assignee} onChange={(event) => setAssignee(event.target.value)} disabled={!canEdit} className="min-h-11 w-full rounded-md border border-[#d6e0dc] bg-white px-3 text-sm text-[#20332f] disabled:bg-[#f3f6f5]"><option value="">Unassigned</option>{staff.map((item) => <option key={item.userId} value={item.userId}>{item.fullName}</option>)}</select></label>
                        <button type="button" onClick={saveAssignment} disabled={busy || !canEdit || String(assignee) === String(booking.assignedToUserId ?? "")} className="min-h-11 rounded-md border border-[#d6e0dc] px-4 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6] disabled:opacity-50">Save assignment</button>
                    </section>
                )}

                <footer className="flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#82928d]">Created by {booking.createdByName}</p>
                    <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Close</button>
                        {canEdit && <button type="button" onClick={onEdit} disabled={busy} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6] disabled:opacity-50">Edit</button>}
                        {availableStatuses.length > 0 && (
                            <>
                                <select aria-label="Next booking status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} className="min-h-10 rounded-md border border-[#d6e0dc] bg-white px-3 text-sm text-[#20332f]">
                                    <option value="">Change status…</option>
                                    {availableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                                </select>
                                <button type="button" onClick={() => saveStatus(nextStatus)} disabled={busy || !nextStatus} className="min-h-10 rounded-md bg-[#176b68] px-4 text-sm font-semibold text-white hover:bg-[#125956] disabled:opacity-50">Update status</button>
                            </>
                        )}
                        {canEdit && <button type="button" onClick={cancel} disabled={busy} className="min-h-10 rounded-md px-3 text-sm font-semibold text-[#a64c3f] hover:bg-[#fcf0ed] disabled:opacity-50">Cancel booking</button>}
                    </div>
                </footer>
            </div>
        </CustomerDialog>
    );
}
