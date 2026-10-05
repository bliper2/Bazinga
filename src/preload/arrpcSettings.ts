/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { contextBridge, ipcRenderer } from "electron/renderer";

contextBridge.exposeInMainWorld("VesktopArRPCNative", {
    download: () => ipcRenderer.invoke("arrpc-download") as Promise<{ ok: boolean; error?: string }>,
    onStatusUpdate(callback: (status: unknown) => void) {
        ipcRenderer.on("arrpc-status-update", (_, status: unknown) => callback(status));
    }
});
