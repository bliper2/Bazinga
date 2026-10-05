/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Todo {
    id: string;
    text: string;
    done: boolean;
    /** In-app path to the message this task came from, like /channels/1/2/3. */
    link?: string;
}

export const MAX_TODOS = 500;
export const MAX_TEXT = 300;

let counter = 0;
const makeId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** In-app message links only. Anything else is dropped, because the link is later passed to the router. */
const SAFE_LINK = /^\/channels\/(@me|\d+)\/\d+(\/\d+)?$/;

export function addTodo(todos: Todo[], input: { text: string; link?: string; }): Todo[] {
    const text = input.text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
    if (!text) return todos;

    const todo: Todo = { id: makeId(), text, done: false };
    if (input.link && SAFE_LINK.test(input.link)) todo.link = input.link;
    return [todo, ...todos].slice(0, MAX_TODOS);
}

export const toggleTodo = (todos: Todo[], id: string) => todos.map(t => (t.id === id ? { ...t, done: !t.done } : t));

export const removeTodo = (todos: Todo[], id: string) => todos.filter(t => t.id !== id);

export const openCount = (todos: Todo[]) => todos.filter(t => !t.done).length;
