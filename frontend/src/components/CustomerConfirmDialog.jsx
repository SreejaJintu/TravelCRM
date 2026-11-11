import CustomerDialog from "./CustomerDialog";

export default function CustomerConfirmDialog({ customer, activating, busy, onClose, onConfirm }) {
    const action = activating ? "Activate" : "Deactivate";

    return (
        <CustomerDialog title={`${action} customer?`} description={customer.fullName} onClose={onClose} width="max-w-md">
            <div className="p-5 sm:p-6">
                <p className="text-sm leading-6 text-[#657772]">
                    {activating
                        ? "This customer will become active again and remain in your records."
                        : "This customer will be marked inactive. Their record will remain available and can be reactivated later."}
                </p>
                <footer className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={busy} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6] disabled:opacity-60">Cancel</button>
                    <button type="button" onClick={onConfirm} disabled={busy} className={`min-h-10 rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-65 ${activating ? "bg-[#176b68] hover:bg-[#125956]" : "bg-[#b64c3c] hover:bg-[#963d31]"}`}>
                        {busy ? "Working..." : `${action} customer`}
                    </button>
                </footer>
            </div>
        </CustomerDialog>
    );
}