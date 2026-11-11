export const staffDashboardStats = [
    {
        label: "Total customers",
        value: "1,284",
        change: "+8.2%",
        detail: "vs. last month",
        icon: "customers",
        accent: "teal"
    },
    {
        label: "Total bookings",
        value: "186",
        change: "+12.4%",
        detail: "vs. last month",
        icon: "bookings",
        accent: "blue"
    },
    {
        label: "Upcoming trips",
        value: "42",
        change: "Next 30 days",
        detail: "Across all travelers",
        icon: "trips",
        accent: "gold"
    },
    {
        label: "Total revenue",
        value: "$248,560",
        change: "+6.8%",
        detail: "vs. last month",
        icon: "revenue",
        accent: "coral"
    }
];

export const recentBookings = [
    { id: "BK-2048", customer: "Amelia Hart", destination: "Lisbon, Portugal", travelDate: "Nov 14, 2026", status: "Confirmed", amount: "$2,480" },
    { id: "BK-2047", customer: "Noah Bennett", destination: "Kyoto, Japan", travelDate: "Nov 19, 2026", status: "Pending", amount: "$4,120" },
    { id: "BK-2046", customer: "Sofia Chen", destination: "Amalfi Coast, Italy", travelDate: "Nov 22, 2026", status: "Confirmed", amount: "$3,760" },
    { id: "BK-2045", customer: "Ethan Brooks", destination: "Reykjavik, Iceland", travelDate: "Nov 28, 2026", status: "Processing", amount: "$5,290" },
    { id: "BK-2044", customer: "Olivia James", destination: "Marrakech, Morocco", travelDate: "Dec 03, 2026", status: "Confirmed", amount: "$1,940" }
];

export const upcomingTrips = [
    { destination: "Lisbon, Portugal", customer: "Amelia Hart", travelDate: "Nov 14, 2026", travelers: 2, status: "Confirmed", color: "teal" },
    { destination: "Kyoto, Japan", customer: "Noah Bennett", travelDate: "Nov 19, 2026", travelers: 4, status: "Pending", color: "coral" },
    { destination: "Amalfi Coast, Italy", customer: "Sofia Chen", travelDate: "Nov 22, 2026", travelers: 2, status: "Confirmed", color: "gold" }
];