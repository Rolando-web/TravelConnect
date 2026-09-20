namespace TravelConnect.Server.Models;

public class SupportConversation : BaseEntity
{
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Status { get; set; } = "Open";
    // Who the conversation is currently handed off to (support agent /
    // agency staff). Empty until an admin assigns it — "who is assigned".
    public string AssigneeEmail { get; set; } = string.Empty;

    // Lightweight unread counters so both sides get badges without
    // dragging the whole thread over the wire on every poll.
    public int UnreadByAgent { get; set; }
    public int UnreadByCustomer { get; set; }

    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;
    public string LastMessagePreview { get; set; } = string.Empty;
}
