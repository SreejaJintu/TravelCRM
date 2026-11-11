const validationFieldNames = {
    fullname: "fullName",
    phone: "phone",
    email: "email",
    destination: "destination",
    travelstartdate: "travelStartDate",
    travelenddate: "travelEndDate",
    numberofadults: "numberOfAdults",
    numberofchildren: "numberOfChildren",
    budget: "budget",
    leadsource: "leadSource",
    notes: "notes"
};

export function getLeadFieldErrors(error) {
    const serverErrors = error.response?.data?.errors;
    if (!serverErrors || typeof serverErrors !== "object") return {};

    return Object.entries(serverErrors).reduce((fieldErrors, [key, messages]) => {
        const field = validationFieldNames[key.replace(/^\$\./, "").toLowerCase()];
        if (field && Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0];
        }
        return fieldErrors;
    }, {});
}

export function getLeadErrorMessage(error) {
    const status = error.response?.status;
    if (status === 400) return "Check the lead details and try again.";
    if (status === 401) return "Your session has expired. Sign in again to continue.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status === 404) return "This lead is no longer available.";
    if (status === 409) return error.response.data?.detail || error.response.data?.title || "This lead cannot be changed in its current state.";
    if (!error.response) return "Unable to reach Travel CRM. Check your connection and try again.";

    return error.response.data?.detail || error.response.data?.title || "Something went wrong. Please try again.";
}