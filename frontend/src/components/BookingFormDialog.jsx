import { useEffect, useMemo, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import {
    createBooking,
    createBookingFromLead,
    updateBooking
} from "../services/bookingApi";
import { getCustomers } from "../services/customerApi";
import { getLead, getLeads, getAssignableStaff } from "../services/leadApi";
import { getTravelPackages } from "../services/travelPackageApi";

function messageFrom(error) {
    return error.response?.data?.detail || error.response?.data?.title || error.message || "The booking could not be saved.";
}

function money(value, currency) {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value ?? 0);
    } catch {
        return `${currency} ${Number(value ?? 0).toFixed(2)}`;
    }
}

function dateAfter(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

function travelerSlots(adults, children, infants) {
    return [
        ...Array.from({ length: Number(adults) || 0 }, (_, index) => ({ type: "Adult", index })),
        ...Array.from({ length: Number(children) || 0 }, (_, index) => ({ type: "Child", index })),
        ...Array.from({ length: Number(infants) || 0 }, (_, index) => ({ type: "Infant", index }))
    ];
}

export default function BookingFormDialog({ booking, initialLeadId, isAdmin, onClose, onSaved }) {
    const isEditing = Boolean(booking);
    const [customers, setCustomers] = useState([]);
    const [leads, setLeads] = useState([]);
    const [packages, setPackages] = useState([]);
    const [staff, setStaff] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [optionsError, setOptionsError] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [lead, setLead] = useState(null);
    const [loadedInitialLeadId, setLoadedInitialLeadId] = useState(null);
    const [includeTravelerDetails, setIncludeTravelerDetails] = useState(
        Boolean(booking?.travelers?.length)
    );
    const [travelers, setTravelers] = useState(booking?.travelers ?? []);
    const [values, setValues] = useState({
        customerId: booking?.customerId ?? "",
        leadId: initialLeadId ?? "",
        travelPackageId: booking?.travelPackageId ?? "",
        travelStartDate: booking?.travelStartDate ?? dateAfter(1),
        travelEndDate: booking?.travelEndDate ?? dateAfter(8),
        numberOfAdults: booking?.numberOfAdults ?? 1,
        numberOfChildren: booking?.numberOfChildren ?? 0,
        numberOfInfants: booking?.numberOfInfants ?? 0,
        discountAmount: booking?.discountAmount ?? 0,
        additionalCharges: booking?.additionalCharges ?? 0,
        specialRequests: booking?.specialRequests ?? "",
        assignedToUserId: booking?.assignedToUserId ?? ""
    });

    useEffect(() => {
        const controller = new AbortController();
        async function loadOptions() {
            setOptionsLoading(true);
            setOptionsError("");
            try {
                const requests = [
                    getTravelPackages({ page: 1, pageSize: 100 }, controller.signal)
                ];
                if (!isEditing) {
                    requests.push(
                        getCustomers({ page: 1, pageSize: 100, signal: controller.signal }),
                        getLeads({ page: 1, pageSize: 100, signal: controller.signal })
                    );
                }
                if (isAdmin) requests.push(getAssignableStaff(controller.signal));
                const results = await Promise.all(requests);
                let resultIndex = 0;
                const packageResult = results[resultIndex++];
                setPackages((packageResult.items ?? []).filter((item) => item.isActive));
                if (!isEditing) {
                    const customerResult = results[resultIndex++];
                    const leadResult = results[resultIndex++];
                    setCustomers((customerResult.items ?? []).filter((item) => item.isActive));
                    setLeads((leadResult.items ?? []).filter((item) => item.isActive));
                }
                if (isAdmin) setStaff(results[resultIndex] ?? []);
            } catch (requestError) {
                if (!controller.signal.aborted) setOptionsError(messageFrom(requestError));
            } finally {
                if (!controller.signal.aborted) setOptionsLoading(false);
            }
        }
        loadOptions();
        return () => controller.abort();
    }, [isAdmin, isEditing]);

    useEffect(() => {
        if (!initialLeadId ||
            String(values.leadId) !== String(initialLeadId) ||
            String(loadedInitialLeadId) === String(initialLeadId)) return undefined;
        const controller = new AbortController();
        getLead(initialLeadId, controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) {
                    setLoadedInitialLeadId(initialLeadId);
                    setLead(result);
                    setValues((current) => ({
                        ...current,
                        customerId: "",
                        ...(result.travelStartDate ? { travelStartDate: result.travelStartDate } : {}),
                        ...(result.travelEndDate ? { travelEndDate: result.travelEndDate } : {}),
                        numberOfAdults: result.numberOfAdults || 1,
                        numberOfChildren: result.numberOfChildren || 0
                    }));
                }
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) setError(messageFrom(requestError));
            });
        return () => controller.abort();
    }, [initialLeadId, loadedInitialLeadId, values.leadId]);

    const selectedLead = leads.find((item) => String(item.leadId) === String(values.leadId)) ||
        (String(lead?.leadId) === String(values.leadId) ? lead : null);
    const selectedPackage = packages.find(
        (item) => String(item.travelPackageId) === String(values.travelPackageId)
    );
    const pricing = useMemo(() => {
        const base = (Number(values.numberOfAdults) || 0) * (Number(selectedPackage?.adultPrice) || 0) +
            (Number(values.numberOfChildren) || 0) * (Number(selectedPackage?.childPrice) || 0) +
            (Number(values.numberOfInfants) || 0) * (Number(selectedPackage?.infantPrice) || 0);
        const discount = Number(values.discountAmount) || 0;
        const additions = Number(values.additionalCharges) || 0;
        return { base, discount, additions, total: base - discount + additions };
    }, [selectedPackage, values.additionalCharges, values.discountAmount, values.numberOfAdults, values.numberOfChildren, values.numberOfInfants]);

    const slots = travelerSlots(
        values.numberOfAdults,
        values.numberOfChildren,
        values.numberOfInfants
    );

    const setField = (field, value) => {
        const next = { ...values, [field]: value };
        setValues(next);
        if (includeTravelerDetails && ["numberOfAdults", "numberOfChildren", "numberOfInfants"].includes(field)) {
            const nextSlots = travelerSlots(
                next.numberOfAdults,
                next.numberOfChildren,
                next.numberOfInfants
            );
            setTravelers((currentTravelers) => nextSlots.map((slot, index) => {
                const existing = currentTravelers[index];
                return existing?.travelerType === slot.type
                    ? existing
                    : { fullName: "", dateOfBirth: "", gender: "", travelerType: slot.type };
            }));
        }
    };

    const changeLead = (value) => {
        const selected = leads.find((item) => String(item.leadId) === String(value)) || null;
        setLead(selected);
        setValues((current) => ({
            ...current,
            leadId: value,
            customerId: "",
            ...(selected?.travelStartDate ? { travelStartDate: selected.travelStartDate } : {}),
            ...(selected?.travelEndDate ? { travelEndDate: selected.travelEndDate } : {}),
            ...(selected ? {
                numberOfAdults: selected.numberOfAdults || 1,
                numberOfChildren: selected.numberOfChildren || 0
            } : {})
        }));
    };

    const updateTraveler = (index, field, value) =>
        setTravelers((current) => current.map((traveler, itemIndex) =>
            itemIndex === index ? { ...traveler, [field]: value } : traveler
        ));

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        const payload = {
            travelPackageId: Number(values.travelPackageId),
            travelStartDate: values.travelStartDate,
            travelEndDate: values.travelEndDate,
            numberOfAdults: Number(values.numberOfAdults),
            numberOfChildren: Number(values.numberOfChildren),
            numberOfInfants: Number(values.numberOfInfants),
            discountAmount: Number(values.discountAmount) || 0,
            additionalCharges: Number(values.additionalCharges) || 0,
            specialRequests: values.specialRequests.trim() || null,
            travelers: includeTravelerDetails
                ? travelers.map((traveler) => ({
                    fullName: traveler.fullName.trim(),
                    dateOfBirth: traveler.dateOfBirth || null,
                    gender: traveler.gender || null,
                    travelerType: traveler.travelerType
                }))
                : []
        };
        try {
            let saved;
            if (isEditing) {
                saved = await updateBooking(booking.bookingId, payload);
            } else if (values.leadId) {
                saved = await createBookingFromLead(Number(values.leadId), {
                    ...payload,
                    ...(isAdmin && values.assignedToUserId
                        ? { assignedToUserId: Number(values.assignedToUserId) }
                        : {})
                });
            } else {
                saved = await createBooking({
                    ...payload,
                    customerId: Number(values.customerId),
                    ...(isAdmin && values.assignedToUserId
                        ? { assignedToUserId: Number(values.assignedToUserId) }
                        : {})
                });
            }
            await onSaved(saved);
        } catch (requestError) {
            setError(messageFrom(requestError));
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "min-h-11 w-full rounded-md border border-[#d6e0dc] bg-white px-3.5 py-2.5 text-sm text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10";
    const labelClass = "mb-1.5 block text-xs font-semibold text-[#344e48]";

    return (
        <CustomerDialog
            title={isEditing ? `Edit ${booking.bookingNumber}` : "Create booking"}
            description={selectedLead ? `Converting ${selectedLead.leadNumber} · ${selectedLead.fullName}` : "Set the traveler, package, dates, and booking terms."}
            onClose={onClose}
            width="max-w-3xl"
        >
            <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
                {(error || optionsError) && (
                    <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {error || optionsError}
                    </div>
                )}
                {optionsLoading ? (
                    <p className="py-8 text-center text-sm text-[#71847e]">Loading booking options…</p>
                ) : (
                    <>
                        {!isEditing && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label>
                                    <span className={labelClass}>Convert a lead (optional)</span>
                                    <select value={values.leadId} onChange={(event) => changeLead(event.target.value)} className={inputClass}>
                                        <option value="">Create for an existing customer</option>
                                        {leads.map((item) => <option key={item.leadId} value={item.leadId}>{item.leadNumber} · {item.fullName}</option>)}
                                    </select>
                                </label>
                                <label>
                                    <span className={labelClass}>Customer</span>
                                    <select value={values.customerId} onChange={(event) => setField("customerId", event.target.value)} className={inputClass} required={!values.leadId} disabled={Boolean(values.leadId)}>
                                        <option value="">Select customer</option>
                                        {customers.map((item) => <option key={item.customerId} value={item.customerId}>{item.fullName} · {item.email}</option>)}
                                    </select>
                                </label>
                            </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="sm:col-span-2">
                                <span className={labelClass}>Travel package</span>
                                <select value={values.travelPackageId} onChange={(event) => setField("travelPackageId", event.target.value)} className={inputClass} required>
                                    <option value="">Select active package</option>
                                    {packages.map((item) => <option key={item.travelPackageId} value={item.travelPackageId}>{item.packageName} · {item.destination}</option>)}
                                </select>
                            </label>
                            <label>
                                <span className={labelClass}>Travel start</span>
                                <input type="date" value={values.travelStartDate} onChange={(event) => setField("travelStartDate", event.target.value)} className={inputClass} required />
                            </label>
                            <label>
                                <span className={labelClass}>Travel end</span>
                                <input type="date" value={values.travelEndDate} onChange={(event) => setField("travelEndDate", event.target.value)} className={inputClass} required min={values.travelStartDate} />
                            </label>
                            <label>
                                <span className={labelClass}>Adults</span>
                                <input type="number" min="0" max="100" value={values.numberOfAdults} onChange={(event) => setField("numberOfAdults", event.target.value)} className={inputClass} required />
                            </label>
                            <label>
                                <span className={labelClass}>Children</span>
                                <input type="number" min="0" max="100" value={values.numberOfChildren} onChange={(event) => setField("numberOfChildren", event.target.value)} className={inputClass} required />
                            </label>
                            <label>
                                <span className={labelClass}>Infants</span>
                                <input type="number" min="0" max="100" value={values.numberOfInfants} onChange={(event) => setField("numberOfInfants", event.target.value)} className={inputClass} required />
                            </label>
                            {isAdmin && (
                                <label>
                                    <span className={labelClass}>Assigned staff</span>
                                    <select value={values.assignedToUserId} onChange={(event) => setField("assignedToUserId", event.target.value)} className={inputClass}>
                                        <option value="">Unassigned</option>
                                        {staff.map((item) => <option key={item.userId} value={item.userId}>{item.fullName}</option>)}
                                    </select>
                                </label>
                            )}
                        </div>

                        <section className="rounded-lg border border-[#e4ece8] bg-[#f8faf9] p-4">
                            <h3 className="text-sm font-semibold text-[#29443e]">Pricing summary</h3>
                            <p className="mt-1 text-xs text-[#778a84]">Estimate only; the server uses current package prices to save the final total.</p>
                            {selectedPackage && <div className="mt-3 grid gap-2 text-xs text-[#667d77] sm:grid-cols-3">
                                <p>Adult: {money(selectedPackage.adultPrice, selectedPackage.currency)} each</p>
                                <p>Child: {money(selectedPackage.childPrice, selectedPackage.currency)} each</p>
                                <p>Infant: {selectedPackage.infantPrice === 0 ? `Free (${money(0, selectedPackage.currency)})` : `${money(selectedPackage.infantPrice, selectedPackage.currency)} each`}</p>
                            </div>}
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div><label className={labelClass}>Discount</label><input type="number" min="0" step="0.01" value={values.discountAmount} onChange={(event) => setField("discountAmount", event.target.value)} className={inputClass} /></div>
                                <div><label className={labelClass}>Additional charges</label><input type="number" min="0" step="0.01" value={values.additionalCharges} onChange={(event) => setField("additionalCharges", event.target.value)} className={inputClass} /></div>
                                <div className="rounded-md bg-white px-3 py-2.5"><p className="text-xs text-[#71847e]">Estimated total</p><p className="mt-1 text-lg font-bold text-[#176b68]">{selectedPackage ? money(pricing.total, selectedPackage.currency) : "—"}</p></div>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-[#344e48]">
                                <input type="checkbox" checked={includeTravelerDetails} onChange={(event) => {
                                    const enabled = event.target.checked;
                                    setIncludeTravelerDetails(enabled);
                                    if (enabled) {
                                        setTravelers((current) => slots.map((slot, index) =>
                                            current[index]?.travelerType === slot.type
                                                ? current[index]
                                                : { fullName: "", dateOfBirth: "", gender: "", travelerType: slot.type }
                                        ));
                                    }
                                }} className="h-4 w-4 accent-[#176b68]" />
                                Record traveler names and optional details
                            </label>
                            {includeTravelerDetails && slots.length > 0 && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {slots.map((slot, index) => (
                                        <fieldset key={`${slot.type}-${slot.index}`} className="space-y-2 rounded-md border border-[#e4ece8] p-3">
                                            <legend className="px-1 text-xs font-semibold text-[#526b65]">{slot.type} {slot.index + 1}</legend>
                                            <input aria-label={`${slot.type} ${slot.index + 1} name`} value={travelers[index]?.fullName ?? ""} onChange={(event) => updateTraveler(index, "fullName", event.target.value)} placeholder="Full name" className={inputClass} required />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input aria-label="Date of birth (optional)" type="date" value={travelers[index]?.dateOfBirth ?? ""} onChange={(event) => updateTraveler(index, "dateOfBirth", event.target.value)} className={inputClass} />
                                                <select aria-label="Gender (optional)" value={travelers[index]?.gender ?? ""} onChange={(event) => updateTraveler(index, "gender", event.target.value)} className={inputClass}>
                                                    <option value="">Gender (optional)</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option>
                                                </select>
                                            </div>
                                        </fieldset>
                                    ))}
                                </div>
                            )}
                        </section>
                        <label className="block">
                            <span className={labelClass}>Special requests</span>
                            <textarea value={values.specialRequests} onChange={(event) => setField("specialRequests", event.target.value)} maxLength={2000} rows={3} className={inputClass} />
                        </label>
                    </>
                )}
                <footer className="flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Close</button>
                    <button type="submit" disabled={saving || optionsLoading || Boolean(optionsError)} className="min-h-10 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125956] disabled:opacity-60">{saving ? "Saving…" : isEditing ? "Save changes" : "Create booking"}</button>
                </footer>
            </form>
        </CustomerDialog>
    );
}
