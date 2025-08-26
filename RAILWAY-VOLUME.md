
### Railway Volume Setup

- Mount your Volume to: **/app/public/uploads**
- Or set env `UPLOAD_DIR=/app/public/uploads` and `UPLOAD_PUBLIC_BASE=/uploads`
- The app will:
  - Ensure the directory exists on boot
  - Save files there at runtime
  - Serve them from `/uploads/...` via Next's static `public` folder

**Debug**
- Open `/api/_debug/volume` → should return `{ ok: true, dir, wrote }`
- After an upload, open the returned `proofUrl` directly in the browser.
