/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { openModal } from "@utils/modal";
import type { RenderModalProps } from "@vencord/discord-types";
import { Menu, Modal, showToast, Toasts, useState } from "@webpack/common";

import { definePlugin } from "../_bazinga";

let first: string | null = null;

function CompareModal({ a, b, modalProps }: { a: string; b: string; modalProps: RenderModalProps; }) {
    const [position, setPosition] = useState(50);

    return (
        <Modal {...modalProps} size="lg" title="Compare pictures" subtitle="Drag the slider. The first picture is on the left.">
            <div className="bz-compare">
                <img src={b} alt="Second picture" />
                <img src={a} alt="First picture" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} />
                <span className="bz-compare-line" style={{ left: `${position}%` }} />
            </div>
            <input
                className="bz-compare-slider"
                type="range"
                min={0}
                max={100}
                value={position}
                aria-label="Position"
                onChange={e => setPosition(Number(e.currentTarget.value))}
            />
        </Modal>
    );
}

function choose(src: string) {
    if (!first) {
        first = src;
        showToast("First picture chosen. Right-click another picture and choose Compare with the first picture.", Toasts.Type.MESSAGE);
        return;
    }
    const a = first;
    first = null;
    openModal(props => <CompareModal a={a} b={src} modalProps={props} />);
}

const items = (src: string) => {
    const list = [
        <Menu.MenuItem
            key="choose"
            id="bz-compare"
            label={first ? "Compare with the first picture" : "Compare: choose as first picture"}
            action={() => choose(src)}
        />
    ];
    if (first) list.push(<Menu.MenuItem key="cancel" id="bz-compare-cancel" label="Forget the first picture" action={() => (first = null)} />);
    return list;
};

const messageMenuPatch: NavContextMenuPatchCallback = (children, props: { itemSrc?: string; itemHref?: string; }) => {
    const src = props.itemSrc ?? props.itemHref;
    if (src && /^https:\/\//.test(src)) children.push(...items(src));
};

const imageMenuPatch: NavContextMenuPatchCallback = (children, props: { src?: string; }) => {
    if (props.src && /^https:\/\//.test(props.src)) children.push(...items(props.src));
};

export default definePlugin({
    name: "ImageCompare",
    description: "Right-click two pictures, one after the other, to see them on top of each other with a slider, like before and after.",
    tags: ["Media", "Utility"],
    searchTerms: ["compare", "before after", "slider", "diff", "images"],

    contextMenus: {
        "message": messageMenuPatch,
        "image-context": imageMenuPatch
    },

    stop() {
        first = null;
    }
});
