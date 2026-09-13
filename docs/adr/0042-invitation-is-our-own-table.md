# Invitations use our own table, not Better Auth's plugin

An invitation must link a person to the organization **and** to a project in one step, which the Better Auth plugin's table does not model. `project_id` null means a bulk organization-level invitation; filled, it also creates the project membership. Tokens are single-use and expire in 7 days.

Requirements: RF-127, RF-129, RF-133
