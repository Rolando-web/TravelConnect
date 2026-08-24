using Microsoft.AspNetCore.Mvc;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            message = "TravelConnect API is working!"
        });
    }
}