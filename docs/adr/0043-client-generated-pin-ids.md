# Pin and photo ids are UUID v7 generated on the client, with normalized coordinates

`pin.id` and `pin_photo.id` are generated on the client. The offline queue resends when the app reopens with signal, and a client-side id makes that resend idempotent for free. v7 instead of v4 because it is time-ordered and does not fragment the index across tens of thousands of inserts. Pin `x`/`y` are `decimal(8,6)` normalized to 0–1 over the image: pixels would break when the plan is reprocessed or shown at another density.

Requirements: RF-511, RNF-10
