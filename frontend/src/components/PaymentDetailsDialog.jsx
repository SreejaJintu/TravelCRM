import CustomerDialog from "./CustomerDialog";

const statusStyles = {
    Pending: "bg-[#f8f0db] text-[#987522]",
    Completed: "bg-[#e3f3ed] text-[#237761]",
    Failed: "bg-[#fae8e7] text-[#a84e48]",
    Refunded: "bg-[#e6eef8] text-[#4c7095]"
};

function money(value, currency = "INR") {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value ?? 0);
    } catch {
        return `${currency} ${Number(value ?? 0).toFixed(2)}`;
    }
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function PaymentDetailsDialog({
    details,
    busy,
    onClose,
    onEdit,
    onComplete,
    onFail,
    onDelete
}) {
    const payment = details.payment;
    const summary = details.summary;
    const isPending = payment.paymentStatus === "Pending";

    return (
        <CustomerDialog
            title={`Payment #${payment.paymentId}`}
            description={`${payment.bookingNumber} · ${payment.customerName}`}
            onClose={onClose}
            width="max-w-3xl"
        >
            <div className="space-y-5 p-5 sm:p-7">
                <section className="grid gap-4 sm:grid-cols-3">
                    <div><p className="text-xs text-[#7b8d88]">Amount</p><p className="mt-1 text-lg font-bold text-[#176b68]">{money(payment.amount, payment.currency)}</p></div>
                    <div><p className="text-xs text-[#7b8d88]">Type / method</p><p className="mt-1 text-sm font-semibold text-[#314a45]">{payment.paymentType} · {payment.paymentMethod}</p></div>
                    <div><p className="text-xs text-[#7b8d88]">Status</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[payment.paymentStatus] || "bg-[#edf1ef] text-[#647b76]"}`}>{payment.paymentStatus}</span></div>
                    <div><p className="text-xs text-[#7b8d88]">Date</p><p className="mt-1 text-sm text-[#314a45]">{formatDate(payment.paymentDate)}</p></div>
                    <div><p className="text-xs text-[#7b8d88]">Transaction reference</p><p className="mt-1 break-all text-sm text-[#314a45]">{payment.transactionReference || "—"}</p></div>
                    <div><p className="text-xs text-[#7b8d88]">Recorded by</p><p className="mt-1 text-sm text-[#314a45]">{payment.createdByName}</p></div>
                </section>

                {payment.notes && <p className="whitespace-pre-wrap rounded-md bg-[#f7faf8] px-4 py-3 text-sm text-[#526b65]">{payment.notes}</p>}

                <section className="grid gap-3 rounded-lg border border-[#e4ece8] p-4 sm:grid-cols-3">
                    {[
                        ["Booking total", summary.bookingTotal],
                        ["Gross paid", summary.grossPaid],
                        ["Pending payments", summary.pendingAmount],
                        ["Refunded", summary.refundedAmount],
                        ["Net paid", summary.netPaid],
                        ["Balance", summary.balanceAmount]
                    ].map(([label, amount]) => (
                        <div key={label}><p className="text-xs text-[#71847e]">{label}</p><p className="mt-1 text-sm font-semibold text-[#314a45]">{money(amount, summary.currency)}</p></div>
                    ))}
                    <div><p className="text-xs text-[#71847e]">Payment status</p><p className="mt-1 text-sm font-semibold text-[#176b68]">{summary.paymentStatus}</p></div>
                </section>

                <section>
                    <h3 className="text-sm font-semibold text-[#29443e]">Booking payment history</h3>
                    {details.bookingHistory.length === 0 ? (
                        <p className="mt-2 text-sm text-[#7b8d88]">No payments have been recorded for this booking.</p>
                    ) : (
                        <div className="mt-2 overflow-x-auto rounded-md border border-[#e4ece8]">
                            <table className="w-full min-w-[560px] text-left text-sm">
                                <thead className="bg-[#f8faf9] text-xs text-[#71847e]"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Method</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th></tr></thead>
                                <tbody className="divide-y divide-[#edf1ef]">
                                    {details.bookingHistory.map((item) => (
                                        <tr key={item.paymentId}>
                                            <td className="px-3 py-2 text-[#667d77]">{formatDate(item.paymentDate)}</td>
                                            <td className="px-3 py-2 text-[#314a45]">{item.paymentType}</td>
                                            <td className="px-3 py-2 text-[#667d77]">{item.paymentMethod}</td>
                                            <td className="px-3 py-2 font-medium text-[#314a45]">{money(item.amount, item.currency)}</td>
                                            <td className="px-3 py-2 text-[#667d77]">{item.paymentStatus}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <footer className="flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-4 sm:flex-row sm:justify-end">
                    {isPending && <button type="button" onClick={onDelete} disabled={busy} className="min-h-10 rounded-md px-3 text-sm font-semibold text-[#a64c3f] hover:bg-[#fcf0ed] disabled:opacity-50">Delete pending</button>}
                    {isPending && <button type="button" onClick={onFail} disabled={busy} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 text-sm font-semibold text-[#526b65] disabled:opacity-50">Mark failed</button>}
                    {isPending && <button type="button" onClick={onComplete} disabled={busy} className="min-h-10 rounded-md bg-[#176b68] px-4 text-sm font-semibold text-white hover:bg-[#125956] disabled:opacity-50">Mark completed</button>}
                    {isPending && <button type="button" onClick={onEdit} disabled={busy} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 text-sm font-semibold text-[#526b65] disabled:opacity-50">Edit</button>}
                    <button type="button" onClick={onClose} disabled={busy} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 text-sm font-semibold text-[#526b65] disabled:opacity-50">Close</button>
                </footer>
            </div>
        </CustomerDialog>
    );
}
