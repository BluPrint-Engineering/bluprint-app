# Sessions end after 8 hours without use

Supersedes the session-lifetime paragraph of [0010](0010-self-hosted-better-auth.md).

The session cookie used to last 90 days, renewed after each day of use, so a phone left on a site stayed signed in. A session now ends after 8 hours without use and has no absolute cap: someone working keeps working, and an idle device is signed out before the next day. Any authenticated request counts as use, so the web app must never poll in the background.

Better Auth's cookie cache, a JWT with a 5-minute lifetime, sits in front of the session row. While it is valid the API does not read the session table. When it expires, the API reads the row, extends the same session token and issues a new JWT. `refreshCache` stays off: with a database configured the library forces it off, and enabling it would refresh the cookie without extending the row. The JWT only says who the user is and that the session is valid. Roles are always read from the database, so losing access to a project applies on the next request. Ending a session on the server takes effect within 5 minutes. Signing out clears the session cookie and the cache cookie for that browser, so the next request from any of its tabs is rejected at once. Another device is a different cookie.

The two durations live in `@bluprint/shared`. The API config and the web gate both read them, so the screen check cannot drift from the JWT.

## Consequences

- `expiresIn` is 8 hours and `updateAge` is 5 minutes. `cookieCache` uses `strategy: "jwt"` and a 5-minute `maxAge`. No JWT plugin, no `refreshCache`, no `disableSessionRefresh`.
- The client still never sends `rememberMe: false`.
- A continuously used session, including a stolen cookie, never expires. Accepted for field use. The idle window can end up to 5 minutes early, because a cache hit does not extend the row.
- Logout ends only the current browser. An idle tab keeps what it already painted until its next action, or until the 5-minute return check if it was in the background. A password change or reset, once built, revokes the other sessions.
- Shipping this deletes every existing `session` row. There are no production users.
- Removing someone from a project stays a 404 on the next request. `isPlatformAdmin` from the cache authorizes nothing.

## Considered Options

- An absolute cap of 12 or 24 hours: signs people out mid-work.
- A short idle plus an absolute cap: more logins than the team accepts.
- Weeks of sliding renewal: contradicts the team's report.
- Rotating the session token on renewal: races with open tabs for little gain behind an HttpOnly cookie.
- A broadcast that sends every other tab to login the instant one signs out: the shared cookie is already dead, and the next action on those tabs fails.
