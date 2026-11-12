/** A single item on the one flat to-do list. Times are epoch milliseconds. */
export interface Todo {
  id: string;
  text: string;
  createdAt: number;
  /** When it was checked off; `null` while it is open. */
  completedAt: number | null;
}

/**
 * All Todos live in one list in display order. Completing a Todo only records
 * when; it keeps its place, so unchecking it puts it back where it was.
 */
export function openTodos(todos: readonly Todo[]): Todo[] {
  return todos.filter((todo) => todo.completedAt === null);
}

/** Completed Todos, most recently completed first. */
export function completedTodos(todos: readonly Todo[]): Todo[] {
  return todos
    .filter((todo): todo is Todo & { completedAt: number } => todo.completedAt !== null)
    .sort((a, b) => b.completedAt - a.completedAt);
}

export function addTodo(todos: readonly Todo[], todo: Pick<Todo, 'id' | 'text' | 'createdAt'>): Todo[] {
  return [...todos, { ...todo, text: todo.text.trim(), completedAt: null }];
}

export function setCompleted(todos: readonly Todo[], id: string, completedAt: number | null): Todo[] {
  return todos.map((todo) => (todo.id === id ? { ...todo, completedAt } : todo));
}

export function editText(todos: readonly Todo[], id: string, text: string): Todo[] {
  const trimmed = text.trim();
  if (!trimmed) return [...todos];
  return todos.map((todo) => (todo.id === id ? { ...todo, text: trimmed } : todo));
}

export function deleteTodo(todos: readonly Todo[], id: string): Todo[] {
  return todos.filter((todo) => todo.id !== id);
}

/**
 * Moves an open Todo to `toIndex` among the open Todos (clamped). Completed
 * Todos keep their places, so they return to the right spot when unchecked.
 */
export function moveTodo(todos: readonly Todo[], id: string, toIndex: number): Todo[] {
  const moving = todos.find((todo) => todo.id === id);
  if (!moving || moving.completedAt !== null) return [...todos];

  const rest = todos.filter((todo) => todo !== moving);
  const before = openTodos(rest)[Math.max(0, toIndex)];
  const at = before ? rest.indexOf(before) : rest.length;
  return [...rest.slice(0, at), moving, ...rest.slice(at)];
}

/** How long a completed Todo stays before it is cleared. */
const CLEAR_COMPLETED_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

/** Removes completed Todos once 3 days have passed since their completion. Open Todos always stay. */
export function clearCompleted(todos: readonly Todo[], now: number): Todo[] {
  return todos.filter((todo) => todo.completedAt === null || now - todo.completedAt < CLEAR_COMPLETED_AFTER_MS);
}
