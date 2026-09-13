# Roles are per project, with a default role on the organization

Every permission check reads the **effective role** on the person's project membership. The **default role** on the organization membership only suggests: it records the role of someone invited before any project exists and pre-fills the choice when adding them to one. The same person can be manager on one project and assistant on another, and promoting someone does not retroactively change the projects they are already in.

Requirements: RF-121, RF-122, RF-123, RF-124
