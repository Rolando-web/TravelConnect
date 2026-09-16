namespace TravelConnect.Server.Models;

public class Lead : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Interest { get; set; } = string.Empty;
    public string Stage { get; set; } = "New";
    public string Source { get; set; } = "Manual";
    public decimal Worth { get; set; } = 0m;
    public string NextFollowUp { get; set; } = string.Empty;
    public string AssignedTo { get; set; } = string.Empty;
    public string LastContact { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}