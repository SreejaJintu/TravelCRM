namespace TravelCRM.Api.Models;

public static class BookingPricing
{
    public const decimal MaximumAmount = 9999999999999999.99m;

    public static bool TryApply(Booking booking, TravelPackage travelPackage)
    {
        return TryApply(
            booking,
            travelPackage.AdultPrice,
            travelPackage.ChildPrice,
            travelPackage.InfantPrice,
            travelPackage.Currency);
    }

    public static bool TryApplySnapshot(Booking booking) =>
        TryApply(
            booking,
            booking.AdultPrice,
            booking.ChildPrice,
            booking.InfantPrice,
            booking.Currency);

    private static bool TryApply(
        Booking booking,
        decimal adultPrice,
        decimal childPrice,
        decimal infantPrice,
        string currency)
    {
        if (adultPrice < 0 || childPrice < 0 || infantPrice < 0)
        {
            return false;
        }

        var baseAmount =
            booking.NumberOfAdults * adultPrice +
            booking.NumberOfChildren * childPrice +
            booking.NumberOfInfants * infantPrice;

        if (baseAmount > MaximumAmount ||
            booking.DiscountAmount > baseAmount ||
            booking.AdditionalCharges > MaximumAmount ||
            baseAmount - booking.DiscountAmount + booking.AdditionalCharges > MaximumAmount)
        {
            return false;
        }

        booking.AdultPrice = adultPrice;
        booking.ChildPrice = childPrice;
        booking.InfantPrice = infantPrice;
        booking.BaseAmount = baseAmount;
        booking.TotalAmount = baseAmount - booking.DiscountAmount + booking.AdditionalCharges;
        booking.Currency = currency;
        return true;
    }
}
