namespace TravelConnect.Server.Services;

/// <summary>
/// Client-side card data is validated here BEFORE it is sent to PayMongo so
/// obvious typos (broken Luhn checksum, expired card, bad CVC) are rejected
/// without consuming a PayMongo attempt. The authoritative validation still
/// happens at PayMongo; CardUtils only filters the clear-cut invalid cases.
/// </summary>
public static class CardUtils
{
    /// <summary>Detects the card brand from the IIN (first digits).</summary>
    public static string CardBrand(string number)
    {
        var n = DigitsOnly(number);
        if (n.Length < 2) return "card";

        if (n.StartsWith("4")) return "Visa";
        if (n.StartsWith("34") || n.StartsWith("37")) return "Amex";
        if (n.StartsWith("35")) return "JCB";
        if (n.StartsWith("36") || n.StartsWith("38")) return "Diners";
        if (n.StartsWith("5") && n[1] is >= '1' and <= '5') return "Mastercard";
        if (n.StartsWith("2")) return "Mastercard"; // 2-series BINs (2221-2720)
        if (n.StartsWith("6")) return "Discover";

        return "card";
    }

    /// <summary>
    /// PayMongo's public sandbox test cards are intentionally NOT all
    /// Luhn-compliant in the test gateway. Whitelist them so QA/dev can
    /// exercise the sandbox; real cards always go through the Luhn check.
    /// Source: https://docs.paymongo.com/docs/payment-acceptance-testing
    /// </summary>
    public static bool IsSandboxTestCard(string number)
    {
        var n = DigitsOnly(number);
        var known = new[]
        {
            "4343434343434345",  // Visa — successful payment, no 3DS
            "4571736000000075",  // Visa (debit) — successful payment
            "5123000000000002",  // Mastercard — successful payment
            "4120000000000007",  // Visa — 3DS required (authorize at prompt)
            "5123000000000001",  // Mastercard — 3DS supported but optional
            "4200000000000018",  // Declined — expired card
            "4300000000000017",  // Declined — invalid CVC
            "5100000000000198"   // Declined — insufficient funds
        };
        return Array.IndexOf(known, n) >= 0;
    }

    /// <summary>Luhn checksum — catches mistyped digits on the card number.</summary>
    public static bool IsValidLuhn(string number)
    {
        var n = DigitsOnly(number);
        if (n.Length < 13 || n.Length > 19) return false;

        var sum = 0;
        var doubleDigit = false;
        for (var i = n.Length - 1; i >= 0; i--)
        {
            var d = n[i] - '0';
            if (doubleDigit)
            {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            doubleDigit = !doubleDigit;
        }
        return sum % 10 == 0;
    }

    /// <summary>Card must not be in the past. Year is the 4-digit year.</summary>
    public static bool IsValidExpiry(int month, int year)
    {
        if (month is < 1 or > 12) return false;

        var now = DateTime.UtcNow;
        var thisMonth = new DateTime(now.Year, now.Month, 1);
        var expiry = new DateTime(year, month, 1);
        // Valid through the end of the expiry month.
        return expiry >= thisMonth && year >= now.Year;
    }

    /// <summary>Amex uses 4-digit CVC; most cards 3 digits.</summary>
    public static bool IsValidCvc(string cvc, string brand) =>
        cvc.Length == (brand == "Amex" ? 4 : 3) && cvc.All(char.IsDigit);

    private static string DigitsOnly(string value) =>
        new((value ?? string.Empty).Where(char.IsDigit).Take(19).ToArray());
}