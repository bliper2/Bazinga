/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Shared helpers for Bazinga plugins. Folders starting with "_" are not loaded as plugins.

import { Logger } from "@utils/Logger";
import equicordDefinePlugin, { PluginAuthor, PluginDef } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { Alerts, ChannelStore, GuildStore, MessageStore, UserStore } from "@webpack/common";
import type { ReactNode } from "react";

export const BazingaDevs = {
    bliper2: { name: "bliper2", id: 0n }
} satisfies Record<string, PluginAuthor>;

/**
 * Equicord's definePlugin with Bazinga defaults: the author defaults to the Bazinga team and the
 * "bazinga" search term is added, so searching the Plugins page for "bazinga" lists every Bazinga plugin.
 *
 * Keep `name` as the first property with a plain string value; Equicord's build reads it from the source.
 */
export function definePlugin<P extends Omit<PluginDef, "authors"> & Partial<Pick<PluginDef, "authors">>>(plugin: P & Record<PropertyKey, any>) {
    return equicordDefinePlugin({
        authors: [BazingaDevs.bliper2],
        ...plugin,
        searchTerms: [...(plugin.searchTerms ?? []), "bazinga"]
    } as P & PluginDef & Record<PropertyKey, any>);
}

export function bazingaLogger(pluginName: string) {
    return new Logger(pluginName, "#f5a524");
}

/**
 * Wraps a callback that runs outside Equicord's own error handling (DOM listeners, timers, observers),
 * so an exception is logged instead of breaking Discord.
 */
export function guard<A extends unknown[]>(logger: Logger, label: string, fn: (...args: A) => void) {
    return (...args: A) => {
        try {
            fn(...args);
        } catch (err) {
            logger.error(label, err);
        }
    };
}

export interface ConfirmOptions {
    title: string;
    body: ReactNode;
    confirmText: string;
    cancelText: string;
    /** Adds a third button. Resolves to "secondary" when it is chosen. */
    secondaryText?: string;
}

/** Shows a Discord-style dialog and resolves with the button the user chose. Closing the dialog counts as cancel. */
export function confirmDialog(options: ConfirmOptions): Promise<"confirm" | "secondary" | "cancel"> {
    return new Promise(resolve => {
        let settled = false;
        const settle = (choice: "confirm" | "secondary" | "cancel") => {
            if (settled) return;
            settled = true;
            resolve(choice);
        };

        Alerts.show({
            title: options.title,
            body: options.body,
            confirmText: options.confirmText,
            cancelText: options.cancelText,
            secondaryConfirmText: options.secondaryText,
            onConfirm: () => settle("confirm"),
            onConfirmSecondary: () => settle("secondary"),
            onCancel: () => settle("cancel"),
            onCloseCallback: () => settle("cancel")
        });
    });
}

/**
 * Checks a keyboard event against a shortcut written like "Ctrl+Shift+B".
 * Modifiers not named in the shortcut must not be held. An empty shortcut never matches.
 */
export function matchesShortcut(e: KeyboardEvent, shortcut: string) {
    const parts = shortcut.toLowerCase().split("+").map(p => p.trim()).filter(Boolean);
    const key = parts.pop();
    if (!key) return false;

    return e.key.toLowerCase() === key
        && e.ctrlKey === parts.includes("ctrl")
        && e.shiftKey === parts.includes("shift")
        && e.altKey === parts.includes("alt")
        && e.metaKey === parts.includes("meta");
}

const scriptLoads = new Map<string, Promise<void>>();

/**
 * Loads a pinned script or stylesheet from a CDN that Equicord's CSP allows (cdn.jsdelivr.net),
 * checked with Subresource Integrity so a modified file is refused. Each URL loads once.
 */
export function loadFromCdn(url: string, integrity: string): Promise<void> {
    let pending = scriptLoads.get(url);
    if (pending) return pending;

    pending = new Promise<void>((resolve, reject) => {
        const el = url.endsWith(".css")
            ? Object.assign(document.createElement("link"), { rel: "stylesheet", href: url })
            : Object.assign(document.createElement("script"), { src: url });
        el.integrity = integrity;
        el.crossOrigin = "anonymous";
        el.onload = () => resolve();
        el.onerror = () => {
            el.remove();
            // Forget the failure so a later call can retry, for example after the network comes back.
            scriptLoads.delete(url);
            reject(new Error(`Failed to load ${url}`));
        };
        document.head.append(el);
    });
    scriptLoads.set(url, pending);
    return pending;
}

export const MESSAGE_CONTENT_SELECTOR = '[id^="message-content-"]';

/**
 * Calls `onContent` for every message text element on the page now and every one Discord adds later,
 * batched once per animation frame.
 */
export function watchMessageContent(logger: Logger, onContent: (el: HTMLElement) => void) {
    const pending = new Set<Element>();
    let frame = 0;

    const flush = guard(logger, "Failed to process messages", () => {
        frame = 0;
        for (const root of pending) {
            if (!root.isConnected) continue;
            // closest() includes the element itself, so this also covers changes deep inside a message.
            const own = root.closest<HTMLElement>(MESSAGE_CONTENT_SELECTOR);
            if (own) onContent(own);
            root.querySelectorAll<HTMLElement>(MESSAGE_CONTENT_SELECTOR).forEach(onContent);
        }
        pending.clear();
    });

    const queue = (root: Element) => {
        pending.add(root);
        frame ||= requestAnimationFrame(flush);
    };

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === "characterData") {
                const parent = m.target.parentElement?.closest(MESSAGE_CONTENT_SELECTOR);
                if (parent) queue(parent);
                continue;
            }
            for (const node of m.addedNodes) {
                if (node instanceof Element) queue(node);
                else if (node.parentElement) queue(node.parentElement);
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    queue(document.body);

    return {
        /** Re-runs `onContent` on everything currently on the page, e.g. after a setting changes. */
        recheck: () => queue(document.body),
        stop: () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
            pending.clear();
        }
    };
}

/** Returns the bodies of fenced code blocks (```lang ... ```) whose language is one of `languages`. */
export function codeBlocks(content: string, languages: string[]): string[] {
    const wanted = new Set(languages.map(l => l.toLowerCase()));
    const blocks: string[] = [];
    for (const match of content.matchAll(/```([\w+-]*)\n([\s\S]*?)```/g)) {
        if (wanted.has(match[1].toLowerCase())) blocks.push(match[2]);
    }
    return blocks;
}

/** Finds the Discord message a page element belongs to. Message rows have ids like `chat-messages-<channel>-<message>`. */
export function messageFromElement(el: Element): Message | undefined {
    const match = /^chat-messages-(\d+)-(\d+)$/.exec(el.closest('[id^="chat-messages-"]')?.id ?? "");
    return match ? MessageStore.getMessage(match[1], match[2]) : undefined;
}

/** The messages of a channel that Discord has already loaded, oldest first. No requests are made. */
export function loadedMessages(channelId: string): Message[] {
    return MessageStore.getMessages(channelId)?._array ?? [];
}

const hiddenGuilds = new Map<string, Set<string>>();
let hiddenGuildsStyle: HTMLStyleElement | undefined;

/**
 * Hides servers in the server list. Several plugins can use it at once: a server is hidden while any of them
 * hides it. Pass null to stop hiding for `owner`. Only numeric ids are accepted, so nothing else reaches the CSS.
 */
export function setHiddenGuilds(owner: string, ids: Iterable<string> | null) {
    if (ids) hiddenGuilds.set(owner, new Set([...ids].filter(id => /^\d+$/.test(id))));
    else hiddenGuilds.delete(owner);

    const all = new Set([...hiddenGuilds.values()].flatMap(set => [...set]));
    if (!all.size) {
        hiddenGuildsStyle?.remove();
        hiddenGuildsStyle = undefined;
        return;
    }

    hiddenGuildsStyle ??= Object.assign(document.createElement("style"), { id: "bazinga-hidden-guilds" });
    if (!hiddenGuildsStyle.isConnected) document.head.append(hiddenGuildsStyle);
    hiddenGuildsStyle.textContent = `${[...all].map(id => `[data-list-item-id="guildsnav___${id}"]`).join(",\n")} { display: none !important; }`;
}

/** Stands in for a notification that was held back, so code that calls close() or adds listeners keeps working. */
class HeldNotification extends EventTarget {
    onclick = null;
    onclose = null;
    onerror = null;
    onshow = null;
    close() {}
}

/** Return true to hold the notification back instead of showing it. */
export type NotificationHandler = (title: string, options?: NotificationOptions) => boolean;

const notificationHandlers = new Set<NotificationHandler>();
let realNotification: typeof Notification | undefined;

/**
 * Lets a plugin hold back desktop notifications. Several plugins can do this at once, and each one only undoes
 * its own change. Returns a function that stops the handler.
 */
export function interceptNotifications(handler: NotificationHandler) {
    if (!realNotification) {
        realNotification = window.Notification;
        window.Notification = new Proxy(realNotification, {
            construct(target, args) {
                for (const h of notificationHandlers) {
                    try {
                        if (h(args[0], args[1])) return new HeldNotification();
                    } catch {
                        // A broken handler must not stop notifications.
                    }
                }
                return Reflect.construct(target, args);
            }
        });
    }
    notificationHandlers.add(handler);

    return () => {
        notificationHandlers.delete(handler);
        if (!notificationHandlers.size && realNotification) {
            window.Notification = realNotification;
            realNotification = undefined;
        }
    };
}

/** A readable name for a channel: "Server › #channel", "@person" or the group name. */
export function channelLabel(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return "Unknown channel";
    if (channel.guild_id) return `${GuildStore.getGuild(channel.guild_id)?.name ?? "Server"} › #${channel.name}`;
    if (channel.name) return channel.name;

    const recipient = UserStore.getUser(channel.recipients?.[0]);
    return recipient ? `@${recipient.username}` : "Direct message";
}
