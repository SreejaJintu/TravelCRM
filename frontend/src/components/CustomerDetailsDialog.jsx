import { useEffect, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import { getCustomer } from "../services/customerApi";
import { getCustomerErrorMessage } from "../utils/customerErrors";

function formatDate(value, dateOnly = false) {
    if (!value) return "Not provided";
    const date = new Date(dateOnly ? `${value.slice(0, 10)}T00:00:00` : value);
    if (Number.isNaN(date.getTime())) return "Not provided";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(date);
}

export default function CustomerDetailsDialog({ customerId, onClose }) {
    const [customer, setCustomer] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        getCustomer(customerId, controller.signal)
            .then(setCustomer)
            .catch((requestError) => {
                if (!controller.signal.aborted) setError(getCustomerErrorMessage(requestError));
            });
        return () => controller.abort();
    }, [customerId]);

    return (
        <CustomerDialog title="Customer details" description="Contact and account information" onClose={onClose}>
            {error ? (
                <div role="alert" className="m-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
            ) : !customer ? (
                <div className="space-y-4 p-6" aria-label="Loading customer details">
                    <div className="h-5 w-2/5 animate-pulse rounded bg-[#e8efec]" />
                    <div className="h-12 animate-pulse rounded bg-[#f1f5f3]" />
                    <div className="h-12 animate-pulse rounded bg-[#f1f5f3]" />
                    <div className="h-12 animate-pulse rounded bg-[#f1f5f3]" />
                </div>
            ) : (
                <div className="p-5 sm:p-7">
                    <div className="flex items-center gap-4 border-b border-[#e9efec] pb-5">
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#dcece6] text-lg font-bold text-[#225b55]">
                            {customer.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                        </span>
                        <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold text-[#203a36]">{customer.fullName}</h3>
                            <p className="mt-1 text-xs text-[#71847e]">Customer #{customer.customerId}</p>
                        </div>
                        <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${customer.isActive ? "bg-[#e3f3ed] text-[#237761]" : "bg-[#edf1ef] text-[#667772]"}`}>
                            {customer.isActive ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <dl className="grid gap-x-6 gap-y-5 py-6 sm:grid-cols-2">
                        {[
                            ["Email", customer.email],
                            ["Phone", customer.phone],
                            ["Date of birth", formatDate(customer.dateOfBirth, true)],
                            ["Gender", customer.gender || "Not provided"],
                            ["Created", formatDate(customer.createdAt)],
                            ["Created by", customer.createdByName]
                        ].map(([label, value]) => (
                            <div key={label} className="min-w-0">
                                <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#82928d]">{label}</dt>
                                <dd className="mt-1.5 break-words text-sm text-[#314a45]">{value}</dd>
                            </div>
                        ))}
                        <div className="sm:col-span-2">
                            <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#82928d]">Address</dt>
                            <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm text-[#314a45]">{customer.address || "Not provided"}</dd>
                        </div>
                    </dl>
                    <footer className="flex justify-end border-t border-[#e9efec] pt-5">
                        <button type="button" onClick={onClose} className="min-h-10 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#125956]">Close</button>
                    </footer>
                </div>
            )}
        </CustomerDialog>
    );
}