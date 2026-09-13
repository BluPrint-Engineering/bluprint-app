# A pin's discipline is recorded on the pin, not read from its plan

The discipline is stored on the pin: inherited and locked when the plan belongs to a specific discipline, chosen by the user when the pin is created on the General plan. A pin created on the General plan as plumbing keeps being counted and reported as plumbing after a plumbing plan exists, so a pin in the "wrong" place is never lost, and a per-discipline report finds pins wherever they are. This holds for every discipline, not just plumbing and electrical.

Requirements: RF-407, RF-408, RF-411, RF-703
