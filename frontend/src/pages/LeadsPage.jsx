import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomerDialog from "../components/CustomerDialog";
import DashboardIcon from "../components/DashboardIcon";
import DashboardLayout from "../components/DashboardLayout";
import LeadAssignmentDialog from "../components/LeadAssignmentDialog";
import LeadConfirmDialog from "../components/LeadConfirmDialog";
import LeadDetailsDialog from "../components/LeadDetailsDialog";
import LeadFormDialog from "../components/LeadFormDialog";
import FollowUpFormDialog from "../components/FollowUpFormDialog";
import { useAuth } from "../context/useAuth";
import {
    activateLead,
    changeLeadStatus,
    convertLead,
    createLead,
    deactivateLead,
    getLead,
    getLeads,
    updateLead
} from "../services/leadApi";
import { getLeadErrorMessage } from "../utils/leadErrors";
import { createFollowUp } from "../services/followUpApi";

const pageSize = 10;
const statuses = ["New", "Contacted", "Qualified", "ProposalSent", "Negotiation", "Lost"];

const statusStyles = {
    New: "bg-[#e6eef8] text-[#4c7095]",
    Contacted: "bg-[#eaf0fb] text-[#5b70a4]",
    Qualified: "bg-[#e3f3ed] text-[#237761]",
    ProposalSent: "bg-[#f8f0db] text-[#987522]",
    Negotiation: "bg-[#fae9e3] text-[#b7654d]",
    Converted: "bg-[#dff2e7] text-[#217047]",
    Lost: "bg-[#fae8e7] text-[#a84e48]"
};

function displayStatus(status) {
    return status === "ProposalSent" ? "Proposal sent" : status;
}

function formatDate(value) {
    if (!value) return "Dates not set";
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Dates not set";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatTravelWindow(lead) {
    if (!lead.travelStartDate && !lead.travelEndDate) return "Dates not set";
    if (!lead.travelStartDate) return `Through ${formatDate(lead.travelEndDate)}`;
    if (!lead.travelEndDate) return `From ${formatDate(lead.travelStartDate)}`;
    return `${formatDate(lead.travelStartDate)} – ${formatDate(lead.travelEndDate)}`;
}

function StatusBadge({ status, active }) {
    if (!active) {
        return <span className="rounded-full bg-[#edf1ef] px-2.5 py-1 text-[10px] font-semibold text-[#667772]">Inactive</span>;
    }
    return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[status] || statusStyles.New}`}>{displayStatus(status)}</span>;
}

function LeadRow({ lead, isAdmin, onView, onEdit, onStatus, onAssign, onConvert, onBook, onToggleActive }) {
    const converted = Boolean(lead.convertedCustomerId) || lead.leadStatus === "Converted";
    return (
        <tr className="border-t border-[#edf1ef] transition hover:bg-[#fbfcfb]">
            <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-[#397d70] sm:px-5">{lead.leadNumber}</td>
            <td className="min-w-[180px] px-4 py-4 sm:px-5">
                <p className="text-sm font-semibold text-[#314a45]">{lead.fullName}</p>
                <p className="mt-1 text-xs text-[#7b8d88]">{lead.email || lead.phone}</p>
            </td>
            <td className="min-w-[170px] px-4 py-4">
                <p className="text-sm text-[#314a45]">{lead.destination}</p>
                <p className="mt-1 text-[11px] text-[#82928d]">{formatTravelWindow(lead)}</p>
            </td>
            <td className="whitespace-nowrap px-4 py-4 text-xs text-[#667d77]">{lead.numberOfAdults} adults · {lead.numberOfChildren} children</td>
            <td className="px-4 py-4"><StatusBadge status={lead.leadStatus} active={lead.isActive} /></td>
            <td className="whitespace-nowrap px-4 py-4 text-xs text-[#667d77]">{lead.assignedToName || "Unassigned"}</td>
            <td className="px-4 py-4 sm:px-5">
                <div className="flex min-w-[380px] items-center justify-end gap-1">
                    <button type="button" onClick={() => onView(lead)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#397d70] hover:bg-[#edf6f2]">View</button>
                    {lead.isActive && !converted && <button type="button" onClick={() => onEdit(lead)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#526b65] hover:bg-[#f1f5f3]">Edit</button>}
                    {lead.isActive && !converted && <button type="button" onClick={() => onStatus(lead)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#526b65] hover:bg-[#f1f5f3]">Status</button>}
                    {isAdmin && lead.isActive && !converted && <button type="button" onClick={() => onAssign(lead)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#526b65] hover:bg-[#f1f5f3]">Assign</button>}
                    {lead.isActive && !converted && <button type="button" onClick={() => onConvert(lead)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#237761] hover:bg-[#edf6f2]">Convert</button>}
                    {lead.isActive && <button type="button" onClick={() => onBook(lead)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#237761] hover:bg-[#edf6f2]">Booking</button>}
                    <button type="button" onClick={() => onToggleActive(lead)} className={`rounded px-2 py-1.5 text-xs font-semibold ${lead.isActive ? "text-[#a64c3f] hover:bg-[#fcf0ed]" : "text-[#237761] hover:bg-[#edf6f2]"}`}>
                        {lead.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                </div>
            </td>
        </tr>
    );
}

function LeadStatusDialog({ lead, onClose, onSave }) {
    const [status, setStatus] = useState(lead.leadStatus);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            await onSave(status);
        } catch (requestError) {
            setError(getLeadErrorMessage(requestError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CustomerDialog title="Update lead status" description={lead.leadNumber} onClose={onClose} width="max-w-md">
            <form onSubmit={submit} className="p-5 sm:p-6">
                {error && <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
                <label htmlFor="lead-status-select" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Status</label>
                <select id="lead-status-select" value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 w-full rounded-md border border-[#d6e0dc] bg-white px-3.5 py-2.5 text-sm text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10">
                    {statuses.map((item) => <option key={item} value={item}>{displayStatus(item)}</option>)}
                </select>
                <footer className="mt-6 flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Cancel</button>
                    <button type="submit" disabled={saving} className="min-h-10 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125956] disabled:opacity-60">{saving ? "Saving..." : "Save status"}</button>
                </footer>
            </form>
        </CustomerDialog>
    );
}

export default function LeadsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === "admin";
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlSearch = searchParams.get("search") ?? "";
    const [search, setSearch] = useState(urlSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ items: [], page: 1, pageSize, totalCount: 0, totalPages: 0 });
    const [loadedRequestKey, setLoadedRequestKey] = useState(null);
    const [requestError, setRequestError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [notice, setNotice] = useState("");
    const [confirm, setConfirm] = useState(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [assigningLead, setAssigningLead] = useState(null);
    const [loadingLead, setLoadingLead] = useState(false);
    const [followUpLead, setFollowUpLead] = useState(null);
    const requestId = useRef(0);
    const requestKey = `${debouncedSearch}\u0000${page}\u0000${reloadKey}`;
    const loading = loadedRequestKey !== requestKey;
    const error = requestError?.key === requestKey ? requestError.message : "";

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const controller = new AbortController();
        getLeads({ search: debouncedSearch, page, pageSize, signal: controller.signal })
            .then((response) => {
                if (!controller.signal.aborted) {
                    setResult(response);
                    setRequestError(null);
                    setLoadedRequestKey(requestKey);
                }
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setRequestError({ key: requestKey, message: getLeadErrorMessage(requestError) });
                    setLoadedRequestKey(requestKey);
                }
            });
        return () => controller.abort();
    }, [debouncedSearch, page, reloadKey, requestKey]);

    const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

    const openEdit = async (lead) => {
        const currentRequestId = ++requestId.current;
        setLoadingLead(true);
        setDialog({ type: "loading" });
        try {
            const details = await getLead(lead.leadId);
            if (requestId.current === currentRequestId) setDialog({ type: "edit", lead: details });
        } catch (requestError) {
            if (requestId.current === currentRequestId) {
                setDialog(null);
                setNotice(getLeadErrorMessage(requestError));
            }
        } finally {
            if (requestId.current === currentRequestId) setLoadingLead(false);
        }
    };

    const handleSave = async (lead) => {
        if (dialog?.type === "edit") {
            await updateLead(dialog.lead.leadId, lead);
            setNotice("Lead details updated.");
        } else {
            const created = await createLead(lead);
            setNotice(`Lead ${created.leadNumber} created.`);
        }
        setDialog(null);
        refresh();
    };

    const handleStatusSave = async (status) => {
        await changeLeadStatus(dialog.lead.leadId, status);
        setDialog(null);
        setNotice(`Lead ${dialog.lead.leadNumber} moved to ${displayStatus(status)}.`);
        refresh();
    };

    const runConfirmedAction = async () => {
        if (!confirm) return;
        setActionBusy(true);
        try {
            if (confirm.type === "convert") {
                const conversion = await convertLead(confirm.lead.leadId);
                setNotice(`${conversion.message} Customer #${conversion.customerId}.`);
            } else if (confirm.type === "deactivate") {
                await deactivateLead(confirm.lead.leadId);
                setNotice(`${confirm.lead.leadNumber} deactivated.`);
            } else {
                await activateLead(confirm.lead.leadId);
                setNotice(`${confirm.lead.leadNumber} reactivated.`);
            }
            setConfirm(null);
            refresh();
        } catch (requestError) {
            setConfirm(null);
            setNotice(getLeadErrorMessage(requestError));
        } finally {
            setActionBusy(false);
        }
    };

    const handleAssignmentComplete = () => {
        const leadNumber = assigningLead?.leadNumber;
        setAssigningLead(null);
        setNotice(`${leadNumber} assignment updated.`);
        refresh();
    };

    const handleCreateFollowUp = (lead) => {
        setDialog(null);
        setFollowUpLead(lead);
    };

    const handleFollowUpSave = async (payload) => {
        const created = await createFollowUp(payload);
        setFollowUpLead(null);
        setNotice(`Follow-up scheduled for ${created.leadName}.`);
    };

    const firstRecord = result.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const lastRecord = Math.min(page * pageSize, result.totalCount);

    return (
        <DashboardLayout
            title="Leads & enquiries"
            search={search}
            onSearch={setSearch}
            searchLabel="Search leads by name, phone, email, destination, source, or status"
            searchPlaceholder="Search leads and enquiries..."
        >
            <div className="mx-auto max-w-[1440px] space-y-6">
                <section className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52706b]">Sales pipeline</p>
                        <h1 className="mt-2 text-3xl font-semibold text-[#1d3533]">Leads & enquiries</h1>
                        <p className="mt-2 text-sm text-[#667d79]">Track travel enquiries from first contact through conversion.</p>
                    </div>
                    <button type="button" onClick={() => setDialog({ type: "create" })} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#176b68] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#125956] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b68]">
                        <span className="text-lg leading-none" aria-hidden="true">+</span>
                        Create lead
                    </button>
                </section>

                {notice && (
                    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d8e6e1] bg-white px-4 py-3 text-sm text-[#345650]">
                        <span>{notice}</span>
                        <button type="button" onClick={() => setNotice("")} className="font-semibold text-[#176b68] hover:underline">Dismiss</button>
                    </div>
                )}

                {error && (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        <span>{error}</span>
                        <button type="button" onClick={refresh} className="font-semibold underline underline-offset-2">Try again</button>
                    </div>
                )}

                <section className="overflow-hidden rounded-lg border border-[#e3ebe7] bg-white shadow-[0_3px_14px_rgba(27,65,57,0.035)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9efec] px-4 py-4 sm:px-5">
                        <div>
                            <h2 className="text-sm font-semibold text-[#203a36]">Lead pipeline</h2>
                            <p className="mt-1 text-xs text-[#7c8f89]">{loading ? "Loading records..." : `${result.totalCount} total ${result.totalCount === 1 ? "lead" : "leads"}`}</p>
                        </div>
                        <span className="rounded border border-[#e3ebe7] bg-[#f8faf9] px-2.5 py-1.5 text-xs font-semibold text-[#526b65]">{pageSize} per page</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1150px] border-collapse text-left">
                            <thead>
                                <tr className="bg-[#f8faf9] text-[10px] font-bold uppercase tracking-[0.08em] text-[#83938e]">
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Lead</th>
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Contact</th>
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Destination & dates</th>
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Travelers</th>
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Status</th>
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Assigned to</th>
                                    <th scope="col" className="px-4 py-3.5 text-right sm:px-5">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && result.items.length === 0 ? (
                                    <tr><td colSpan="7" className="px-5 py-14 text-center">
                                        <span className="mx-auto grid h-8 w-8 animate-spin place-items-center rounded-full border-2 border-[#d4e5df] border-t-[#176b68]" />
                                        <span className="mt-3 block text-sm text-[#71847e]">Loading leads...</span>
                                    </td></tr>
                                ) : !loading && result.items.length === 0 ? (
                                    <tr><td colSpan="7" className="px-5 py-14 text-center">
                                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#eaf4f0] text-[#338374]"><DashboardIcon name="leads" className="h-6 w-6" /></span>
                                        <p className="mt-3 text-sm font-semibold text-[#314a45]">{debouncedSearch ? "No matching leads" : "No leads yet"}</p>
                                        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#7c8f89]">{debouncedSearch ? "Try a different search term." : "Create a lead to start tracking a travel enquiry."}</p>
                                        {!debouncedSearch && <button type="button" onClick={() => setDialog({ type: "create" })} className="mt-4 text-xs font-semibold text-[#176b68] hover:underline">Create a lead</button>}
                                    </td></tr>
                                ) : (
                                    result.items.map((lead) => (
                                        <LeadRow
                                            key={lead.leadId}
                                            lead={lead}
                                            isAdmin={isAdmin}
                                            onView={(item) => setDialog({ type: "view", id: item.leadId })}
                                            onEdit={openEdit}
                                            onStatus={(item) => setDialog({ type: "status", lead: item })}
                                            onAssign={setAssigningLead}
                                            onConvert={(item) => setConfirm({ type: "convert", lead: item })}
                                            onBook={(item) => navigate(`/bookings?leadId=${item.leadId}`)}
                                            onToggleActive={(item) => setConfirm({ type: item.isActive ? "deactivate" : "activate", lead: item })}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9efec] px-4 py-3.5 sm:px-5">
                        <p className="text-xs text-[#7c8f89]">{loading ? "Updating lead list..." : `Showing ${firstRecord}–${lastRecord} of ${result.totalCount}`}</p>
                        <div className="flex items-center gap-2">
                            <span className="mr-1 text-xs text-[#7c8f89]">Page {result.totalPages === 0 ? 0 : page} of {result.totalPages}</span>
                            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-md border border-[#dfe8e4] text-[#526b65] hover:bg-[#f3f8f5] disabled:cursor-not-allowed disabled:opacity-40"><DashboardIcon name="chevronLeft" className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))} disabled={loading || page >= result.totalPages} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-md border border-[#dfe8e4] text-[#526b65] hover:bg-[#f3f8f5] disabled:cursor-not-allowed disabled:opacity-40"><DashboardIcon name="chevronRight" className="h-4 w-4" /></button>
                        </div>
                    </footer>
                </section>
            </div>

            {(dialog?.type === "create" || dialog?.type === "edit") && (
                <LeadFormDialog
                    key={`${dialog.type}-${dialog.lead?.leadId ?? "new"}`}
                    mode={dialog.type}
                    lead={dialog.lead}
                    onClose={() => setDialog(null)}
                    onSave={handleSave}
                />
            )}
            {dialog?.type === "view" && <LeadDetailsDialog leadId={dialog.id} onClose={() => setDialog(null)} onEdit={openEdit} onCreateFollowUp={handleCreateFollowUp} />}
            {dialog?.type === "status" && <LeadStatusDialog lead={dialog.lead} onClose={() => setDialog(null)} onSave={handleStatusSave} />}
            {dialog?.type === "loading" && (
                <CustomerDialog title="Loading lead" description="Fetching the latest lead details." onClose={() => { requestId.current += 1; setDialog(null); setLoadingLead(false); }} width="max-w-md">
                    <div className="p-8 text-center text-sm text-[#71847e]">Please wait...</div>
                </CustomerDialog>
            )}
            {assigningLead && <LeadAssignmentDialog lead={assigningLead} onClose={() => setAssigningLead(null)} onAssigned={handleAssignmentComplete} />}
            {followUpLead && <FollowUpFormDialog mode="create" lead={followUpLead} isAdmin={isAdmin} onClose={() => setFollowUpLead(null)} onSave={handleFollowUpSave} />}
            {confirm && (
                <LeadConfirmDialog
                    title={confirm.type === "convert" ? "Convert this lead?" : confirm.type === "deactivate" ? "Deactivate this lead?" : "Reactivate this lead?"}
                    description={confirm.type === "convert"
                        ? "The lead history will be preserved and linked to a new or matching customer. Existing customer data will not be overwritten."
                        : confirm.type === "deactivate"
                            ? `${confirm.lead.leadNumber} will be marked inactive but remain in your records.`
                            : `${confirm.lead.leadNumber} will become active again.`}
                    confirmLabel={confirm.type === "convert" ? "Convert lead" : confirm.type === "deactivate" ? "Deactivate lead" : "Reactivate lead"}
                    danger={confirm.type === "deactivate"}
                    busy={actionBusy}
                    onClose={() => setConfirm(null)}
                    onConfirm={runConfirmedAction}
                />
            )}
            {loadingLead && <span className="sr-only" role="status">Loading selected lead</span>}
        </DashboardLayout>
    );
}