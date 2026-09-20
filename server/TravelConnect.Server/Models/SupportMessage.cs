namespace TravelConnect.Server.Models;

public class SupportMessage : BaseEntity
{
    public int SupportConversationId { get; set; }
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    // "Customer" | "Agent"
    public string SenderType { get; set; } = "Customer";
    public string Body { get; set; } = string.Empty;
    public bool IsRead { get; set; }
}
