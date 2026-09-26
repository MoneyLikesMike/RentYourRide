# Listing video — TestFlight path

Marketplace-style short clips on host listings. **No separate video platform** — videos live in the listing `photos[]` array with `type: 'video'`.

App version on TF for this feature: check `app.json` (`3.0.7` / build **40** in the working tree). Target API: bedev for TF.

## Host path (iOS TF)

1. **List flow:** List your ride → … → **Show off your ride** → **Add video**  
   or continue with photos → **Photo management**.
2. **Edit flow:** Edit your ride → **Photos & video** → action sheet → **Add video**.
3. **Picker:** Photo library only (`expo-image-picker`, `mediaTypes: ['videos']`, `videoMaxDuration: 60`). No in-app record.
4. **Limits (client):** up to **1** video + **10** photos; reject with alert if **> 60s** or **> 60 MB** (`constants/listingMedia.js`).
5. **Order:** new videos are **pinned first** in the media array (not buried after photos). Cards still prefer an **image** cover (`listingCoverUri`).
6. **Upload:** Continue/save → `syncListingPhotos` → `POST /v1/host/listings/:id/photos` with `mediaType=video`. Listing row is created/saved first; a failed later upload surfaces a clear error and stops the loop (prior successful appends may already be on the listing — see punch list).
7. **API reject:** MIME allowlist + **60 MB** video cap + max **1** video; oversized file deleted from disk before response.

## Guest playback (iOS TF)

1. **Listing detail hero:** muted, no autoplay, play badge → opens gallery.
2. **Gallery** (`ListingPhotoGalleryScreen`): active slide plays with native controls; thumbs muted/static.

## Web (same listing)

1. **Detail** (`ListingDetailPage`): detects `type: 'video'` / video extensions; main stage shows muted poster-like `<video preload="metadata">` + play affordance; lightbox uses `controls` + `playsInline` + **muted** (Safari autoplay policy).
2. **Host list-on-web:** List / edit your ride → **Photos & video** — optional **Add video** (MP4/MOV, ≤1 min / 60 MB). Pinned first on save; cover remains the first photo.

## Manual test matrix

| Case | Expect |
|------|--------|
| ~15s happy path | Pick → save → hero badge → gallery plays |
| Huge file / long clip | Alert: under 60 MB / 1 minute; no upload |
| Airplane mode mid-upload | Save error; listing not half-published as “success” |
| Web + iOS Safari | Open listing with video; muted inline; unmute via controls in lightbox |
| Web host add video | List/edit ride → Add video → publish/save → detail shows Video |
| Photos only | Unchanged |

## Punch list / follow-ups

| Item | Status |
|------|--------|
| Poster frame generation (`thumbnailUri`) | Open — client field exists; nothing generates posters |
| Android picker / record | Open — iOS TF only verified in product today |
| Web host video upload | Done — ListYourRide step 5 + `syncHostListingMedia` |
| Server-side duration probe | Open — client + picker only; API enforces size/MIME/count |
| Disk orphan cleanup on photo remove | Open — PATCH drops URIs; files may remain under `uploads/listings` |
| Create-then-upload orphan draft | Open — listing can exist if user abandons after create |
| Feed autoplay muted | N/A by design — cards use image cover; detail is tap-to-play |
| Transcoding / S3 CDN | Out of scope — hard 60 MB cap instead |
| Deploy API video guards to bedev/prod | Needed before TF clients hit new reject messages in prod |

## Key files

- Mobile: `screens/ShowOffYourRideScreen.js`, `PhotoManagementScreen.js`, `VehicleDetailScreen.js`, `ListingPhotoGalleryScreen.js`, `utils/listingPhotos.js`, `constants/listingMedia.js`
- API: `apps/api/src/listings/host-listings.controller.ts` (`POST …/photos`)
- Web: `apps/web/src/pages/ListYourRidePage.tsx`, `ListingDetailPage.tsx`, `PhotoLightbox.tsx`, `api/hostListings.ts` (`syncHostListingMedia`), `utils/listingMedia.ts`, `api/listings.ts`
