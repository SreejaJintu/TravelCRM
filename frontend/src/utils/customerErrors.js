const validationFieldNames = {
    fullname: "fullName",
    email: "email",
    phone: "phone",
    dateofbirth: "dateOfBirth",
    gender: "gender",
    address: "address"
};

export function getCustomerFieldErrors(error) {
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

export function getCustomerErrorMessage(error) {
    const status = error.response?.status;
    if (status === 400) return "Check the highlighted fields and try again.";
    if (status === 401) return "Your session has expired. Sign in again to continue.";
    if (status === 404) return "This customer is no longer available.";
    if (status === 409) return "A customer with this email address already exists.";
    if (!error.response) return "Unable to reach Travel CRM. Check your connection and try again.";

    return error.response.data?.detail || error.response.data?.title || "Something went wrong. Please try again.";
}