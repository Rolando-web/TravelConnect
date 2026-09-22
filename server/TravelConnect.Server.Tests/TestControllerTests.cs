using Microsoft.AspNetCore.Mvc;
using TravelConnect.Server.Controllers;
using Xunit;

namespace TravelConnect.Server.Tests;

public class TestControllerTests
{
    [Fact]
    public void Test_ReturnsOnlineMessage()
    {
        var controller = new TestController();

        var ok = Assert.IsType<OkObjectResult>(controller.Test());

        var json = TestDb.ToJson(ok.Value);
        Assert.Equal("ok", json.GetProperty("status").GetString());
        Assert.Contains("Online Mode", json.GetProperty("message").GetString());
    }
}