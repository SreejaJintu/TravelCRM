import { useEffect, useMemo, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import {
    addPackageContent,
    addPackageItinerary,
    createTravelPackage,
    deletePackageContent,
    deletePackageImage,
    deletePackageItinerary,
    replacePackageImage,
    setPrimaryPackageImage,
    getTravelPackage,
    updatePackageContent,
    updatePackageImageOrder,
    updatePackageItinerary,
    updateTravelPackage,
    uploadPackageImages
} from "../services/travelPackageApi";
import { getLeadErrorMessage } from "../utils/leadErrors";

const fieldClass = "min-h-10 w-full rounded-md border border-[#d6e0dc] bg-white px-3 py-2 text-sm text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10";
const imageLimit = 5 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

function packageValues(packageData) {
    return {
        packageCode: packageData?.packageCode ?? "",
        packageName: packageData?.packageName ?? "",
        destination: packageData?.destination ?? "",
        country: packageData?.country ?? "",
        packageType: packageData?.packageType ?? "",
        durationDays: String(packageData?.durationDays ?? 1),
        durationNights: String(packageData?.durationNights ?? 0),
        description: packageData?.description ?? "",
        basePrice: String(packageData?.basePrice ?? ""),
        adultPrice: String(packageData?.adultPrice ?? ""),
        childPrice: String(packageData?.childPrice ?? "0"),
        infantPrice: String(packageData?.infantPrice ?? "0"),
        currency: packageData?.currency ?? "USD"
    };
}

function defaultItinerary() {
    return { dayNumber: 1, title: "", description: "", accommodation: "", mealsIncluded: "" };
}

function messageOf(error) {
    return getLeadErrorMessage(error);
}

export default function TravelPackageFormDialog({ packageData, onClose, onSaved }) {
    const [values, setValues] = useState(() => packageValues(packageData));
    const [itinerary, setItinerary] = useState(() => packageData?.itinerary.map((item) => ({ ...item })) ?? []);
    const [inclusions, setInclusions] = useState(() => packageData?.inclusions.map((item) => ({ ...item })) ?? []);
    const [exclusions, setExclusions] = useState(() => packageData?.exclusions.map((item) => ({ ...item })) ?? []);
    const [gallery, setGallery] = useState(() => packageData?.images.map((image) => ({ ...image })).sort((a, b) => a.displayOrder - b.displayOrder) ?? []);
    const [newImages, setNewImages] = useState([]);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const previews = useMemo(() => newImages.map((file) => ({ file, url: URL.createObjectURL(file) })), [newImages]);

    useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

    const updateValue = (key, value) => setValues((current) => ({ ...current, [key]: value }));

    const selectImages = (event) => {
        const files = Array.from(event.target.files ?? []);
        const invalid = files.find((file) => !allowedTypes.includes(file.type) || file.size > imageLimit);
        if (invalid) {
            setError(`${invalid.name}: choose a JPEG, PNG, or WebP file no larger than 5 MB.`);
            event.target.value = "";
            return;
        }
        if (newImages.length + files.length > 10) {
            setError("Upload up to 10 images at a time.");
            event.target.value = "";
            return;
        }
        setNewImages((current) => [...current, ...files]);
        setError("");
        event.target.value = "";
    };

    const updateList = (setter, index, field, value) => {
        setter((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
    };

    const saveItems = async (packageId, current, previous, type) => {
        for (const oldItem of previous) {
            if (!current.some((item) => item.id === oldItem.id)) {
                await deletePackageContent(packageId, type, oldItem.id);
            }
        }
        for (const item of current) {
            const text = item.description.trim();
            if (!text) continue;
            if (item.id) {
                const old = previous.find((entry) => entry.id === item.id);
                if (old?.description !== text) await updatePackageContent(packageId, type, item.id, text);
            } else {
                await addPackageContent(packageId, type, text);
            }
        }
    };

    const saveItinerary = async (packageId, current, previous) => {
        for (const oldItem of previous) {
            if (!current.some((item) => item.itineraryId === oldItem.itineraryId)) {
                await deletePackageItinerary(packageId, oldItem.itineraryId);
            }
        }
        for (const item of current) {
            const payload = {
                dayNumber: Number(item.dayNumber),
                title: item.title.trim(),
                description: item.description.trim(),
                accommodation: item.accommodation.trim() || null,
                mealsIncluded: item.mealsIncluded.trim() || null
            };
            if (item.itineraryId) {
                const old = previous.find((entry) => entry.itineraryId === item.itineraryId);
                if (old && JSON.stringify(payload) !== JSON.stringify({
                    dayNumber: old.dayNumber,
                    title: old.title,
                    description: old.description,
                    accommodation: old.accommodation,
                    mealsIncluded: old.mealsIncluded
                })) {
                    await updatePackageItinerary(packageId, item.itineraryId, payload);
                }
            } else {
                await addPackageItinerary(packageId, payload);
            }
        }
    };

    const saveGallery = async (packageId) => {
        const orderableImages = gallery.filter((image) => !image.cleanupPending);
        if (orderableImages.length) {
            await updatePackageImageOrder(packageId, {
                images: orderableImages.map((image, index) => ({ packageImageId: image.packageImageId, displayOrder: index }))
            });
        }
        if (newImages.length) await uploadPackageImages(packageId, newImages);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        setError("");
        setNotice("");
        const payload = {
            ...values,
            packageCode: values.packageCode.trim().toUpperCase(),
            packageName: values.packageName.trim(),
            destination: values.destination.trim(),
            country: values.country.trim(),
            packageType: values.packageType.trim(),
            description: values.description.trim(),
            durationDays: Number(values.durationDays),
            durationNights: Number(values.durationNights),
            basePrice: Number(values.basePrice),
            adultPrice: Number(values.adultPrice),
            childPrice: Number(values.childPrice),
            infantPrice: Number(values.infantPrice),
            currency: values.currency.trim().toUpperCase()
        };
        let persistedPackageId = packageData?.travelPackageId ?? null;
        try {
            let saved;
            if (packageData && payload.durationDays < packageData.durationDays) {
                await saveItinerary(packageData.travelPackageId, itinerary, packageData.itinerary);
                saved = await updateTravelPackage(packageData.travelPackageId, payload);
                persistedPackageId = saved.travelPackageId;
            } else {
                saved = packageData
                    ? await updateTravelPackage(packageData.travelPackageId, payload)
                    : await createTravelPackage(payload);
                persistedPackageId = saved.travelPackageId;
                await saveItinerary(saved.travelPackageId, itinerary, packageData?.itinerary ?? []);
            }
            await saveItems(saved.travelPackageId, inclusions, packageData?.inclusions ?? [], "inclusions");
            await saveItems(saved.travelPackageId, exclusions, packageData?.exclusions ?? [], "exclusions");
            await saveGallery(saved.travelPackageId);
            await onSaved(saved.travelPackageId);
        } catch (requestError) {
            if (persistedPackageId) {
                await onSaved(persistedPackageId, { partialError: messageOf(requestError) });
                return;
            }
            setError(messageOf(requestError));
        } finally {
            setSaving(false);
        }
    };

    const runGalleryAction = async (action) => {
        setError("");
        try {
            await action();
            const refreshed = await getTravelPackage(packageData.travelPackageId);
            setGallery(refreshed.images);
            await onSaved(packageData.travelPackageId, { keepDialogOpen: true });
        } catch (requestError) {
            setError(messageOf(requestError));
            try {
                const refreshed = await getTravelPackage(packageData.travelPackageId);
                setGallery(refreshed.images);
            } catch {
                setNotice("Could not refresh the package gallery. Close and reopen the editor to reload it.");
            }
        }
    };

    return (
        <CustomerDialog
            title={packageData ? "Edit travel package" : "Create travel package"}
            description="Package details, itinerary, inclusions, exclusions, and gallery"
            onClose={onClose}
            width="max-w-5xl"
        >
            <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto p-5 sm:p-7">
                {error && <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
                {notice && <p role="status" className="mb-4 text-xs text-[#8a5a18]">{notice}</p>}

                <section>
                    <h3 className="mb-3 text-sm font-semibold text-[#203a36]">Package information</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="text-xs font-semibold text-[#526b65]">Package code
                            <input required maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,31}" className={`${fieldClass} mt-1`} value={values.packageCode} onChange={(event) => updateValue("packageCode", event.target.value)} />
                        </label>
                        <label className="text-xs font-semibold text-[#526b65]">Package name
                            <input required maxLength={150} className={`${fieldClass} mt-1`} value={values.packageName} onChange={(event) => updateValue("packageName", event.target.value)} />
                        </label>
                        <label className="text-xs font-semibold text-[#526b65]">Package type
                            <input required maxLength={50} placeholder="Adventure, Family..." className={`${fieldClass} mt-1`} value={values.packageType} onChange={(event) => updateValue("packageType", event.target.value)} />
                        </label>
                        <label className="text-xs font-semibold text-[#526b65]">Destination
                            <input required maxLength={150} className={`${fieldClass} mt-1`} value={values.destination} onChange={(event) => updateValue("destination", event.target.value)} />
                        </label>
                        <label className="text-xs font-semibold text-[#526b65]">Country
                            <input required maxLength={100} className={`${fieldClass} mt-1`} value={values.country} onChange={(event) => updateValue("country", event.target.value)} />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="text-xs font-semibold text-[#526b65]">Days
                                <input required type="number" min="1" max="365" className={`${fieldClass} mt-1`} value={values.durationDays} onChange={(event) => updateValue("durationDays", event.target.value)} />
                            </label>
                            <label className="text-xs font-semibold text-[#526b65]">Nights
                                <input required type="number" min="0" max="364" className={`${fieldClass} mt-1`} value={values.durationNights} onChange={(event) => updateValue("durationNights", event.target.value)} />
                            </label>
                        </div>
                        <label className="text-xs font-semibold text-[#526b65]">Base price
                            <input required type="number" min="0.01" step="0.01" className={`${fieldClass} mt-1`} value={values.basePrice} onChange={(event) => updateValue("basePrice", event.target.value)} />
                        </label>
                        <label className="text-xs font-semibold text-[#526b65]">Adult price
                            <input required type="number" min="0.01" step="0.01" className={`${fieldClass} mt-1`} value={values.adultPrice} onChange={(event) => updateValue("adultPrice", event.target.value)} />
                        </label>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <label className="text-xs font-semibold text-[#526b65]">Child price
                                <input required type="number" min="0" step="0.01" className={`${fieldClass} mt-1`} value={values.childPrice} onChange={(event) => updateValue("childPrice", event.target.value)} />
                            </label>
                            <label className="text-xs font-semibold text-[#526b65]">Infant price
                                <input required type="number" min="0" step="0.01" className={`${fieldClass} mt-1`} value={values.infantPrice} onChange={(event) => updateValue("infantPrice", event.target.value)} />
                            </label>
                            <label className="text-xs font-semibold text-[#526b65]">Currency
                                <input required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" className={`${fieldClass} mt-1 uppercase`} value={values.currency} onChange={(event) => updateValue("currency", event.target.value)} />
                            </label>
                        </div>
                        <label className="text-xs font-semibold text-[#526b65] sm:col-span-2 lg:col-span-3">Description
                            <textarea required maxLength={4000} rows={3} className={`${fieldClass} mt-1 resize-y`} value={values.description} onChange={(event) => updateValue("description", event.target.value)} />
                        </label>
                    </div>
                </section>

                <section className="mt-7 border-t border-[#e9efec] pt-5">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[#203a36]">Day-wise itinerary</h3><button type="button" onClick={() => setItinerary((current) => [...current, { ...defaultItinerary(), dayNumber: current.length + 1 }])} className="text-xs font-semibold text-[#267d6d] hover:underline">Add day</button></div>
                    <div className="mt-3 space-y-3">
                        {itinerary.map((item, index) => (
                            <fieldset key={item.itineraryId ?? `new-${index}`} className="grid gap-2 rounded-md border border-[#e3ebe7] p-3 sm:grid-cols-2 lg:grid-cols-6">
                                <label className="text-[11px] font-semibold text-[#526b65]">Day<input type="number" min="1" max={values.durationDays} required className={`${fieldClass} mt-1`} value={item.dayNumber} onChange={(event) => updateList(setItinerary, index, "dayNumber", event.target.value)} /></label>
                                <label className="text-[11px] font-semibold text-[#526b65] lg:col-span-2">Title<input required maxLength={150} className={`${fieldClass} mt-1`} value={item.title} onChange={(event) => updateList(setItinerary, index, "title", event.target.value)} /></label>
                                <label className="text-[11px] font-semibold text-[#526b65] lg:col-span-3">Description<input required maxLength={2000} className={`${fieldClass} mt-1`} value={item.description} onChange={(event) => updateList(setItinerary, index, "description", event.target.value)} /></label>
                                <label className="text-[11px] font-semibold text-[#526b65] sm:col-span-1 lg:col-span-3">Accommodation<input maxLength={200} className={`${fieldClass} mt-1`} value={item.accommodation ?? ""} onChange={(event) => updateList(setItinerary, index, "accommodation", event.target.value)} /></label>
                                <label className="text-[11px] font-semibold text-[#526b65] sm:col-span-1 lg:col-span-2">Meals included<input maxLength={200} className={`${fieldClass} mt-1`} value={item.mealsIncluded ?? ""} onChange={(event) => updateList(setItinerary, index, "mealsIncluded", event.target.value)} /></label>
                                <button type="button" onClick={() => setItinerary((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="self-end rounded px-2 py-2 text-xs font-semibold text-[#a64c3f] hover:bg-[#fcf0ed]">Remove day</button>
                            </fieldset>
                        ))}
                        {itinerary.length === 0 && <p className="text-xs text-[#7c8f89]">No itinerary days added.</p>}
                    </div>
                </section>

                {[
                    ["Inclusions", inclusions, setInclusions],
                    ["Exclusions", exclusions, setExclusions]
                ].map(([label, items, setter]) => (
                    <section key={label} className="mt-7 border-t border-[#e9efec] pt-5">
                        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[#203a36]">{label}</h3><button type="button" onClick={() => setter((current) => [...current, { description: "" }])} className="text-xs font-semibold text-[#267d6d] hover:underline">Add item</button></div>
                        <div className="mt-3 space-y-2">
                            {items.map((item, index) => (
                                <div key={item.id ?? `new-${index}`} className="flex gap-2">
                                    <input required maxLength={500} className={fieldClass} value={item.description} onChange={(event) => updateList(setter, index, "description", event.target.value)} aria-label={`${label} item`} />
                                    <button type="button" onClick={() => setter((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${label} item`} className="rounded px-3 text-xs font-semibold text-[#a64c3f] hover:bg-[#fcf0ed]">Remove</button>
                                </div>
                            ))}
                            {items.length === 0 && <p className="text-xs text-[#7c8f89]">No {label.toLowerCase()} added.</p>}
                        </div>
                    </section>
                ))}

                <section className="mt-7 border-t border-[#e9efec] pt-5">
                    <h3 className="text-sm font-semibold text-[#203a36]">Package gallery</h3>
                    {gallery.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {gallery.map((image, index) => (
                            <div key={image.packageImageId} className="overflow-hidden rounded-md border border-[#e3ebe7]">
                                <img src={image.imageUrl} alt="Travel package" className="h-28 w-full object-cover" />
                                <div className="space-y-2 p-2">
                                    {image.isPrimary && <span className="text-[10px] font-semibold text-[#237761]">Primary image</span>}
                                    {image.cleanupPending && <p role="alert" className="text-[10px] text-amber-700">Cloud cleanup pending; retry delete.</p>}
                                    <div className="flex flex-wrap gap-1">
                                        {!image.isPrimary && !image.cleanupPending && <button type="button" onClick={() => runGalleryAction(() => setPrimaryPackageImage(packageData.travelPackageId, image.packageImageId))} className="rounded bg-[#edf6f2] px-2 py-1 text-[10px] font-semibold text-[#237761]">Set cover</button>}
                                        <button type="button" disabled={index === 0} onClick={() => setGallery((current) => current.map((item, itemIndex) => itemIndex === index ? current[index - 1] : itemIndex === index - 1 ? current[index] : item))} className="rounded border px-2 py-1 text-[10px] disabled:opacity-40">Move up</button>
                                        <label className="cursor-pointer rounded border px-2 py-1 text-[10px]">Replace<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const [file] = event.target.files ?? []; if (file) runGalleryAction(() => replacePackageImage(packageData.travelPackageId, image.packageImageId, file)); event.target.value = ""; }} /></label>
                                        <button type="button" onClick={() => runGalleryAction(() => deletePackageImage(packageData.travelPackageId, image.packageImageId))} className="rounded px-2 py-1 text-[10px] font-semibold text-[#a64c3f] hover:bg-[#fcf0ed]">Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>}
                    <label className="mt-4 inline-flex cursor-pointer items-center rounded-md border border-dashed border-[#b8cec5] px-4 py-3 text-xs font-semibold text-[#267d6d] hover:bg-[#f5faf7]">
                        Select images (JPEG, PNG, WebP; up to 5 MB each)
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectImages} />
                    </label>
                    {previews.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{previews.map(({ file, url }, index) => <div key={`${file.name}-${index}`} className="relative"><img src={url} alt={file.name} className="h-24 w-full rounded object-cover" /><button type="button" onClick={() => setNewImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded bg-white/90 px-2 py-1 text-xs text-rose-700">Remove</button><p className="mt-1 truncate text-[10px] text-[#71847e]">{file.name}</p></div>)}</div>}
                    {saving && <p role="status" className="mt-2 text-xs text-[#71847e]">Saving package and uploading images...</p>}
                </section>

                <footer className="mt-7 flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Cancel</button>
                    <button type="submit" disabled={saving} className="min-h-10 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125956] disabled:opacity-60">{saving ? "Saving..." : packageData ? "Save changes" : "Create package"}</button>
                </footer>
            </form>
        </CustomerDialog>
    );
}
