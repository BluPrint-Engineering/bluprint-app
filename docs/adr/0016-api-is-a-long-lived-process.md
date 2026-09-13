# The API runs as a long-lived process

Wherever it is hosted, the API needs a **long-lived process**: it holds the Postgres connection pool and pays Nest's DI container bootstrap once. That excludes any host that only offers ephemeral functions, and it is what makes cold start a hosting criterion: opening a floor plan with its pins has a budget of ~3 s on 4G, and a host that sleeps spends that whole budget before the first query.
