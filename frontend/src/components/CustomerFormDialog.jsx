import { useRef, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import { getCustomerErrorMessage, getCustomerFieldErrors } from "../utils/customerErrors";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s().-]{7,20}$/;

function validate(values) {
    const errors = {};
    if (!values.fullName.trim()) errors.fullName = "Enter the customer's full name.";
    if (!values.email.trim()) errors.email = "Enter an email address.";
    else if (!emailPattern.test(values.email.trim())) errors.email = "Enter a valid email address.";
    if (!values.phone.trim()) errors.phone = "Enter a phone number.";
    else if (!phonePattern.test(values.phone.trim())) errors.phone = "Enter a valid phone number.";
    return errors;
}

function toFormValues(customer) {
    return {
        fullName: customer?.fullName ?? "",
        email: customer?.email ?? "",
        phone: customer?.phone ?? "",
        dateOfBirth: customer?.dateOfBirth?.slice(0, 10) ?? "",
        gender: customer?.gender ?? "",
        address: customer?.address ?? ""
    };
}

const inputClass = (hasError = false) => `min-h-11 w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-[#20332f] outline-none transition placeholder:text-[#94a19d] focus:ring-4 ${hasError
    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
    : "border-[#d6e0dc] focus:border-[#176b68] focus:ring-[#176b68]/10"}`;

export default function CustomerFormDialog({ mode, customer, onClose, onSave }) {
    const [values, setValues] = useState(() => toFormValues(customer));
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
            email: values.email.trim(),
            phone: values.phone.trim(),
            dateOfBirth: values.dateOfBirth || null,
            gender: values.gender || null,
            address: values.address.trim() || null
        };

        submitting.current = true;
        setSaving(true);
        setError("");
        try {
            await onSave(payload);
        } catch (requestError) {
            setFieldErrors(getCustomerFieldErrors(requestError));
            setError(getCustomerErrorMessage(requestError));
        } finally {
            submitting.current = false;
            setSaving(false);
        }
    };

    const fields = [
        { name: "fullName", label: "Full name", type: "text", autoComplete: "name", placeholder: "e.g. Jordan Lee", required: true },
        { name: "email", label: "Email address", type: "email", autoComplete: "email", placeholder: "name@example.com", required: true },
        { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "+1 415 555 0134", required: true },
        { name: "dateOfBirth", label: "Date of birth", type: "date", autoComplete: "bday", placeholder: "", required: false }
    ];

    return (
        <CustomerDialog
            title={mode === "edit" ? "Edit customer" : "Add customer"}
            description={mode === "edit" ? "Update the traveler's contact and profile details." : "Add a traveler to your customer records."}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} noValidate className="px-5 py-5 sm:px-7 sm:py-6">
                {error && <div role="alert" className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">{error}</div>}
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    {fields.map((field) => (
                        <div key={field.name}>
                            <label htmlFor={`customer-${field.name}`} className="mb-1.5 block text-xs font-semibold text-[#344e48]">{field.label}{field.required && <span className="ml-1 text-rose-600">*</span>}</label>
                            <input
                                id={`customer-${field.name}`}
                                type={field.type}
                                autoComplete={field.autoComplete}
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
                        <label htmlFor="customer-gender" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Gender</label>
                        <select id="customer-gender" value={values.gender} onChange={(event) => updateField("gender", event.target.value)} className={`${inputClass()} pr-9`}>
                            <option value="">Select gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Non-binary">Non-binary</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="customer-address" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Address</label>
                        <textarea id="customer-address" rows="3" maxLength={500} value={values.address} onChange={(event) => updateField("address", event.target.value)} aria-invalid={Boolean(fieldErrors.address)} className={`${inputClass(Boolean(fieldErrors.address))} min-h-24 resize-y`} placeholder="Street, city, region, postal code" />
                        {fieldErrors.address && <p className="mt-1 text-xs text-rose-700">{fieldErrors.address}</p>}
                    </div>
                </div>
                <footer className="mt-7 flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] transition hover:bg-[#f5f8f6] disabled:opacity-60">Cancel</button>
                    <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#125956] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b68] disabled:cursor-wait disabled:opacity-65">
                        {saving && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                        {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Add customer"}
                    </button>
                </footer>
            </form>
        </CustomerDialog>
    );
}