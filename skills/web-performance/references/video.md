# Background video

Background video is usually most of a media-rich page's bytes (84% of the source project's home
page). These rules keep the design and cut the bytes.

## Encode short loops

- H.264 MP4, muted, no audio track, `-movflags +faststart` (index at the front, so it plays after
  one request).
- 9–18 s loops at 25–30 fps. Desktop files 1600–1920 px wide.
- Keep colour tags as they are: ffmpeg passes the source's tags through. A phone copy must match
  its desktop file, or phones and desktops show different colours.

## Load late

- `preload="none"` and a poster in the HTML.
- An IntersectionObserver sets `preload="auto"` and calls `play()` as the video comes near, and
  pauses it when it leaves.
- Assign posters by script as the video comes near: the small poster when the element is under
  about 1100 device pixels wide, otherwise the large one.

## Skip when it doesn't help

- `navigator.connection.saveData` or a 2G connection: keep the poster, remove the video.
- `prefers-reduced-motion`: poster only.
- `robots.txt` disallows `/video/`, so crawlers don't download it.

## Phone copies (`phone-videos.mjs`)

Added as the first `<source>` with a media query; the browser picks the source once, at page load.

- **Small cards** (about 330 × 250 px on a phone): the whole frame scaled to 960 px wide.
  `<source media="(max-width: 479.98px)" src="/video/name-m.mp4" type="video/mp4">`
- **Tall full-height sections:** `object-fit: cover` shows only an upright slice of a 16:9 frame on
  a phone, so the copy is that slice at full resolution: same sharpness, a fraction of the data.
  `<source media="(max-width: 479.98px) and (orientation: portrait)" src="/video/name-tall.mp4" type="video/mp4">`
  Phones held sideways keep the full file.
- **Crop math:** for a section with horizontal `object-position` p (0.5 = centred), crop the full
  height and a width `cw` starting at `x = p × (frame width − cw)`. For any section narrower than
  the crop, the visible part (and the poster under it) then matches the desktop file exactly, so
  nothing jumps when the video starts. Choose the crop shape (width ÷ height) a little wider than
  the widest such section on phones, measured at 320–480 px.
- **Results on the source project:** phone home page 12.2 → 7.0 MB; service-page videos 41–55%
  smaller; similarity to the originals (SSIM, 1.0 = identical) 0.95–0.99.

## Check the result

- In a real browser at phone sizes, read `video.currentSrc` to see which file was chosen.
- Compare the same frame of the original and the copy in a section of the same size.
- Some headless Chromium builds can't play H.264 and fall back to the next source, which looks like
  phones downloading two videos. Check `canPlayType('video/mp4; codecs="avc1.640028"')` first.

## Fair use

Vercel's Flat Rate CDN excludes "large-scale delivery of media or files where such delivery
constitutes a majority of bandwidth usage" (checked November 2026). A marketing site with a few
background loops is far from that, but keeping video bytes down is cheap insurance.
