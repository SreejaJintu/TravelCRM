import { useState } from "react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const columnsByType = {
    bookings: [
        { header: "Booking Reference", key: "bookingNumber", width: 24 },
        { header: "Customer", key: "customerName", width: 24 },
        { header: "Package", key: "packageName", width: 26 },
        { header: "Destination", key: "destination", width: 20 },
        { header: "Travel Date", key: "travelStartDate", width: 14 },
        { header: "Amount", key: "totalAmount", width: 16 },
    ],
    payments: [
        { header: "Payment ID", key: "paymentId", width: 10 },
        { header: "Booking Reference", key: "bookingNumber", width: 24 },
        { header: "Customer", key: "customerName", width: 24 },
        { header: "Amount", key: "amount", width: 16 },
        { header: "Method", key: "paymentMethod", width: 14 },
        { header: "Status", key: "paymentStatus", width: 14 },
        { header: "Date", key: "paymentDate", width: 20 },
    ],
    revenue: [
        { header: "Currency", key: "currency", width: 12 },
        { header: "Gross Payments", key: "grossPayments", width: 20 },
        { header: "Completed Refunds", key: "completedRefunds", width: 20 },
        { header: "Net Collections", key: "netCollections", width: 20 },
    ],
    customers: [
        { header: "Customer ID", key: "customerId", width: 12 },
        { header: "Full Name", key: "fullName", width: 24 },
        { header: "Email", key: "email", width: 30 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Total Bookings", key: "totalBookings", width: 16 },
        { header: "Total Spent", key: "totalSpent", width: 16 },
        { header: "Last Booking", key: "lastBookingNumber", width: 24 },
        { header: "Last Status", key: "lastBookingStatus", width: 18 },
    ],
    leads: [
        { header: "Lead Number", key: "leadNumber", width: 20 },
        { header: "Full Name", key: "fullName", width: 24 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 26 },
        { header: "Destination", key: "destination", width: 20 },
        { header: "Status", key: "leadStatus", width: 16 },
        { header: "Converted", key: "isConverted", width: 12 },
        { header: "Converted Customer", key: "convertedCustomerName", width: 24 },
    ],
};

const rowsByType = {
    bookings: (data) =>
        (data || []).map((row) => [
            row.bookingNumber,
            row.customerName,
            row.packageName,
            row.destination,
            formatDate(row.travelStartDate),
            money(row.totalAmount, row.currency),
        ]),
    payments: (data) =>
        (data || []).map((row) => [
            row.paymentId,
            row.bookingNumber,
            row.customerName,
            money(row.amount, row.currency),
            row.paymentMethod,
            row.paymentStatus,
            row.paymentDate ? new Date(row.paymentDate).toLocaleString() : "—",
        ]),
    revenue: (data) =>
        (data || []).map((row) => [
            row.currency,
            money(row.grossPayments, row.currency),
            money(row.completedRefunds, row.currency),
            money(row.netCollections, row.currency),
        ]),
    customers: (data) =>
        (data || []).map((row) => [
            row.customerId,
            row.fullName,
            row.email,
            row.phone,
            row.totalBookings,
            money(row.totalSpent, "USD"),
            row.lastBookingNumber,
            row.lastBookingStatus,
        ]),
    leads: (data) =>
        (data || []).map((row) => [
            row.leadNumber,
            row.fullName,
            row.phone,
            row.email ?? "—",
            row.destination,
            row.leadStatus,
            row.isConverted ? "Yes" : "No",
            row.convertedCustomerName ?? "—",
        ]),
};

export default function ExportButtons({ reportType, data, meta }) {
    const [exporting, setExporting] = useState(false);

    const exportToExcel = async () => {
        setExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(reportType);

            const columns = columnsByType[reportType];
            worksheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

            const rows = rowsByType[reportType](data);
            rows.forEach((row) => worksheet.addRow(row));

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    const exportToPdf = () => {
        setExporting(true);
        try {
            const columns = columnsByType[reportType];
            const rows = rowsByType[reportType](data);

            const doc = new jsPDF({ orientation: "landscape" });
            const title = reportType.charAt(0).toUpperCase() + reportType.slice(1) + " Report";

            doc.setFontSize(16);
            doc.text(title, 14, 14);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);
            if (meta?.fromDate || meta?.toDate) {
                doc.text(`Period: ${meta.fromDate ?? "—"} to ${meta.toDate ?? "—"}`, 14, 32);
            }

            doc.autoTable({
                head: [columns.map((c) => c.header)],
                body: rows,
                startY: meta?.fromDate || meta?.toDate ? 40 : 30,
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [22, 61, 59] },
            });

            doc.save(`${reportType}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex gap-2">
            <button
                type="button"
                onClick={exportToExcel}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-md border border-[#dce6e2] bg-[#f5f8f6] px-3 py-2 text-sm font-semibold text-[#176b68] hover:bg-[#edf6f2] disabled:opacity-40"
            >
                <span className="h-4 w-4">📊</span>
                {exporting ? "Exporting…" : "Export Excel"}
            </button>
            <button
                type="button"
                onClick={exportToPdf}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-md border border-[#dce6e2] bg-[#f5f8f6] px-3 py-2 text-sm font-semibold text-[#176b68] hover:bg-[#edf6f2] disabled:opacity-40"
            >
                <span className="h-4 w-4">📄</span>
                {exporting ? "Exporting…" : "Export PDF"}
            </button>
        </div>
    );
}
