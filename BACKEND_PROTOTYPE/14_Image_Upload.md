# Section 14 — Image Upload & Storage Screen

> **Figure 14 — Image Upload Component (CrudModal)**

---

## Screenshot Description

The Image Upload field appears in all Create/Edit modals:

```
┌──────────────────────────────────────────────────┐
│  Package Image                                   │
│ ┌──────────────────────────────────────────────┐ │
│ │                                              │ │
│ │         [  🖼️  Package Photo  ]              │ │
│ │            (300 x 150px preview)             │ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ [📤 Upload Image]  [🗑️ Remove]                  │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ /api/images/42                               │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## Source Code

**Frontend:** `client/TravelConnect.Client/src/components/admin/CrudModal.jsx` — Image upload field handler

**Backend:** `server/TravelConnect.Server/Controllers/ImagesController.cs` — Binary storage API

---

## How to Take Screenshot

1. Navigate to any admin page with a Create/Edit modal (e.g., `/admin/packages`)
2. Click "Add New" to open the CrudModal
3. Scroll to the image upload field
4. Take screenshot showing the upload interface

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `POST /api/images` | POST | Uploads image via multipart/form-data. Max 5MB, images only. Stores as `varbinary(max)` in SQL Server. Returns `/api/images/{id}` URL |
| `GET /api/images/{id}` | GET | Serves the image with its original content type. Response header: `Cache-Control: no-store` |
| `DELETE /api/images/{id}` | DELETE | Removes the image record from SQL Server |

---

## Algorithms Used

### Binary Storage
Images are stored directly in SQL Server as `varbinary(max)`:
```csharp
[HttpPost]
public async Task<IActionResult> Upload(IFormFile file)
{
    if (file.Length > 5 * 1024 * 1024)  // 5MB limit
        return BadRequest(new { message = "File too large" });

    using var ms = new MemoryStream();
    await file.CopyToAsync(ms);

    var image = new Image
    {
        FileName = file.FileName,
        ContentType = file.ContentType,
        Data = ms.ToArray()
    };

    db.Images.Add(image);
    await db.SaveChangesAsync();

    return Ok(new { url = $"/api/images/{image.Id}" });
}
```

### Content Type Preservation
```csharp
[HttpGet("{id:int}")]
public async Task<IActionResult> Get(int id)
{
    var image = await db.Images.FindAsync(id);
    if (image == null) return NotFound();

    Response.Headers.Append("Cache-Control", "no-store");
    return File(image.Data, image.ContentType);
}
```

### Image Preview (Client-Side)
```jsx
const preview = url ? (
  <img
    src={assetUrl(url)}
    alt={f.label}
    className="h-36 w-full object-cover rounded-xl"
    onError={(e) => { e.currentTarget.style.display = 'none'; }}
  />
) : (
  <div className="h-36 w-full flex items-center justify-center rounded-xl border border-dashed">
    No image set
  </div>
);
```

---

## Upload Validation

| Rule | Value | Enforced By |
|------|-------|------------|
| Max file size | 5 MB | Server (`file.Length > 5 * 1024 * 1024`) |
| Allowed types | Images only | Server (`file.ContentType.StartsWith("image/")`) |
| Storage format | varbinary(max) | SQL Server |
| Cache policy | no-store | HTTP response header |
