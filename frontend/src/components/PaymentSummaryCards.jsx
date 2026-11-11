import { useEffect, useState } from "react";
import { getPaymentSummary } from "../services/paymentApi";

const metrics = [
    ["Total Payments Received", "totalPaymentsReceived"],
    ["Pending Payments", "pendingPayments"],
    ["Outstanding Booking Balance", "outstandingBookingBalance"],
    ["Refunds Processed", "refundsProcessed"]
];

function formatCurrency(value, currency) {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value ?? 0);
    } catch {
        return `${currency} ${Number(value ?? 0).toFixed(2)}`;
    }
}

export default function PaymentSummaryCards() {
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        getPaymentSummary(controller.signal)
            .then((response) => {
                if (!controller.signal.aborted) setCurrencies(response.currencies ?? []);
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setError(requestError.response?.data?.detail || requestError.response?.data?.title || "Payment summary could not be loaded.");
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, []);

    return (
        <section aria-label="Payment summary">
            <h2 className="mb-3 text-sm font-semibold text-[#31504a]">Payments</h2>
            {error ? (
                <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
            ) : loading ? (
                <p role="status" className="rounded-md border border-[#e3ebe7] bg-white px-4 py-6 text-sm text-[#71847e]">Loading payment totals…</p>
            ) : currencies.length === 0 ? (
                <p className="rounded-md border border-[#e3ebe7] bg-white px-4 py-6 text-sm text-[#71847e]">No booking payment totals yet.</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                    {metrics.map(([title, field]) => (
                        <article key={field} className="min-h-32 rounded-lg border border-[#e3ebe7] bg-white p-5 shadow-[0_3px_14px_rgba(27,65,57,0.035)]">
                            <p className="text-xs font-semibold text-[#526b65]">{title}</p>
                            <div className="mt-4 space-y-1">
                                {currencies.map((summary) => (
                                    <p key={summary.currency} className="text-lg font-semibold text-[#20332f]">
                                        {formatCurrency(summary[field], summary.currency)}
                                    </p>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
