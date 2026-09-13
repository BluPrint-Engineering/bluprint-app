# Rooms hang outside the location tree

A room hangs on a unit or a common area (the party room has a kitchen and a bathroom). It stays out of the `location` tree because it is not a level of the hierarchy and never holds a plan. A pin stores `room_id`, never a copied name, so renaming a room propagates to pins and reports.

Requirements: RF-213
