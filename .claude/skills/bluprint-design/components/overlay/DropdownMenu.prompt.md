One-line: a menu under a trigger — items are 44px rows with a 20px icon; radio items carry a trailing check.

```jsx
<DropdownMenu label="Conta" trigger={<Button variant="ghost" aria-label="Abrir menu da conta"><Avatar name={user.name} /></Button>}>
  <DropdownMenuLabel><strong>{user.name}</strong><span>{user.email}</span></DropdownMenuLabel>
  <DropdownMenuSeparator />
  <DropdownMenuItem icon={<Icon name="log-out" />} onSelect={signOut}>Sair</DropdownMenuItem>
</DropdownMenu>
```

- In `apps/web`: `bunx shadcn add dropdown-menu` (Radix). Keep the 44px rows and the `locked` behavior.
- `locked` keeps it open and disables every item but the busy one — used while signing out.
- Outside click and Escape close it. Non-item children (a theme switch) do not close it.
