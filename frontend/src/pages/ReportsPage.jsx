import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DashboardLayout from "../components/DashboardLayout";
import DashboardIcon from "../components/DashboardIcon";
import ExportButtons from "../components/ExportButtons";
import {
    getBookingReport,
    getPaymentReport,
    getRevenueReport,
    getCustomerReport,
    getLeadConversionReport,
} from "../services/reportApi";

const tabs = [
    { key: "bookings", label: "Bookings" },
    { key: "payments", label: "Payments" },
    { key: "revenue", label: "Revenue" },
    { key: "customers", label: "Customers" },
    { key: "leads", label: "Lead Conversion" },
];

const bookingStatuses = ["Inquiry", "Quotation", "Pending", "Confirmed", "Cancelled", "Completed"];
const paymentStatuses = ["Pending", "Completed", "Failed"];
const paymentMethods = ["Cash", "BankTransfer", "UPI", "Card", "Other"];

const statusStyles = {
    Inquiry: "bg-[#e6eef8] text-[#4c7095]",
    Quotation: "bg-[#f8f0db] text-[#987522]",
    Pending: "bg-[#fae9e3] text-[#b7654d]",
    Confirmed: "bg-[#e3f3ed] text-[#237761]",
    Cancelled: "bg-[#fae8e7] text-[#a84e48]",
    Completed: "bg-[#dff2e7] text-[#217047]",
    Failed: "bg-[#fae8e7] text-[#a84e48]",
};

const paymentMethodStyles = {
    Cash: "bg-[#e3f3ed] text-[#237761]",
    BankTransfer: "bg-[#e6eef8] text-[#4c7095]",
    UPI: "bg-[#f8f0db] text-[#987522]",
    Card: "bg-[#fae9e3] text-[#b7654d]",
    Other: "bg-[#edf1ef] text-[#647b76]",
};

const money = (value, currency) => {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value ?? 0);
    } catch {
        return `${currency} ${Number(value ?? 0).toFixed(2)}`;
    }
};

const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    return Number.isNaN(date.getTime()) ? "—" : `${day} ${month} ${year}`;
};

const messageFrom = (error) =>
    error.response?.data?.detail || error.response?.data?.title || error.message || "Report could not be loaded.";

export default function ReportsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === "admin";
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "bookings");

    // Booking report state
    const [bookingFrom, setBookingFrom] = useState("");
    const [bookingTo, setBookingTo] = useState("");
    const [bookingStatus, setBookingStatus] = useState("");
    const [bookingReport, setBookingReport] = useState(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState("");

    // Payment report state
    const [paymentFrom, setPaymentFrom] = useState("");
    const [paymentTo, setPaymentTo] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [paymentReport, setPaymentReport] = useState(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState("");

    // Revenue report state
    const [revenueFrom, setRevenueFrom] = useState("");
    const [revenueTo, setRevenueTo] = useState("");
    const [revenueReport, setRevenueReport] = useState(null);
    const [revenueLoading, setRevenueLoading] = useState(false);
    const [revenueError, setRevenueError] = useState("");

    // Customer report state
    const [customerReport, setCustomerReport] = useState(null);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState("");

    // Lead conversion report state
    const [leadReport, setLeadReport] = useState(null);
    const [leadLoading, setLeadLoading] = useState(false);
    const [leadError, setLeadError] = useState("");

    const fetchBookingReport = useCallback(async () => {
        setBookingLoading(true);
        setBookingError("");
        try {
            const data = await getBookingReport({
                fromDate: bookingFrom || undefined,
                toDate: bookingTo || undefined,
                status: bookingStatus || undefined,
            });
            setBookingReport(data);
        } catch (error) {
            setBookingError(messageFrom(error));
        } finally {
            setBookingLoading(false);
        }
    }, [bookingFrom, bookingTo, bookingStatus]);

    const fetchPaymentReport = useCallback(async () => {
        setPaymentLoading(true);
        setPaymentError("");
        try {
            const data = await getPaymentReport({
                fromDate: paymentFrom || undefined,
                toDate: paymentTo || undefined,
                paymentStatus: paymentStatus || undefined,
                paymentMethod: paymentMethod || undefined,
            });
            setPaymentReport(data);
        } catch (error) {
            setPaymentError(messageFrom(error));
        } finally {
            setPaymentLoading(false);
        }
    }, [paymentFrom, paymentTo, paymentStatus, paymentMethod]);

    const fetchRevenueReport = useCallback(async () => {
        setRevenueLoading(true);
        setRevenueError("");
        try {
            const data = await getRevenueReport({
                fromDate: revenueFrom || undefined,
                toDate: revenueTo || undefined,
            });
            setRevenueReport(data);
        } catch (error) {
            setRevenueError(messageFrom(error));
        } finally {
            setRevenueLoading(false);
        }
    }, [revenueFrom, revenueTo]);

    const fetchCustomerReport = useCallback(async () => {
        setCustomerLoading(true);
        setCustomerError("");
        try {
            const data = await getCustomerReport();
            setCustomerReport(data);
        } catch (error) {
            setCustomerError(messageFrom(error));
        } finally {
            setCustomerLoading(false);
        }
    }, []);

    const fetchLeadReport = useCallback(async () => {
        setLeadLoading(true);
        setLeadError("");
        try {
            const data = await getLeadConversionReport();
            setLeadReport(data);
        } catch (error) {
            setLeadError(messageFrom(error));
        } finally {
            setLeadLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "bookings") fetchBookingReport();
        else if (activeTab === "payments") fetchPaymentReport();
        else if (activeTab === "revenue") fetchRevenueReport();
        else if (activeTab === "customers") fetchCustomerReport();
        else if (activeTab === "leads") fetchLeadReport();
    }, [activeTab, fetchBookingReport, fetchPaymentReport, fetchRevenueReport, fetchCustomerReport, fetchLeadReport]);

    const getReportData = () => {
        switch (activeTab) {
            case "bookings": return bookingReport?.bookings ?? [];
            case "payments": return paymentReport?.payments ?? [];
            case "revenue": return revenueReport?.revenueByCurrency ?? [];
            case "customers": return customerReport?.customers ?? [];
            case "leads": return leadReport?.leads ?? [];
            default: return [];
        }
    };

    const getReportMeta = () => {
        switch (activeTab) {
            case "bookings": return bookingReport?.meta;
            case "payments": return paymentReport?.meta;
            case "revenue": return revenueReport?.meta;
            case "customers": return customerReport?.meta;
            case "leads": return leadReport?.meta;
            default: return null;
        }
    };

    const getLoading = () => {
        switch (activeTab) {
            case "bookings": return bookingLoading;
            case "payments": return paymentLoading;
            case "revenue": return revenueLoading;
            case "customers": return customerLoading;
            case "leads": return leadLoading;
            default: return false;
        }
    };

    const getError = () => {
        switch (activeTab) {
            case "bookings": return bookingError;
            case "payments": return paymentError;
            case "revenue": return revenueError;
            case "customers": return customerError;
            case "leads": return leadError;
            default: return "";
        }
    };

    const renderBookingFilters = () => (
        <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">From Date</label>
                <input
                    type="date"
                    value={bookingFrom}
                    onChange={(e) => setBookingFrom(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#20332f] focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                />
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">To Date</label>
                <input
                    type="date"
                    value={bookingTo}
                    onChange={(e) => setBookingTo(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#20332f] focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                />
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">Status</label>
                <select
                    value={bookingStatus}
                    onChange={(e) => setBookingStatus(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#20332f] focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                >
                    <option value="">All Statuses</option>
                    {bookingStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">&nbsp;</label>
                <button
                    type="button"
                    onClick={fetchBookingReport}
                    disabled={bookingLoading}
                    className="inline-flex items-center gap-2 rounded-md border border-[#176b68] bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145e5b] disabled:opacity-40"
                >
                    {bookingLoading ? "Loading…" : "Apply Filter"}
                </button>
            </div>
        </div>
    );

    const renderPaymentFilters = () => (
        <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">From Date</label>
                <input
                    type="date"
                    value={paymentFrom}
                    onChange={(e) => setPaymentFrom(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#20332f] focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                />
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">To Date</label>
                <input
                    type="date"
                    value={paymentTo}
                    onChange={(e) => setPaymentTo(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#20332f] focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                />
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">Status</label>
                <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#20332f] focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                >
                    <option value="">All Statuses</option>
                    {paymentStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">Method</label>
                <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#20332f] focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                >
                    <option value="">All Methods</option>
                    {paymentMethods.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">&nbsp;</label>
                <button
                    type="button"
                    onClick={fetchPaymentReport}
                    disabled={paymentLoading}
                    className="inline-flex items-center gap-2 rounded-md border border-[#176b68] bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145e5b] disabled:opacity-40"
                >
                    {paymentLoading ? "Loading…" : "Apply Filter"}
                </button>
            </div>
        </div>
    );

    const renderRevenueFilters = () => (
        <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">From Date</label>
                <input
                    type="date"
                    value={revenueFrom}
                    onChange={(e) => setRevenueFrom(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#20332f] focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                />
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">To Date</label>
                <input
                    type="date"
                    value={revenueTo}
                    onChange={(e) => setRevenueTo(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#dce6e2] bg-white px-3 text-sm text-[#20332f] focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                />
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#526b65]">&nbsp;</label>
                <button
                    type="button"
                    onClick={fetchRevenueReport}
                    disabled={revenueLoading}
                    className="inline-flex items-center gap-2 rounded-md border border-[#176b68] bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145e5b] disabled:opacity-40"
                >
                    {revenueLoading ? "Loading…" : "Apply Filter"}
                </button>
            </div>
        </div>
    );

    const renderFilters = () => {
        if (activeTab === "bookings") return renderBookingFilters();
        if (activeTab === "payments") return renderPaymentFilters();
        if (activeTab === "revenue") return renderRevenueFilters();
        return null;
    };

    return (
        <DashboardLayout title="Reports">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#176b68]">Reports &amp; Export</h1>
                <p className="text-[#526b65]">View and export booking, payment, revenue, customer, and lead conversion reports.</p>
            </div>

            <div className="flex gap-2 mb-6 border-b border-[#dce6e2] pb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === tab.key
                                ? "border-b-2 border-[#176b68] text-[#176b68] bg-[#e8f2f0]"
                                : "text-[#526b65] hover:text-[#176b68] hover:bg-[#f5f8f6]"
                        }`}
                    >
                        <DashboardIcon name={tab.key} className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {renderFilters()}

            {getError() && (
                <div className="mb-6 p-4 rounded-md bg-[#fae8e7] border border-[#f5c6c3] text-[#a84e48] text-sm">
                    {getError()}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#dce6e2]">
                    <thead className="bg-[#f5f8f6]">
                        <tr>
                            {activeTab === "bookings" && (
                                <>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Booking Reference</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Customer</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Package</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Destination</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Travel Date</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-right">Amount</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Status</th>
                                </>
                            )}
                            {activeTab === "payments" && (
                                <>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Booking Reference</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Customer</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-right">Amount</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Method</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Status</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Payment Date</th>
                                </>
                            )}
                            {activeTab === "revenue" && (
                                <>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Currency</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-right">Gross Payments</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-right">Completed Refunds</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-right">Net Collections</th>
                                </>
                            )}
                            {activeTab === "customers" && (
                                <>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Customer</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Email</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Phone</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-right">Total Bookings</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-right">Total Spent</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Last Booking</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Status</th>
                                </>
                            )}
                            {activeTab === "leads" && (
                                <>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Lead Number</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Full Name</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Phone</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Email</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Destination</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Status</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Converted</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-[#526b65] text-left">Converted Customer</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#dce6e2]">
                        {getLoading() ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-[#526b65]">
                                    Loading report…
                                </td>
                            </tr>
                        ) : getReportData().length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-[#526b65]">
                                    No data available.
                                </td>
                            </tr>
                        ) : (
                            getReportData().map((row, idx) => (
                                <tr key={idx} className="hover:bg-[#f8faf9]">
                                    {activeTab === "bookings" && (
                                        <>
                                            <td className="px-4 py-3 text-sm text-[#20332f] font-medium">{row.bookingNumber}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.customerName}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.packageName}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.destination}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{formatDate(row.travelStartDate)}</td>
                                            <td className="px-4 py-3 text-sm text-right font-medium">{money(row.totalAmount, row.currency)}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${statusStyles[row.bookingStatus] || "bg-[#edf1ef] text-[#647b76]"}`}>
                                                    {row.bookingStatus}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                    {activeTab === "payments" && (
                                        <>
                                            <td className="px-4 py-3 text-sm text-[#20332f] font-medium">{row.bookingNumber}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.customerName}</td>
                                            <td className="px-4 py-3 text-sm text-right font-medium">{money(row.amount, row.currency)}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">
                                                <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${paymentMethodStyles[row.paymentMethod] || "bg-[#edf1ef] text-[#647b76]"}`}>
                                                    {row.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${statusStyles[row.paymentStatus] || "bg-[#edf1ef] text-[#647b76]"}`}>
                                                    {row.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.paymentDate ? formatDate(row.paymentDate) : "—"}</td>
                                        </>
                                    )}
                                    {activeTab === "revenue" && (
                                        <>
                                            <td className="px-4 py-3 text-sm text-[#20332f] font-medium">{row.currency}</td>
                                            <td className="px-4 py-3 text-sm text-right font-medium">{money(row.grossPayments, row.currency)}</td>
                                            <td className="px-4 py-3 text-sm text-right font-medium">{money(row.completedRefunds, row.currency)}</td>
                                            <td className="px-4 py-3 text-sm text-right font-medium">{money(row.netCollections, row.currency)}</td>
                                        </>
                                    )}
                                    {activeTab === "customers" && (
                                        <>
                                            <td className="px-4 py-3 text-sm text-[#20332f] font-medium">{row.fullName}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.email}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.phone}</td>
                                            <td className="px-4 py-3 text-sm text-right">{row.totalBookings}</td>
                                            <td className="px-4 py-3 text-sm text-right">{money(row.totalSpent, "USD")}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.lastBookingNumber || "—"}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.lastBookingStatus || "—"}</td>
                                        </>
                                    )}
                                    {activeTab === "leads" && (
                                        <>
                                            <td className="px-4 py-3 text-sm text-[#20332f] font-medium">{row.leadNumber}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.fullName}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.phone}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.email ?? "—"}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.destination}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.leadStatus}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.isConverted ? "Yes" : "No"}</td>
                                            <td className="px-4 py-3 text-sm text-[#20332f]">{row.convertedCustomerName ?? "—"}</td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary totals */}
            {activeTab === "bookings" && bookingReport && (
                <div className="mt-6 p-4 rounded-lg bg-[#f5f8f6] border border-[#dce6e2]">
                    <div className="flex justify-between text-sm">
                        <span className="text-[#526b65]">Total Amount:</span>
                        <span className="font-semibold text-[#176b68]">{money(bookingReport.totalAmount, "USD")}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#526b65]">Total Records:</span>
                        <span className="font-semibold">{bookingReport.totalCount}</span>
                    </div>
                </div>
            )}
            {activeTab === "payments" && paymentReport && (
                <div className="mt-6 p-4 rounded-lg bg-[#f5f8f6] border border-[#dce6e2]">
                    <div className="flex justify-between text-sm">
                        <span className="text-[#526b65]">Total Amount:</span>
                        <span className="font-semibold text-[#176b68]">{money(paymentReport.totalAmount, "USD")}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#526b65]">Completed:</span>
                        <span className="font-semibold text-[#217047]">{money(paymentReport.completedAmount, "USD")}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#526b65]">Pending:</span>
                        <span className="font-semibold text-[#987522]">{money(paymentReport.pendingAmount, "USD")}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#526b65]">Failed:</span>
                        <span className="font-semibold text-[#a84e48]">{money(paymentReport.failedAmount, "USD")}</span>
                    </div>
                </div>
            )}
            {activeTab === "revenue" && revenueReport && (
                <div className="mt-6 p-4 rounded-lg bg-[#f5f8f6] border border-[#dce6e2]">
                    <div className="flex justify-between text-sm">
                        <span className="text-[#526b65]">Total Gross Payments:</span>
                        <span className="font-semibold text-[#217047]">{money(revenueReport.totalGrossPayments, "USD")}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#526b65]">Total Refunds:</span>
                        <span className="font-semibold text-[#a84e48]">{money(revenueReport.totalCompletedRefunds, "USD")}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#526b65]">Total Net Collections:</span>
                        <span className="font-semibold text-[#176b68]">{money(revenueReport.totalNetCollections, "USD")}</span>
                    </div>
                </div>
            )}
            {activeTab === "leads" && leadReport && (
                <div className="mt-6 p-4 rounded-lg bg-[#f5f8f6] border border-[#dce6e2]">
                    <div className="flex justify-between text-sm">
                        <span className="text-[#526b65]">Total Leads:</span>
                        <span className="font-semibold">{leadReport.summary.totalLeads}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#526b65]">Converted:</span>
                        <span className="font-semibold text-[#217047]">{leadReport.summary.convertedLeads}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#526b65]">Pending:</span>
                        <span className="font-semibold text-[#987522]">{leadReport.summary.pendingLeads}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#526b65]">Conversion Rate:</span>
                        <span className="font-semibold text-[#176b68]">{leadReport.summary.conversionPercentage}%</span>
                    </div>
                </div>
            )}

            {/* Export buttons */}
            <div className="mt-6 flex items-center gap-4">
                <ExportButtons
                    reportType={activeTab}
                    data={getReportData()}
                    meta={getReportMeta()}
                />
            </div>
        </DashboardLayout>
    );
}

