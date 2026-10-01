# Student To Do opens on web — t_9eb6b7fc

Stamp: `notes/company/student-todo-opens-on-web-intent.md`
Finding (stays blocked): `t_a7868c98`

## Product

- `StudentWorkList` wires WorkRow `onPress` + Open pill via `studentTodoOpenPath`.
- Practice/planned → `/todo/[submissionId]`; lesson → `/lesson/[assignmentId]`.
- Both lists: `/todo` and `/student/class` assignments To Do.
- WorkRow web title/Open use `cursor: pointer`.

## Live UI proof (375×812)

Run: `node notes/qa-fixtures/ditl/artifacts-todo-open-web-t_9eb6b7fc/run-todo-open-web.mjs`

| Shot | What |
|------|------|
| 02-todo-list-375.png | Assignments To Do with Open pills |
| 03-todo-opened-375.png | Open pill → own `/todo/[id]` |
| 04-class-todo-list-375.png | Class Math To Do with Open |
| 05-class-todo-opened-375.png | Class Open → same destination |
| 06-todo-title-open-375.png | Title row also navigates |

`result.json`: AC-TODO-OPEN-1/2 PASS (both lists). AC-TODO-OPEN-3 covered by shared open path unit tests (phone + web).

## Tests

```
node --test src/components/ui/studentTodoOpen.test.ts src/lib/student-session/work.test.ts
```
