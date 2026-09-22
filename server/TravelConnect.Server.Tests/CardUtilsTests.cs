using TravelConnect.Server.Services;

namespace TravelConnect.Server.Tests;

public class CardUtilsTests
{
    [Theory]
    [InlineData("4242424242424242", true)]  // Visa test card
    [InlineData("5555555555554444", true)]  // Mastercard test card
    [InlineData("378282246310005", true)]   // Amex test card
    [InlineData("4242424242424241", false)] // flipped checksum
    [InlineData("12345", false)]            // too short
    [InlineData("5555555555554445", false)] // flipped checksum (Mastercard)
    public void Luhn_accepts_only_valid_digit_strings(string number, bool expected) =>
        Assert.Equal(expected, CardUtils.IsValidLuhn(number));

    [Fact]
    public void Sandbox_test_cards_are_whitelisted_for_qa_and_dev()
    {
        Assert.True(CardUtils.IsSandboxTestCard("4343434343434345")); // Visa success
        Assert.True(CardUtils.IsSandboxTestCard("4120000000000007")); // 3-D Secure required
        Assert.True(CardUtils.IsSandboxTestCard("5123000000000002")); // Mastercard success
        Assert.True(CardUtils.IsSandboxTestCard("4200000000000018")); // decline - expired
        Assert.False(CardUtils.IsSandboxTestCard("4242424242424242"));
        Assert.False(CardUtils.IsSandboxTestCard("4242424242424241"));
        Assert.False(CardUtils.IsSandboxTestCard("4343434343434343")); // old wrong number
    }

    [Theory]
    [InlineData("4242424242424242", "Visa")]
    [InlineData("5555555555554444", "Mastercard")]
    [InlineData("2221000000000009", "Mastercard")]
    [InlineData("378282246310005", "Amex")]
    [InlineData("3566002020360505", "JCB")]
    [InlineData("1234", "card")]
    public void Brand_is_detected_from_leading_digits(string number, string expected) =>
        Assert.Equal(expected, CardUtils.CardBrand(number));

    [Fact]
    public void Expiry_must_be_this_month_or_later()
    {
        var now = DateTime.UtcNow;
        Assert.True(CardUtils.IsValidExpiry(now.Month, now.Year));
        Assert.False(CardUtils.IsValidExpiry(now.Month == 1 ? 12 : now.Month - 1, now.Year));
        Assert.False(CardUtils.IsValidExpiry(0, now.Year + 1));
        Assert.False(CardUtils.IsValidExpiry(13, now.Year + 1));
        Assert.True(CardUtils.IsValidExpiry(12, now.Year + 3));
        Assert.False(CardUtils.IsValidExpiry(1, now.Year - 1));
    }

    [Theory]
    [InlineData("123", "Visa", true)]
    [InlineData("1234", "Visa", false)]  // only Amex allows 4
    [InlineData("1234", "Amex", true)]
    [InlineData("12a", "Visa", false)]
    [InlineData("12", "Visa", false)]
    public void Cvc_length_is_brand_aware(string cvc, string brand, bool expected) =>
        Assert.Equal(expected, CardUtils.IsValidCvc(cvc, brand));
}