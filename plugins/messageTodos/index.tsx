/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { HeaderBarButton } from "@api/HeaderBar";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { openModal } from "@utils/modal";
import type { Message, RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, Menu, Modal, NavigationRouter, showToast, TextInput, Toasts, useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";
import { ChecklistIcon } from "../_bazinga/icons";
import { addTodo, openCount, removeTodo, type Todo, toggleTodo } from "./todos";

const logger = bazingaLogger("MessageTodos");
const STORE_KEY = "Bazinga_Todos";

let todos: Todo[] = [];
const listeners = new Set<() => void>();

async function save(next: Todo[]) {
    todos = next;
    listeners.forEach(l => l());
    await DataStore.set(STORE_KEY, todos);
}

function useTodos() {
    const [, rerender] = useState(0);
    useEffect(() => {
        const listener = () => rerender(n => n + 1);
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }, []);
    return todos;
}

function TodoModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const list = useTodos();
    const [text, setText] = useState("");

    const add = () => {
        if (!text.trim()) return;
        save(addTodo(todos, { text })).catch(err => logger.error("Failed to save", err));
        setText("");
    };

    return (
        <Modal {...modalProps} size="md" title="To-do list" subtitle={`${openCount(list)} to do. Right-click any message to add it here.`}>
            <div className="bz-todo-new">
                <TextInput value={text} onChange={setText} placeholder="Add a task" onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === "Enter") add();
                    }} />
                <Button size="small" disabled={!text.trim()} onClick={add}>
                    Add
                </Button>
            </div>
            <div className="bz-todos">
                {!list.length && <p className="bz-todo-note">Nothing here yet.</p>}
                {list.map(todo => (
                    <div key={todo.id} className="bz-todo">
                        <input type="checkbox" checked={todo.done} onChange={() => save(toggleTodo(todos, todo.id))} aria-label="Done" />
                        <span className={todo.done ? "bz-todo-done" : ""}>{todo.text}</span>
                        {todo.link && (
                            <Button
                                size="small"
                                variant="secondary"
                                onClick={() => {
                                    NavigationRouter.transitionTo(todo.link!);
                                    modalProps.onClose();
                                }}
                            >
                                Open message
                            </Button>
                        )}
                        <Button size="small" variant="dangerSecondary" onClick={() => save(removeTodo(todos, todo.id))}>
                            Delete
                        </Button>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

const messageMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message?: Message; }) => {
    if (!message) return;
    children.push(
        <Menu.MenuItem
            id="bz-add-todo"
            label="Add to to-do list"
            action={() => {
                const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id ?? "@me";
                const text = message.content || message.attachments?.[0]?.filename || "Message";
                save(addTodo(todos, { text, link: `/channels/${guildId}/${message.channel_id}/${message.id}` }))
                    .then(() => showToast("Added to your to-do list", Toasts.Type.SUCCESS))
                    .catch(err => logger.error("Failed to save", err));
            }}
        />
    );
};

const TodoButton = ErrorBoundary.wrap(() => {
    const open = openCount(useTodos());
    return (
        <HeaderBarButton
            icon={ChecklistIcon}
            tooltip={open ? `To-do list (${open})` : "To-do list"}
            onClick={() => openModal(props => <TodoModal modalProps={props} />)}
        />
    );
}, { noop: true });

export default definePlugin({
    name: "MessageTodos",
    description: "A to-do list you can add messages to with a right-click. Tasks stay on this computer.",
    tags: ["Organisation", "Utility"],
    searchTerms: ["todo", "task", "checklist", "reminder", "list"],

    contextMenus: {
        "message": messageMenuPatch
    },

    headerBarButton: {
        icon: ChecklistIcon,
        render: () => <TodoButton />
    },

    async start() {
        try {
            todos = (await DataStore.get<Todo[]>(STORE_KEY)) ?? [];
        } catch (err) {
            logger.error("Failed to load tasks", err);
            todos = [];
        }
        listeners.forEach(l => l());
    }
});
