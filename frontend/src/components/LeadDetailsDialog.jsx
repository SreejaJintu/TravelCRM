import { useEffect, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import { getLead } from "../services/leadApi";
import { getLeadErrorMessage } from "../utils/leadErrors";

function formatDate(value, dateOnly = false) {
    if (!value) return "Not set";
    const date = new Date(dateOnly ? `${value.slice(0, 10)}T00:00:00` : value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export default function LeadDetailsDialog({ leadId, onClose, onEdit, onCreateFollowUp }) {
    const [lead, setLead] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        getLead(leadId, controller.signal)
            .then(setLead)
            .catch((requestError) => {
                if (!controller.signal.aborted) setError(getLeadErrorMessage(requestError));
            });
        return () => controller.abort();
    }, [leadId]);

    return (
        <CustomerDialog title="Lead details" description={lead?.leadNumber ?? "Fetching the latest lead information."} onClose={onClose} width="max-w-2xl">
            {error ? (
                <div role="alert" className="m-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
            ) : !lead ? (
                <div className="space-y-4 p-6" aria-label="Loading lead details">
                    <div className="h-5 w-2/5 animate-pulse rounded bg-[#e8efec]" />
                    <div className="h-12 animate-pulse rounded bg-[#f1f5f3]" />
                    <div className="h-12 animate-pulse rounded bg-[#f1f5f3]" />
                    <div className="h-12 animate-pulse rounded bg-[#f1f5f3]" />
                </div>
            ) : (
                <div className="p-5 sm:p-7">
                    <div className="flex flex-wrap items-start gap-4 border-b border-[#e9efec] pb-5">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#e2f2ed] text-[#21836f]">
                            <span className="text-lg font-bold">{lead.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold text-[#203a36]">{lead.fullName}</h3>
                            <p className="mt-1 text-xs text-[#71847e]">{lead.leadNumber} · {lead.destination}</p>
                        </div>
                        <span className="rounded-full bg-[#edf6f2] px-2.5 py-1 text-[10px] font-semibold text-[#237761]">{lead.leadStatus}</span>
                    </div>
                    <dl className="grid gap-x-6 gap-y-5 py-6 sm:grid-cols-2">
                        {[
                            ["Phone", lead.phone],
                            ["Email", lead.email || "Not provided"],
                            ["Travel dates", `${formatDate(lead.travelStartDate, true)} – ${formatDate(lead.travelEndDate, true)}`],
                            ["Travelers", `${lead.numberOfAdults} adults, ${lead.numberOfChildren} children`],
                            ["Budget", lead.budget == null ? "Not specified" : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(lead.budget)],
                            ["Source", lead.leadSource],
                            ["Assigned to", lead.assignedToName || "Unassigned"],
                            ["Created by", lead.createdByName],
                            ["Created", formatDate(lead.createdAt)],
                            ["Updated", formatDate(lead.updatedAt)]
                        ].map(([label, value]) => (
                            <div key={label} className="min-w-0">
                                <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#82928d]">{label}</dt>
                                <dd className="mt-1.5 break-words text-sm text-[#314a45]">{value}</dd>
                            </div>
                        ))}
                        <div className="sm:col-span-2">
                            <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#82928d]">Notes</dt>
                            <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm text-[#314a45]">{lead.notes || "No notes"}</dd>
                        </div>
                        {lead.convertedCustomerId && (
                            <div className="sm:col-span-2">
                                <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#82928d]">Converted customer</dt>
                                <dd className="mt-1.5 text-sm text-[#314a45]">#{lead.convertedCustomerId} · {formatDate(lead.convertedAt)}</dd>
                            </div>
                        )}
                    </dl>
                    <footer className="flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Close</button>
                        {onCreateFollowUp && lead.isActive && <button type="button" onClick={() => onCreateFollowUp(lead)} className="min-h-10 rounded-md border border-[#cbded6] px-4 py-2 text-sm font-semibold text-[#267d6d] hover:bg-[#edf6f2]">Schedule follow-up</button>}
                        {lead.isActive && !lead.convertedCustomerId && <button type="button" onClick={() => onEdit(lead)} className="min-h-10 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125956]">Edit lead</button>}
                    </footer>
                </div>
            )}
        </CustomerDialog>
    );
}