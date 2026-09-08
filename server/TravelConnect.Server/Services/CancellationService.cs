using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

public record CancellationResult(
    string PolicyTier,      // "full", "partial", "credit"
    int RefundPercentage,   // 100, 50, 0
    decimal RefundAmount,
    int DaysSinceBooking,
    string Message
);

public class CancellationService
{
    /// <summary>
    /// Calculates refund based on cancellation policy:
    /// Day 1–7 from booking creation: 100% Full Refund
    /// Day 8+: Partial Refund / Travel Credit
    /// </summary>
    public CancellationResult CalculateRefund(Booking booking)
    {
        var daysSinceBooking = (int)(DateTime.UtcNow - booking.CreatedAt).TotalDays;
        string policyTier;
        int refundPercentage;
        string message;

        if (daysSinceBooking <= 7)
        {
            policyTier = "full";
            refundPercentage = 100;
            message = $"Full refund eligible — cancelled within {daysSinceBooking} day(s) of booking.";
        }
        else if (daysSinceBooking <= 14)
        {
            policyTier = "partial";
            refundPercentage = 50;
            message = $"Partial refund — cancelled {daysSinceBooking} day(s) after booking. 50% refund or travel credit.";
        }
        else
        {
            policyTier = "credit";
            refundPercentage = 0;
            message = $"Travel credit only — cancelled {daysSinceBooking} day(s) after booking. No cash refund.";
        }

        var refundAmount = Math.Round(booking.TotalAmount * refundPercentage / 100m, 2);

        return new CancellationResult(
            PolicyTier: policyTier,
            RefundPercentage: refundPercentage,
            RefundAmount: refundAmount,
            DaysSinceBooking: daysSinceBooking,
            Message: message
        );
    }
}
