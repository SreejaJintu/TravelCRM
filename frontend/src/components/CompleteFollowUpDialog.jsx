import { useState } from "react";
import CustomerDialog from "./CustomerDialog";
import { completeFollowUp } from "../services/followUpApi";
import { getLeadErrorMessage } from "../utils/leadErrors";

export default function CompleteFollowUpDialog({ followUp, onClose, onCompleted }) {
    const [outcome, setOutcome] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!outcome.trim()) {
            setError("Record an outcome before completing this follow-up.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await completeFollowUp(followUp.followUpId, outcome.trim());
            onCompleted();
        } catch (requestError) {
            setError(getLeadErrorMessage(requestError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CustomerDialog title="Complete follow-up" description={`${followUp.subject} · ${followUp.leadName}`} onClose={onClose} width="max-w-lg">
            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
                {error && <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
                <label htmlFor="follow-up-outcome" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Outcome <span className="text-rose-600">*</span></label>
                <textarea id="follow-up-outcome" rows="4" maxLength={1000} value={outcome} onChange={(event) => setOutcome(event.target.value)} className="min-h-28 w-full rounded-md border border-[#d6e0dc] px-3.5 py-2.5 text-sm text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10" placeholder="Summarize what happened and any next steps." />
                <footer className="mt-6 flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Cancel</button>
                    <button type="submit" disabled={saving} className="min-h-10 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125956] disabled:opacity-60">{saving ? "Saving..." : "Complete follow-up"}</button>
                </footer>
            </form>
        </CustomerDialog>
    );
}