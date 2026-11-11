import { useEffect, useMemo, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import { getBooking, getBookings } from "../services/bookingApi";
import { createPayment, updatePayment } from "../services/paymentApi";

const types = ["Advance", "Partial", "Final", "Refund"];
const methods = ["Cash", "BankTransfer", "UPI", "Card", "Other"];
const statuses = ["Pending", "Completed"];

function messageFrom(error) {
    return error.response?.data?.detail || error.response?.data?.title || error.message || "The payment could not be saved.";
}

function money(value, currency = "INR") {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value ?? 0);
    } catch {
        return `${currency} ${Number(value ?? 0).toFixed(2)}`;
    }
}

function localDateTime(value = new Date()) {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function PaymentFormDialog({ payment, initialBookingId, onClose, onSaved }) {
    const isEditing = Boolean(payment);
    const [bookings, setBookings] = useState([]);
    const [booking, setBooking] = useState(null);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(Boolean(payment?.bookingId ?? initialBookingId));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [values, setValues] = useState({
        bookingId: payment?.bookingId ?? initialBookingId ?? "",
        amount: payment?.amount ?? "",
        paymentType: payment?.paymentType ?? "Partial",
        paymentMethod: payment?.paymentMethod ?? "Cash",
        paymentStatus: payment?.paymentStatus ?? "Pending",
        paymentDate: localDateTime(payment ? new Date(payment.paymentDate) : new Date()),
        transactionReference: payment?.transactionReference ?? "",
        notes: payment?.notes ?? ""
    });

    useEffect(() => {
        const controller = new AbortController();
        getBookings({ page: 1, pageSize: 100 }, controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) setBookings(result.items ?? []);
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) setError(messageFrom(requestError));
            })
            .finally(() => {
                if (!controller.signal.aborted) setOptionsLoading(false);
            });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (!values.bookingId) {
            return undefined;
        }
        const controller = new AbortController();
        getBooking(values.bookingId, controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) setBooking(result);
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setBooking(null);
                    setError(messageFrom(requestError));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setBookingLoading(false);
            });
        return () => controller.abort();
    }, [values.bookingId]);

    const summary = booking?.paymentSummary;
    const currency = booking?.currency || "INR";
    const remaining = useMemo(() => {
        if (values.paymentType === "Refund") return summary?.netPaid ?? 0;
        return summary?.balanceAmount ?? booking?.totalAmount ?? 0;
    }, [booking?.totalAmount, summary?.balanceAmount, summary?.netPaid, values.paymentType]);

    const setField = (field, value) => {
        setValues((current) => ({ ...current, [field]: value }));
        setError("");
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!booking && !isEditing) {
            setError("Select an accessible booking.");
            return;
        }
        if (values.paymentType === "Refund" &&
            !window.confirm(`Record a ${money(values.amount, currency)} refund for ${booking?.bookingNumber ?? payment?.bookingNumber}?`)) {
            return;
        }

        setSaving(true);
        setError("");
        const request = {
            amount: Number(values.amount),
            paymentType: values.paymentType,
            paymentMethod: values.paymentMethod,
            paymentDate: new Date(values.paymentDate).toISOString(),
            transactionReference: values.transactionReference.trim() || null,
            notes: values.notes.trim() || null
        };
        try {
            const saved = isEditing
                ? await updatePayment(payment.paymentId, request)
                : await createPayment({
                    ...request,
                    bookingId: Number(values.bookingId),
                    paymentStatus: values.paymentStatus
                });
            await onSaved(saved);
        } catch (requestError) {
            setError(messageFrom(requestError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CustomerDialog
            title={isEditing ? "Edit pending payment" : "Record payment"}
            description={isEditing ? `Payment #${payment.paymentId}` : "Record a manual payment or refund against a booking."}
            onClose={onClose}
            width="max-w-2xl"
        >
            <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
                {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
                <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-[#526b65]">Booking</span>
                    <select
                        required
                        disabled={isEditing || optionsLoading || Boolean(initialBookingId)}
                        value={values.bookingId}
                        onChange={(event) => {
                            setBooking(null);
                            setBookingLoading(Boolean(event.target.value));
                            setField("bookingId", event.target.value);
                        }}
                        className="min-h-11 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#314a45] disabled:bg-[#f3f6f5]"
                    >
                        <option value="">{optionsLoading ? "Loading bookings…" : "Select booking"}</option>
                        {bookings.map((item) => (
                            <option key={item.bookingId} value={item.bookingId}>
                                {item.bookingNumber} · {item.customerName} · {item.packageName}
                            </option>
                        ))}
                        {values.bookingId && !bookings.some((item) => String(item.bookingId) === String(values.bookingId)) &&
                            <option value={values.bookingId}>{booking?.bookingNumber ?? `Booking #${values.bookingId}`}</option>}
                    </select>
                </label>

                {bookingLoading ? (
                    <p role="status" className="rounded-md bg-[#f7faf8] px-4 py-3 text-sm text-[#667d77]">Loading booking balance…</p>
                ) : booking && (
                    <section className="grid gap-3 rounded-lg border border-[#e4ece8] bg-[#f8faf9] p-4 sm:grid-cols-3">
                        <div><p className="text-xs text-[#71847e]">Booking total</p><p className="mt-1 text-sm font-semibold text-[#314a45]">{money(summary?.bookingTotal ?? booking.totalAmount, currency)}</p></div>
                        <div><p className="text-xs text-[#71847e]">Net paid</p><p className="mt-1 text-sm font-semibold text-[#314a45]">{money(summary?.netPaid, currency)}</p></div>
                        <div><p className="text-xs text-[#71847e]">{values.paymentType === "Refund" ? "Maximum refundable" : "Current balance"}</p><p className="mt-1 text-sm font-semibold text-[#176b68]">{money(remaining, currency)}</p></div>
                    </section>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#526b65]">Amount</span><input required type="number" min="0.01" step="0.01" value={values.amount} onChange={(event) => setField("amount", event.target.value)} className="min-h-11 w-full rounded-md border border-[#dce6e2] px-3 text-sm text-[#314a45]" /></label>
                    <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#526b65]">Type</span><select value={values.paymentType} onChange={(event) => setField("paymentType", event.target.value)} className="min-h-11 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#314a45]">{types.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#526b65]">Method</span><select value={values.paymentMethod} onChange={(event) => setField("paymentMethod", event.target.value)} className="min-h-11 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#314a45]">{methods.map((item) => <option key={item}>{item}</option>)}</select></label>
                    {!isEditing && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#526b65]">Status</span><select value={values.paymentStatus} onChange={(event) => setField("paymentStatus", event.target.value)} className="min-h-11 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#314a45]">{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>}
                    <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#526b65]">Payment date</span><input required type="datetime-local" value={values.paymentDate} onChange={(event) => setField("paymentDate", event.target.value)} className="min-h-11 w-full rounded-md border border-[#dce6e2] px-3 text-sm text-[#314a45]" /></label>
                    <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#526b65]">Transaction reference</span><input maxLength="150" value={values.transactionReference} onChange={(event) => setField("transactionReference", event.target.value)} className="min-h-11 w-full rounded-md border border-[#dce6e2] px-3 text-sm text-[#314a45]" /></label>
                </div>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#526b65]">Notes</span><textarea rows="3" maxLength="1000" value={values.notes} onChange={(event) => setField("notes", event.target.value)} className="w-full rounded-md border border-[#dce6e2] px-3 py-2 text-sm text-[#314a45]" /></label>
                <p className="text-xs text-[#7b8d88]">The server validates the booking balance and refund limit when a payment is completed.</p>
                <footer className="flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 text-sm font-semibold text-[#526b65]">Close</button>
                    <button type="submit" disabled={saving || bookingLoading || (!isEditing && !values.bookingId)} className="min-h-10 rounded-md bg-[#176b68] px-4 text-sm font-semibold text-white hover:bg-[#125956] disabled:opacity-50">{saving ? "Saving…" : isEditing ? "Save changes" : "Record payment"}</button>
                </footer>
            </form>
        </CustomerDialog>
    );
}
