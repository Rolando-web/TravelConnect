using Microsoft.AspNetCore.Mvc;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InquiriesController : ControllerBase
{
    private static readonly List<CustomerInquiry> _inquiries = new();

    [HttpPost]
    public IActionResult SubmitInquiry([FromBody] CustomerInquiry inquiry)
    {
        if (inquiry == null || string.IsNullOrWhiteSpace(inquiry.Message))
        {
            return BadRequest(new { message = "Inquiry message is required." });
        }

        inquiry.Id = _inquiries.Count + 1;
        inquiry.DateSubmitted = DateTime.UtcNow;
        inquiry.Status = "open";

        _inquiries.Add(inquiry);

        return Ok(new
        {
            success = true,
            message = "Your customer inquiry has been received. Agency staff will respond shortly.",
            inquiry
        });
    }
}
