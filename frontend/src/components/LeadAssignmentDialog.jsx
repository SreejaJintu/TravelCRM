import { useEffect, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import { assignLead, getAssignableStaff } from "../services/leadApi";
import { getLeadErrorMessage } from "../utils/leadErrors";

export default function LeadAssignmentDialog({ lead, onClose, onAssigned }) {
    const [staff, setStaff] = useState([]);
    const [assignedToUserId, setAssignedToUserId] = useState(lead.assignedToUserId ? String(lead.assignedToUserId) : "");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        getAssignableStaff(controller.signal)
            .then(setStaff)
            .catch((requestError) => {
                if (!controller.signal.aborted) setError(getLeadErrorMessage(requestError));
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            await assignLead(lead.leadId, assignedToUserId ? Number(assignedToUserId) : null);
            onAssigned();
        } catch (requestError) {
            setError(getLeadErrorMessage(requestError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CustomerDialog title="Assign lead" description={`${lead.leadNumber} · ${lead.fullName}`} onClose={onClose} width="max-w-md">
            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
                {error && <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
                <label htmlFor="lead-assignee" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Staff member</label>
                <select id="lead-assignee" value={assignedToUserId} onChange={(event) => setAssignedToUserId(event.target.value)} disabled={loading || saving} className="min-h-11 w-full rounded-md border border-[#d6e0dc] bg-white px-3.5 py-2.5 text-sm text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10 disabled:opacity-60">
                    <option value="">Unassigned</option>
                    {staff.map((member) => <option key={member.userId} value={member.userId}>{member.fullName} · {member.email}</option>)}
                </select>
                <footer className="mt-6 flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Cancel</button>
                    <button type="submit" disabled={loading || saving} className="min-h-10 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125956] disabled:opacity-60">{saving ? "Saving..." : "Save assignment"}</button>
                </footer>
            </form>
        </CustomerDialog>
    );
}