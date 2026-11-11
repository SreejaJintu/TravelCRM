import { useRef, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import { getLeadErrorMessage, getLeadFieldErrors } from "../utils/leadErrors";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s().-]{7,20}$/;
const leadSources = ["Website", "Phone", "Email", "Referral", "SocialMedia", "WalkIn", "Other"];

function toValues(lead) {
    return {
        fullName: lead?.fullName ?? "",
        phone: lead?.phone ?? "",
        email: lead?.email ?? "",
        destination: lead?.destination ?? "",
        travelStartDate: lead?.travelStartDate ?? "",
        travelEndDate: lead?.travelEndDate ?? "",
        numberOfAdults: String(lead?.numberOfAdults ?? 1),
        numberOfChildren: String(lead?.numberOfChildren ?? 0),
        budget: lead?.budget == null ? "" : String(lead.budget),
        leadSource: lead?.leadSource ?? "Website",
        notes: lead?.notes ?? ""
    };
}

function validate(values) {
    const errors = {};
    if (!values.fullName.trim()) errors.fullName = "Enter the lead's full name.";
    if (!values.phone.trim()) errors.phone = "Enter a phone number.";
    else if (!phonePattern.test(values.phone.trim())) errors.phone = "Enter a valid phone number.";
    if (values.email.trim() && !emailPattern.test(values.email.trim())) errors.email = "Enter a valid email address.";
    if (!values.destination.trim()) errors.destination = "Enter a destination.";
    if (!values.leadSource) errors.leadSource = "Choose a lead source.";
    if (Number(values.numberOfAdults) < 1) errors.numberOfAdults = "At least one adult is required.";
    if (Number(values.numberOfChildren) < 0) errors.numberOfChildren = "Children cannot be negative.";
    if (values.budget && Number(values.budget) < 0) errors.budget = "Budget cannot be negative.";
    if (values.travelStartDate && values.travelEndDate && values.travelEndDate < values.travelStartDate) {
        errors.travelEndDate = "End date must be on or after the start date.";
    }
    return errors;
}

const fields = [
    { name: "fullName", label: "Full name", type: "text", placeholder: "e.g. Jordan Lee", required: true },
    { name: "phone", label: "Phone", type: "tel", placeholder: "+1 415 555 0134", required: true },
    { name: "email", label: "Email address", type: "email", placeholder: "name@example.com", required: false },
    { name: "destination", label: "Destination", type: "text", placeholder: "City, country or region", required: true },
    { name: "travelStartDate", label: "Travel start", type: "date" },
    { name: "travelEndDate", label: "Travel end", type: "date" },
    { name: "numberOfAdults", label: "Adults", type: "number", min: 1, max: 50 },
    { name: "numberOfChildren", label: "Children", type: "number", min: 0, max: 50 },
    { name: "budget", label: "Budget", type: "number", min: 0, step: "0.01", placeholder: "0.00" }
];

function inputClass(hasError = false) {
    return `min-h-11 w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-[#20332f] outline-none transition placeholder:text-[#94a19d] focus:ring-4 ${hasError
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
        : "border-[#d6e0dc] focus:border-[#176b68] focus:ring-[#176b68]/10"}`;
}

export default function LeadFormDialog({ mode, lead, onClose, onSave }) {
    const [values, setValues] = useState(() => toValues(lead));
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const submitting = useRef(false);

    const updateField = (field, value) => {
        setValues((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
        setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submitting.current) return;

        const errors = validate(values);
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const payload = {
            fullName: values.fullName.trim(),
            phone: values.phone.trim(),
            email: values.email.trim() || null,
            destination: values.destination.trim(),
            travelStartDate: values.travelStartDate || null,
            travelEndDate: values.travelEndDate || null,
            numberOfAdults: Number(values.numberOfAdults),
            numberOfChildren: Number(values.numberOfChildren),
            budget: values.budget ? Number(values.budget) : null,
            leadSource: values.leadSource,
            notes: values.notes.trim() || null
        };

        submitting.current = true;
        setSaving(true);
        setError("");
        try {
            await onSave(payload);
        } catch (requestError) {
            setFieldErrors(getLeadFieldErrors(requestError));
            setError(getLeadErrorMessage(requestError));
        } finally {
            submitting.current = false;
            setSaving(false);
        }
    };

    return (
        <CustomerDialog
            title={mode === "edit" ? "Edit lead" : "Create lead"}
            description={mode === "edit" ? `Update ${lead.leadNumber}` : "Capture a new travel enquiry."}
            onClose={onClose}
            width="max-w-2xl"
        >
            <form onSubmit={handleSubmit} noValidate className="px-5 py-5 sm:px-7 sm:py-6">
                {error && <div role="alert" className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">{error}</div>}
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    {fields.map((field) => (
                        <div key={field.name}>
                            <label htmlFor={`lead-${field.name}`} className="mb-1.5 block text-xs font-semibold text-[#344e48]">{field.label}{field.required && <span className="ml-1 text-rose-600">*</span>}</label>
                            <input
                                id={`lead-${field.name}`}
                                type={field.type}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                value={values[field.name]}
                                onChange={(event) => updateField(field.name, event.target.value)}
                                required={field.required}
                                aria-invalid={Boolean(fieldErrors[field.name])}
                                aria-describedby={fieldErrors[field.name] ? `${field.name}-error` : undefined}
                                placeholder={field.placeholder}
                                className={inputClass(Boolean(fieldErrors[field.name]))}
                            />
                            {fieldErrors[field.name] && <p id={`${field.name}-error`} className="mt-1 text-xs text-rose-700">{fieldErrors[field.name]}</p>}
                        </div>
                    ))}
                    <div>
                        <label htmlFor="lead-source" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Lead source <span className="text-rose-600">*</span></label>
                        <select id="lead-source" value={values.leadSource} onChange={(event) => updateField("leadSource", event.target.value)} className={inputClass(Boolean(fieldErrors.leadSource))}>
                            {leadSources.map((source) => <option key={source} value={source}>{source === "SocialMedia" ? "Social media" : source === "WalkIn" ? "Walk-in" : source}</option>)}
                        </select>
                        {fieldErrors.leadSource && <p className="mt-1 text-xs text-rose-700">{fieldErrors.leadSource}</p>}
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="lead-notes" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Notes</label>
                        <textarea id="lead-notes" rows="3" maxLength={1000} value={values.notes} onChange={(event) => updateField("notes", event.target.value)} className={`${inputClass(Boolean(fieldErrors.notes))} min-h-24 resize-y`} placeholder="Travel preferences, requests, or follow-up notes" />
                        {fieldErrors.notes && <p className="mt-1 text-xs text-rose-700">{fieldErrors.notes}</p>}
                    </div>
                </div>
                <footer className="mt-7 flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] transition hover:bg-[#f5f8f6] disabled:opacity-60">Cancel</button>
                    <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#125956] disabled:cursor-wait disabled:opacity-65">
                        {saving && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                        {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create lead"}
                    </button>
                </footer>
            </form>
        </CustomerDialog>
    );
}