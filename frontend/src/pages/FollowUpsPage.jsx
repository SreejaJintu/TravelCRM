import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CompleteFollowUpDialog from "../components/CompleteFollowUpDialog";
import DashboardIcon from "../components/DashboardIcon";
import DashboardLayout from "../components/DashboardLayout";
import FollowUpAssignmentDialog from "../components/FollowUpAssignmentDialog";
import FollowUpConfirmDialog from "../components/FollowUpConfirmDialog";
import FollowUpFormDialog from "../components/FollowUpFormDialog";
import { useAuth } from "../context/useAuth";
import {
    cancelFollowUp,
    createFollowUp,
    getAssignableFollowUpStaff,
    getFollowUps,
    updateFollowUp
} from "../services/followUpApi";
import { getLeadErrorMessage } from "../utils/leadErrors";

const pageSize = 10;
const windows = [
    { value: "", label: "All" },
    { value: "today", label: "Today" },
    { value: "overdue", label: "Overdue" },
    { value: "upcoming", label: "Upcoming" }
];

const statusStyles = {
    Pending: "bg-[#f8f0db] text-[#987522]",
    Completed: "bg-[#e3f3ed] text-[#237761]",
    Cancelled: "bg-[#edf1ef] text-[#667772]"
};

function formatScheduledAt(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}

function toIso(value) {
    return value ? new Date(value).toISOString() : "";
}

function FollowUpStatus({ status }) {
    return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[status] || statusStyles.Pending}`}>{status}</span>;
}

function FollowUpRow({ followUp, onEdit, onComplete, onCancel, onAssign, isAdmin }) {
    const isPending = followUp.status === "Pending" && followUp.isActive;
    return (
        <tr className="border-t border-[#edf1ef] transition hover:bg-[#fbfcfb]">
            <td className="min-w-[220px] px-4 py-4 sm:px-5">
                <p className="text-sm font-semibold text-[#314a45]">{followUp.subject}</p>
                <p className="mt-1 text-xs text-[#7b8d88]">{followUp.followUpType}{!followUp.isActive ? " · Inactive" : ""}</p>
            </td>
            <td className="min-w-[190px] px-4 py-4 sm:px-5">
                <Link to={`/leads?search=${encodeURIComponent(followUp.leadNumber)}`} className="text-sm font-semibold text-[#347c70] hover:underline">{followUp.leadName}</Link>
                <p className="mt-1 text-xs text-[#7b8d88]">{followUp.leadNumber} · {followUp.destination}</p>
            </td>
            <td className="whitespace-nowrap px-4 py-4 text-xs text-[#526b65]">{followUp.assignedToName}</td>
            <td className="whitespace-nowrap px-4 py-4 text-xs text-[#667d77]">{formatScheduledAt(followUp.scheduledAt)}</td>
            <td className="px-4 py-4"><FollowUpStatus status={followUp.status} /></td>
            <td className="px-4 py-4 sm:px-5">
                <div className="flex min-w-[250px] items-center justify-end gap-1">
                    {isPending && <button type="button" onClick={() => onEdit(followUp)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#526b65] hover:bg-[#f1f5f3]">Edit</button>}
                    {isPending && isAdmin && <button type="button" onClick={() => onAssign(followUp)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#526b65] hover:bg-[#f1f5f3]">Assign</button>}
                    {isPending && <button type="button" onClick={() => onComplete(followUp)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#237761] hover:bg-[#edf6f2]">Complete</button>}
                    {isPending && <button type="button" onClick={() => onCancel(followUp)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#a64c3f] hover:bg-[#fcf0ed]">Cancel</button>}
                </div>
            </td>
        </tr>
    );
}

export default function FollowUpsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === "admin";
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filters, setFilters] = useState({ window: "", leadId: "", assignedToUserId: "", status: "", from: "", to: "" });
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ items: [], page: 1, pageSize, totalCount: 0, totalPages: 0 });
    const [loadedRequestKey, setLoadedRequestKey] = useState(null);
    const [requestError, setRequestError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [confirmFollowUp, setConfirmFollowUp] = useState(null);
    const [assigningFollowUp, setAssigningFollowUp] = useState(null);
    const [staff, setStaff] = useState([]);
    const [actionBusy, setActionBusy] = useState(false);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (!isAdmin) return undefined;
        const controller = new AbortController();
        getAssignableFollowUpStaff(controller.signal)
            .then((response) => {
                if (!controller.signal.aborted) setStaff(response);
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) setNotice(getLeadErrorMessage(requestError));
            });
        return () => controller.abort();
    }, [isAdmin]);

    const requestKey = useMemo(() => JSON.stringify({
        search: debouncedSearch,
        ...filters,
        page,
        reloadKey
    }), [debouncedSearch, filters, page, reloadKey]);
    const loading = loadedRequestKey !== requestKey;
    const error = requestError?.key === requestKey ? requestError.message : "";

    useEffect(() => {
        const controller = new AbortController();
        getFollowUps({
            search: debouncedSearch,
            leadId: filters.leadId,
            assignedToUserId: filters.assignedToUserId,
            status: filters.status,
            from: toIso(filters.from),
            to: toIso(filters.to),
            window: filters.window,
            page,
            pageSize,
            signal: controller.signal
        })
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
    }, [debouncedSearch, filters, page, reloadKey, requestKey]);

    const refresh = useCallback(() => setReloadKey((value) => value + 1), []);
    const updateFilter = (name, value) => {
        setFilters((current) => ({ ...current, [name]: value }));
        setPage(1);
    };

    const handleSave = async (payload) => {
        if (dialog?.type === "edit") {
            await updateFollowUp(dialog.followUp.followUpId, payload);
            setNotice("Follow-up updated.");
        } else {
            const created = await createFollowUp(payload);
            setNotice(`Follow-up scheduled for ${created.leadName}.`);
        }
        setDialog(null);
        refresh();
    };

    const handleCompleted = () => {
        setNotice("Follow-up completed and outcome recorded.");
        setDialog(null);
        refresh();
    };

    const handleCancel = async () => {
        if (!confirmFollowUp) return;
        setActionBusy(true);
        try {
            await cancelFollowUp(confirmFollowUp.followUpId);
            setNotice("Follow-up cancelled.");
            setConfirmFollowUp(null);
            refresh();
        } catch (requestError) {
            setConfirmFollowUp(null);
            setNotice(getLeadErrorMessage(requestError));
        } finally {
            setActionBusy(false);
        }
    };

    const handleAssigned = () => {
        setNotice("Follow-up assignment updated.");
        setAssigningFollowUp(null);
        refresh();
    };

    const firstRecord = result.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const lastRecord = Math.min(page * pageSize, result.totalCount);

    return (
        <DashboardLayout
            title="Follow-ups"
            search={search}
            onSearch={setSearch}
            searchLabel="Search follow-ups, leads, and subjects"
            searchPlaceholder="Search follow-ups..."
        >
            <div className="mx-auto max-w-[1440px] space-y-6">
                <section className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52706b]">Lead activity</p>
                        <h1 className="mt-2 text-3xl font-semibold text-[#1d3533]">Follow-ups</h1>
                        <p className="mt-2 text-sm text-[#667d79]">Keep every conversation and next step on schedule.</p>
                    </div>
                    <button type="button" onClick={() => setDialog({ type: "create" })} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#176b68] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#125956]">
                        <span className="text-lg leading-none" aria-hidden="true">+</span>
                        Schedule follow-up
                    </button>
                </section>

                {notice && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d8e6e1] bg-white px-4 py-3 text-sm text-[#345650]"><span>{notice}</span><button type="button" onClick={() => setNotice("")} className="font-semibold text-[#176b68] hover:underline">Dismiss</button></div>}
                {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={refresh} className="font-semibold underline underline-offset-2">Try again</button></div>}

                <section className="rounded-lg border border-[#e3ebe7] bg-white p-4 shadow-[0_3px_14px_rgba(27,65,57,0.035)] sm:p-5">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Follow-up time window">
                        {windows.map((option) => (
                            <button key={option.value} type="button" onClick={() => updateFilter("window", option.value)} aria-pressed={filters.window === option.value} className={`min-h-9 rounded-md px-3 py-2 text-xs font-semibold transition ${filters.window === option.value ? "bg-[#176b68] text-white" : "border border-[#dce7e2] text-[#526b65] hover:bg-[#f5f8f6]"}`}>
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <label className="text-xs font-semibold text-[#526b65]">Lead ID
                            <input type="number" min="1" value={filters.leadId} onChange={(event) => updateFilter("leadId", event.target.value)} placeholder="Any lead" className="mt-1.5 min-h-10 w-full rounded-md border border-[#d6e0dc] px-3 text-sm font-normal text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10" />
                        </label>
                        {isAdmin && (
                            <label className="text-xs font-semibold text-[#526b65]">Assigned staff
                                <select value={filters.assignedToUserId} onChange={(event) => updateFilter("assignedToUserId", event.target.value)} className="mt-1.5 min-h-10 w-full rounded-md border border-[#d6e0dc] bg-white px-3 text-sm font-normal text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10">
                                    <option value="">All staff</option>
                                    {staff.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}
                                </select>
                            </label>
                        )}
                        <label className="text-xs font-semibold text-[#526b65]">Status
                            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className="mt-1.5 min-h-10 w-full rounded-md border border-[#d6e0dc] bg-white px-3 text-sm font-normal text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10">
                                <option value="">All statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </label>
                        <label className="text-xs font-semibold text-[#526b65]">From
                            <input type="datetime-local" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="mt-1.5 min-h-10 w-full rounded-md border border-[#d6e0dc] px-3 text-xs font-normal text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10" />
                        </label>
                        <label className="text-xs font-semibold text-[#526b65]">To
                            <input type="datetime-local" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="mt-1.5 min-h-10 w-full rounded-md border border-[#d6e0dc] px-3 text-xs font-normal text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10" />
                        </label>
                    </div>
                </section>

                <section className="overflow-hidden rounded-lg border border-[#e3ebe7] bg-white shadow-[0_3px_14px_rgba(27,65,57,0.035)]">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9efec] px-4 py-4 sm:px-5">
                        <div><h2 className="text-sm font-semibold text-[#203a36]">Follow-up schedule</h2><p className="mt-1 text-xs text-[#7c8f89]">{loading ? "Loading records..." : `${result.totalCount} total follow-ups`}</p></div>
                        <span className="rounded border border-[#e3ebe7] bg-[#f8faf9] px-2.5 py-1.5 text-xs font-semibold text-[#526b65]">{pageSize} per page</span>
                    </header>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px] border-collapse text-left">
                            <thead><tr className="bg-[#f8faf9] text-[10px] font-bold uppercase tracking-[0.08em] text-[#83938e]">
                                <th scope="col" className="px-4 py-3.5 sm:px-5">Follow-up</th><th scope="col" className="px-4 py-3.5 sm:px-5">Lead</th><th scope="col" className="px-4 py-3.5 sm:px-5">Assigned staff</th><th scope="col" className="px-4 py-3.5 sm:px-5">Scheduled</th><th scope="col" className="px-4 py-3.5 sm:px-5">Status</th><th scope="col" className="px-4 py-3.5 text-right sm:px-5">Actions</th>
                            </tr></thead>
                            <tbody>
                                {loading && result.items.length === 0 ? (
                                    <tr><td colSpan="6" className="px-5 py-14 text-center"><span className="mx-auto grid h-8 w-8 animate-spin place-items-center rounded-full border-2 border-[#d4e5df] border-t-[#176b68]" /><span className="mt-3 block text-sm text-[#71847e]">Loading follow-ups...</span></td></tr>
                                ) : !loading && result.items.length === 0 ? (
                                    <tr><td colSpan="6" className="px-5 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#eaf4f0] text-[#338374]"><DashboardIcon name="followUps" className="h-6 w-6" /></span><p className="mt-3 text-sm font-semibold text-[#314a45]">No follow-ups found</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#7c8f89]">Schedule a follow-up or adjust your filters.</p></td></tr>
                                ) : result.items.map((followUp) => (
                                    <FollowUpRow key={followUp.followUpId} followUp={followUp} isAdmin={isAdmin} onEdit={(item) => setDialog({ type: "edit", followUp: item })} onComplete={(item) => setDialog({ type: "complete", followUp: item })} onCancel={setConfirmFollowUp} onAssign={setAssigningFollowUp} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9efec] px-4 py-3.5 sm:px-5">
                        <p className="text-xs text-[#7c8f89]">{loading ? "Updating follow-ups..." : `Showing ${firstRecord}–${lastRecord} of ${result.totalCount}`}</p>
                        <div className="flex items-center gap-2"><span className="mr-1 text-xs text-[#7c8f89]">Page {result.totalPages === 0 ? 0 : page} of {result.totalPages}</span><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={loading || page <= 1} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-md border border-[#dfe8e4] text-[#526b65] disabled:opacity-40"><DashboardIcon name="chevronLeft" className="h-4 w-4" /></button><button type="button" onClick={() => setPage((value) => Math.min(result.totalPages, value + 1))} disabled={loading || page >= result.totalPages} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-md border border-[#dfe8e4] text-[#526b65] disabled:opacity-40"><DashboardIcon name="chevronRight" className="h-4 w-4" /></button></div>
                    </footer>
                </section>
            </div>

            {(dialog?.type === "create" || dialog?.type === "edit") && <FollowUpFormDialog key={`${dialog.type}-${dialog.followUp?.followUpId ?? dialog.lead?.leadId ?? "new"}`} mode={dialog.type} followUp={dialog.followUp} lead={dialog.lead} isAdmin={isAdmin} onClose={() => setDialog(null)} onSave={handleSave} />}
            {dialog?.type === "complete" && <CompleteFollowUpDialog followUp={dialog.followUp} onClose={() => setDialog(null)} onCompleted={handleCompleted} />}
            {assigningFollowUp && <FollowUpAssignmentDialog followUp={assigningFollowUp} onClose={() => setAssigningFollowUp(null)} onAssigned={handleAssigned} />}
            {confirmFollowUp && <FollowUpConfirmDialog followUp={confirmFollowUp} busy={actionBusy} onClose={() => setConfirmFollowUp(null)} onConfirm={handleCancel} />}
        </DashboardLayout>
    );
}