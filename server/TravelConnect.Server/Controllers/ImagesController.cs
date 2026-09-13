using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/images")]
public class ImagesController(TravelConnectDbContext db) : ControllerBase
{
    private const long MaxFileSize = 5 * 1024 * 1024; // 5 MB

    [HttpPost]
    public async Task<ActionResult<object>> Upload(IFormFile? file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file was uploaded" });

        if (file.Length > MaxFileSize)
            return BadRequest(new { message = "Image must be 5 MB or smaller" });

        if (!(file.ContentType ?? "").StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Only image files are allowed" });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);

        var image = new Image
        {
            FileName = Path.GetFileName(file.FileName) ?? "upload",
            ContentType = file.ContentType ?? "image/jpeg",
            Data = ms.ToArray(),
            CreatedAt = DateTime.UtcNow
        };

        db.Images.Add(image);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = image.Id }, new
        {
            id = image.Id,
            fileName = image.FileName,
            contentType = image.ContentType,
            url = $"/api/images/{image.Id}"
        });
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Get(int id)
    {
        var image = await db.Images.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
        if (image is null) return NotFound(new { message = "Image not found" });
        return File(image.Data, image.ContentType);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var image = await db.Images.FirstOrDefaultAsync(i => i.Id == id);
        if (image is null) return NotFound(new { message = "Image not found" });
        db.Images.Remove(image);
        await db.SaveChangesAsync();
        return NoContent();
    }
}