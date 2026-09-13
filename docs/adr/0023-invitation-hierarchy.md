# Invitation hierarchy: admin → manager → assistant

Only the organization admin invites managers, a manager invites only assistants, and an assistant invites nobody. The hierarchy is validated in the service, not in the schema, because it is an authorization rule and reads the project membership's role.

Requirements: RF-126
