# A person belongs to at most one organization

A person has at most one organization membership, and the database enforces it: `member.user_id` is unique, so a second membership is rejected whatever path tries to write it — a service, the seed, a future invitation flow or a hand-written query. Moving to another construction company changes the membership, never the user: the current organization removes the person (RF-136) and the new one invites them, and they keep the same account, email and password. Nobody works for two construction companies at once, and with two memberships it would be ambiguous whose licenses and projects the person sees.

Requirements: RF-139

## Consequences

- "The organization this person administers" is a lookup by user, not a choice: `MembersRepository.findByUser` returns the one membership, and the service decides whether its role is `admin`. No query has to pick "the first" membership.
- Migration `0004` replaces the `(organization_id, user_id)` unique index with a unique index on `user_id`, and indexes `organization_id` on its own. Before building the index it deletes every membership but the oldest per person, and the project memberships left in the organizations it removed, so a database seeded before this rule still migrates; there is no production database yet ([0015](0015-hosting-and-providers-deferred.md)).
- Sign-up still gives every new account its own organization ([0012](0012-signup-seeding-as-compensated-saga.md)). A test that puts a signed-up person in another organization deletes their sign-up organization first. An invitation that creates the account and then adds the membership now fails on the unique index until that hook stops seeding invited people, which [0012](0012-signup-seeding-as-compensated-saga.md) already ties to #11.
- The constraint covers the organization membership only: a `project_member` row on another organization's project is still kept out by the organization join in the project queries ([0051](0051-transaction-aware-repositories-via-cls.md)), not by the schema.
- Refusing an invitation from another organization for someone who already has a membership is a rule of the invitation flow (#87, #11); this constraint is the backstop if that check is ever missed.
- There is no organization switcher in the interface: with one membership there is nothing to switch.

## Considered Options

- **Many organizations per person, as Better Auth's organization plugin models it** (a `member` row per organization and an "active organization" on the session): lost. It fits a consultant working for several companies, which RF-139 rules out, and every query would need to know which organization is active. We already keep our own tables for organization and invitation ([0042](0042-invitation-is-our-own-table.md)).
- **Enforce it only in the service**: a check that every path writing `member` must remember. The seed already broke it once, with a person in two organizations.
