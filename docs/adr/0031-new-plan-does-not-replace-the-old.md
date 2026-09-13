# A new plan never replaces the old one

A pin's coordinates only make sense on the image it was created on; reusing pins on a new plan would move issues without anyone noticing. Both plans coexist in the same discipline, the user picks which one to work on, and only the project manager deletes a plan (not even the admin, who is read-and-export only).

## Consequences

- There is deliberately no unique constraint on `plan (location_id, discipline_id)`.

Requirements: RF-412, RF-116
