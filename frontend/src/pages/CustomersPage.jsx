import { useCallback, useEffect, useRef, useState } from "react";
import CustomerConfirmDialog from "../components/CustomerConfirmDialog";
import CustomerDetailsDialog from "../components/CustomerDetailsDialog";
import CustomerDialog from "../components/CustomerDialog";
import CustomerFormDialog from "../components/CustomerFormDialog";
import DashboardIcon from "../components/DashboardIcon";
import DashboardLayout from "../components/DashboardLayout";
import {
    activateCustomer,
    createCustomer,
    deactivateCustomer,
    getCustomer,
    getCustomers,
    updateCustomer
} from "../services/customerApi";
import { getCustomerErrorMessage } from "../utils/customerErrors";

const pageSize = 10;

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function StatusBadge({ active }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${active ? "bg-[#e3f3ed] text-[#237761]" : "bg-[#edf1ef] text-[#667772]"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#309377]" : "bg-[#91a09b]"}`} />
            {active ? "Active" : "Inactive"}
        </span>
    );
}

function CustomerRow({ customer, onView, onEdit, onToggleStatus }) {
    return (
        <tr className="group border-t border-[#edf1ef] transition hover:bg-[#fbfcfb]">
            <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-[#7b8d88] sm:px-5">#{customer.customerId}</td>
            <td className="min-w-[180px] px-4 py-4 sm:px-5">
                <p className="text-sm font-semibold text-[#314a45]">{customer.fullName}</p>
            </td>
            <td className="px-4 py-4 text-sm text-[#667d77]">{customer.email}</td>
            <td className="whitespace-nowrap px-4 py-4 text-sm text-[#667d77]">{customer.phone}</td>
            <td className="whitespace-nowrap px-4 py-4 text-xs text-[#71847e]">{formatDate(customer.createdAt)}</td>
            <td className="px-4 py-4"><StatusBadge active={customer.isActive} /></td>
            <td className="px-4 py-4 sm:px-5">
                <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => onView(customer)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#397d70] transition hover:bg-[#edf6f2] focus-visible:outline-2 focus-visible:outline-[#176b68]">View</button>
                    <button type="button" onClick={() => onEdit(customer)} className="rounded px-2 py-1.5 text-xs font-semibold text-[#526b65] transition hover:bg-[#f1f5f3] focus-visible:outline-2 focus-visible:outline-[#176b68]">Edit</button>
                    <button type="button" onClick={() => onToggleStatus(customer)} className={`rounded px-2 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-[#176b68] ${customer.isActive ? "text-[#a64c3f] hover:bg-[#fcf0ed]" : "text-[#267d6d] hover:bg-[#edf6f2]"}`}>
                        {customer.isActive ? "Deactivate" : "Activate"}
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default function CustomersPage() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ items: [], page: 1, pageSize, totalCount: 0, totalPages: 0 });
    const [loadedRequestKey, setLoadedRequestKey] = useState(null);
    const [requestError, setRequestError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [loadingCustomer, setLoadingCustomer] = useState(false);
    const [confirmCustomer, setConfirmCustomer] = useState(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const dialogRequestId = useRef(0);
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
        getCustomers({ search: debouncedSearch, page, pageSize, signal: controller.signal })
            .then((response) => {
                if (!controller.signal.aborted) {
                    setResult(response);
                    setRequestError(null);
                    setLoadedRequestKey(requestKey);
                }
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setRequestError({ key: requestKey, message: getCustomerErrorMessage(requestError) });
                    setLoadedRequestKey(requestKey);
                }
            });
        return () => controller.abort();
    }, [debouncedSearch, page, reloadKey, requestKey]);

    const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

    const openEdit = async (customer) => {
        const requestId = dialogRequestId.current + 1;
        dialogRequestId.current = requestId;
        setLoadingCustomer(true);
        setDialog({ type: "loading" });
        try {
            const details = await getCustomer(customer.customerId);
            if (dialogRequestId.current === requestId) setDialog({ type: "edit", customer: details });
        } catch (requestError) {
            if (dialogRequestId.current === requestId) {
                setDialog(null);
                setNotice(getCustomerErrorMessage(requestError));
            }
        } finally {
            if (dialogRequestId.current === requestId) setLoadingCustomer(false);
        }
    };

    const handleSave = async (customer) => {
        if (dialog?.type === "edit") {
            await updateCustomer(dialog.customer.customerId, customer);
            setNotice("Customer details updated.");
        } else {
            await createCustomer(customer);
            setNotice("Customer added successfully.");
        }
        setDialog(null);
        refresh();
    };

    const handleStatusChange = async () => {
        if (!confirmCustomer) return;
        setActionBusy(true);
        try {
            if (confirmCustomer.isActive) {
                await deactivateCustomer(confirmCustomer.customerId);
                setNotice(`${confirmCustomer.fullName} was deactivated.`);
            } else {
                await activateCustomer(confirmCustomer.customerId);
                setNotice(`${confirmCustomer.fullName} was activated.`);
            }
            setConfirmCustomer(null);
            refresh();
        } catch (requestError) {
            setConfirmCustomer(null);
            setNotice(getCustomerErrorMessage(requestError));
        } finally {
            setActionBusy(false);
        }
    };

    const closeLoadingDialog = () => {
        dialogRequestId.current += 1;
        setLoadingCustomer(false);
        setDialog(null);
    };

    const firstRecord = result.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const lastRecord = Math.min(page * pageSize, result.totalCount);

    return (
        <DashboardLayout
            title="Customers"
            search={search}
            onSearch={setSearch}
            searchLabel="Search customers by name, email, or phone"
            searchPlaceholder="Search customers..."
        >
            <div className="mx-auto max-w-[1440px] space-y-6">
                <section className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52706b]">Travelers</p>
                        <h1 className="mt-2 text-3xl font-semibold text-[#1d3533]">Customers</h1>
                        <p className="mt-2 text-sm text-[#667d79]">Manage your travel customers and their contact details.</p>
                    </div>
                    <button type="button" onClick={() => setDialog({ type: "create" })} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#176b68] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#125956] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b68]">
                        <span className="text-lg leading-none" aria-hidden="true">+</span>
                        Add customer
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
                            <h2 className="text-sm font-semibold text-[#203a36]">Customer directory</h2>
                            <p className="mt-1 text-xs text-[#7c8f89]">{loading ? "Loading records..." : `${result.totalCount} total ${result.totalCount === 1 ? "customer" : "customers"}`}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#748681]">
                            <span className="hidden sm:inline">Rows per page</span>
                            <span className="rounded border border-[#e3ebe7] bg-[#f8faf9] px-2.5 py-1.5 font-semibold text-[#526b65]">{pageSize}</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] border-collapse text-left">
                            <thead>
                                <tr className="bg-[#f8faf9] text-[10px] font-bold uppercase tracking-[0.08em] text-[#83938e]">
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Customer ID</th>
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Full name</th>
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Email</th>
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Phone</th>
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Created date</th>
                                    <th scope="col" className="px-4 py-3.5 sm:px-5">Status</th>
                                    <th scope="col" className="px-4 py-3.5 text-right sm:px-5">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && result.items.length === 0 ? (
                                    <tr><td colSpan="7" className="px-5 py-14 text-center">
                                        <span className="mx-auto grid h-8 w-8 animate-spin place-items-center rounded-full border-2 border-[#d4e5df] border-t-[#176b68]" />
                                        <span className="mt-3 block text-sm text-[#71847e]">Loading customers...</span>
                                    </td></tr>
                                ) : !loading && result.items.length === 0 ? (
                                    <tr><td colSpan="7" className="px-5 py-14 text-center">
                                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#eaf4f0] text-[#338374]"><DashboardIcon name="customers" className="h-6 w-6" /></span>
                                        <p className="mt-3 text-sm font-semibold text-[#314a45]">{debouncedSearch ? "No matching customers" : "No customers yet"}</p>
                                        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#7c8f89]">{debouncedSearch ? "Try a different name, email address, or phone number." : "Add your first customer to start building your travel directory."}</p>
                                        {!debouncedSearch && <button type="button" onClick={() => setDialog({ type: "create" })} className="mt-4 text-xs font-semibold text-[#176b68] hover:underline">Add a customer</button>}
                                    </td></tr>
                                ) : (
                                    result.items.map((customer) => (
                                        <CustomerRow
                                            key={customer.customerId}
                                            customer={customer}
                                            onView={(item) => setDialog({ type: "view", id: item.customerId })}
                                            onEdit={openEdit}
                                            onToggleStatus={setConfirmCustomer}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9efec] px-4 py-3.5 sm:px-5">
                        <p className="text-xs text-[#7c8f89]">
                            {loading ? "Updating customer list..." : `Showing ${firstRecord}–${lastRecord} of ${result.totalCount}`}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="mr-1 text-xs text-[#7c8f89]">Page {result.totalPages === 0 ? 0 : page} of {result.totalPages}</span>
                            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-md border border-[#dfe8e4] text-[#526b65] transition hover:bg-[#f3f8f5] focus-visible:outline-2 focus-visible:outline-[#176b68] disabled:cursor-not-allowed disabled:opacity-40">
                                <DashboardIcon name="chevronLeft" className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))} disabled={loading || page >= result.totalPages} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-md border border-[#dfe8e4] text-[#526b65] transition hover:bg-[#f3f8f5] focus-visible:outline-2 focus-visible:outline-[#176b68] disabled:cursor-not-allowed disabled:opacity-40">
                                <DashboardIcon name="chevronRight" className="h-4 w-4" />
                            </button>
                        </div>
                    </footer>
                </section>
            </div>

            {(dialog?.type === "create" || dialog?.type === "edit") && (
                <CustomerFormDialog
                    key={`${dialog.type}-${dialog.customer?.customerId ?? "new"}`}
                    mode={dialog.type}
                    customer={dialog.customer}
                    onClose={() => setDialog(null)}
                    onSave={handleSave}
                />
            )}
            {dialog?.type === "view" && <CustomerDetailsDialog customerId={dialog.id} onClose={() => setDialog(null)} />}
            {dialog?.type === "loading" && (
                <CustomerDialog title="Loading customer" description="Fetching the latest customer details." onClose={closeLoadingDialog} width="max-w-md">
                    <div className="p-8 text-center text-sm text-[#71847e]">Please wait...</div>
                </CustomerDialog>
            )}
            {confirmCustomer && (
                <CustomerConfirmDialog
                    customer={confirmCustomer}
                    activating={!confirmCustomer.isActive}
                    busy={actionBusy}
                    onClose={() => setConfirmCustomer(null)}
                    onConfirm={handleStatusChange}
                />
            )}
            {loadingCustomer && <span className="sr-only" role="status">Loading selected customer</span>}
        </DashboardLayout>
    );
}