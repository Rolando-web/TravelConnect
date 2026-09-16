using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

public class PdfService
{
    public byte[] GenerateItineraryPdf(Booking booking, List<BookingFlight> flights)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                page.Header().Element(header =>
                {
                    header.Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text("TravelConnect").Bold().FontSize(20).FontColor("#06D6A0");
                            col.Item().Text("Your Journey Starts Here").FontSize(8).FontColor(Colors.Grey.Medium);
                        });
                        row.RelativeItem().AlignRight().Column(col =>
                        {
                            col.Item().Text("E-TICKET").Bold().FontSize(14).FontColor("#1f2937");
                            col.Item().Text(booking.ReferenceNumber).Bold().FontSize(12).FontColor("#06D6A0");
                        });
                    });
                });

                page.Content().Element(content =>
                {
                    content.PaddingTop(10);

                    // Passenger Info
                    content.Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text("PASSENGER DETAILS").Bold().FontSize(11).FontColor("#6b7280");
                            col.Item().PaddingTop(5).Text($"Name: {booking.CustomerName}").Bold();
                            col.Item().Text($"Email: {booking.CustomerEmail}");
                            col.Item().Text($"Phone: {booking.CustomerPhone}");
                            col.Item().Text($"Travellers: {booking.Travellers}");
                        });
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text("BOOKING DETAILS").Bold().FontSize(11).FontColor("#6b7280");
                            col.Item().PaddingTop(5).Text($"Package: {booking.PackageName}").Bold();
                            col.Item().Text($"Location: {booking.Location}");
                            col.Item().Text($"Dates: {booking.StartDate} — {booking.EndDate}");
                            col.Item().Text($"Payment: {booking.PaymentMethod}");
                        });
                    });

                    content.PaddingTop(15);

                    // Flight Itinerary Table
                    if (flights.Count > 0)
                    {
                        content.Text("FLIGHT ITINERARY").Bold().FontSize(11).FontColor("#6b7280");
                        content.PaddingTop(5);

                        content.Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(1);
                                columns.RelativeColumn(1);
                            });

                            // Header
                            table.Header(header =>
                            {
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Flight").Bold().FontSize(8).FontColor(Colors.Grey.Darken1);
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Date").Bold().FontSize(8).FontColor(Colors.Grey.Darken1);
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Time").Bold().FontSize(8).FontColor(Colors.Grey.Darken1);
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Class").Bold().FontSize(8).FontColor(Colors.Grey.Darken1);
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Seat").Bold().FontSize(8).FontColor(Colors.Grey.Darken1);
                            });

                            foreach (var f in flights)
                            {
                                table.Cell().Padding(5).Text($"{f.Airline} {f.FlightNumber}").FontSize(9);
                                table.Cell().Padding(5).Text(f.DepartureDate).FontSize(9);
                                table.Cell().Padding(5).Text($"{f.DepartureTime} — {f.ArrivalTime}").FontSize(9);
                                table.Cell().Padding(5).Text(f.Class).FontSize(9);
                                table.Cell().Padding(5).Column(col =>
                                {
                                    foreach (var seatId in (f.SeatNumber ?? string.Empty)
                                        .Split(',', StringSplitOptions.RemoveEmptyEntries))
                                    {
                                        col.Item().Text(seatId.Trim()).Bold().FontSize(10).FontColor("#06D6A0");
                                    }
                                });
                            }
                        });
                    }

                    content.PaddingTop(15);

                    // Summary
                    content.Text("PAYMENT SUMMARY").Bold().FontSize(11).FontColor("#6b7280");
                    content.PaddingTop(5);
                    content.Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text($"Subtotal: ₱{booking.Subtotal:N2}");
                            col.Item().Text($"Discount: -₱{booking.DiscountAmount:N2}");
                            if (!string.IsNullOrEmpty(booking.PromoCodeUsed))
                                col.Item().Text($"Promo: {booking.PromoCodeUsed}").FontSize(8).FontColor(Colors.Grey.Medium);
                        });
                        row.RelativeItem().AlignRight().Column(col =>
                        {
                            col.Item().Text("TOTAL PAID").Bold().FontSize(12);
                            col.Item().Text($"₱{booking.TotalAmount:N2}").Bold().FontSize(16).FontColor("#06D6A0");
                        });
                    });

                    // Terms
                    content.PaddingTop(20);
                    content.Text("TERMS & CONDITIONS").Bold().FontSize(9).FontColor(Colors.Grey.Medium);
                    content.PaddingTop(3);
                    content.Text("• Present this e-ticket at check-in. A valid photo ID is required.")
                        .FontSize(8).FontColor(Colors.Grey.Darken1);
                    content.Text("• Seat assignments are subject to availability and may change at check-in.")
                        .FontSize(8).FontColor(Colors.Grey.Darken1);
                    content.Text("• Cancellation policy: Full refund within 7 days, partial thereafter.")
                        .FontSize(8).FontColor(Colors.Grey.Darken1);
                    content.Text("• This ticket is non-transferable.")
                        .FontSize(8).FontColor(Colors.Grey.Darken1);
                });

                page.Footer().Element(footer =>
                {
                    footer.AlignCenter().Text(text =>
                    {
                        text.Span("Generated by TravelConnect | ").FontSize(8).FontColor(Colors.Grey.Medium);
                        text.Span(DateTime.UtcNow.ToString("MMM dd, yyyy HH:mm UTC")).FontSize(8).FontColor(Colors.Grey.Medium);
                    });
                });
            });
        });

        using var stream = new MemoryStream();
        document.GeneratePdf(stream);
        return stream.ToArray();
    }
}