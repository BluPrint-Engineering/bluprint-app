One-line: confirmation for an action that cannot be undone: what happens, an acknowledgement that unlocks the action, Cancelar always available.

```jsx
<AlertDialog open={open} onClose={close} title="Entregar “Casa Moinhos”?"
  actionLabel={pending ? "Entregando obra…" : "Entregar obra"} actionIcon={<Icon name="circle-check" size={18} />}
  onAction={deliver} actionDisabled={!ack} pending={pending} error={error}>
  <p>A entrega fecha a obra de vez. Depois de confirmar:</p>
  …
  <Checkbox label="Entendi que a obra não poderá ser reaberta." checked={ack} onChange={e => setAck(e.target.checked)} />
</AlertDialog>
```

- In `apps/web`: `bunx shadcn add alert-dialog`, restyled to these tokens; below 768px render it as the bottom sheet (`drawer`), action on top and both buttons `lg` full width.
- Initial focus on the first control in the body, never on the action. The error sits above the buttons, next to the action that failed.
- First use: delivering an obra (`docs/design/screens/obra/`, [0069](../../../../docs/adr/0069-delivering-a-project-is-final.md)).
