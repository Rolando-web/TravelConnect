using Microsoft.AspNetCore.Mvc;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/test")]
public class TestController : ControllerBase
{
    [HttpGet]
    public IActionResult Test() =>
        Ok(new
        {
            message = "TravelConnect Backend connected (Online Mode)",
            status = "ok"
        });
}