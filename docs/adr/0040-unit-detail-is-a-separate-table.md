# Unit data lives in a separate 1:1 table

`unit_detail` is 1:1 with `location` (PK = `location_id`) and holds `status`, `planned_start_date`, `is_sold` and `notes`. Common areas have no sale status and no unit status cycle; folded into `location`, those columns would be nullable, and strict TypeScript would force `status: unit_status | null` handling in every piece of code that only deals with units. The join costs nothing at ~500 rows per project.

Requirements: RF-601, RF-602, RF-808
