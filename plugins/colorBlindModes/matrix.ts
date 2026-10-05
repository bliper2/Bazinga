/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type Matrix = number[][];

export const MODES = {
    none: "Off",
    "help-protanopia": "Help: red-weak (protanopia)",
    "help-deuteranopia": "Help: green-weak (deuteranopia)",
    "help-tritanopia": "Help: blue-weak (tritanopia)",
    "simulate-protanopia": "See as red-weak",
    "simulate-deuteranopia": "See as green-weak",
    "simulate-tritanopia": "See as blue-weak",
    "simulate-grayscale": "See in grayscale"
} as const;

export type Mode = keyof typeof MODES;

const IDENTITY: Matrix = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
];

// How the three kinds of color blindness change what is seen (Machado, Oliveira and Fernandes, 2009, full severity).
const SIMULATE: Record<string, Matrix> = {
    protanopia: [
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998]
    ],
    deuteranopia: [
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.01182, 0.04294, 0.968881]
    ],
    tritanopia: [
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.3039]
    ],
    grayscale: [
        [0.2126, 0.7152, 0.0722],
        [0.2126, 0.7152, 0.0722],
        [0.2126, 0.7152, 0.0722]
    ]
};

// Where the colors a person cannot tell apart are moved to, so they differ in a color they can see.
const SHIFT: Record<string, Matrix> = {
    protanopia: [
        [0, 0, 0],
        [0.7, 1, 0],
        [0.7, 0, 1]
    ],
    deuteranopia: [
        [1, 0.7, 0],
        [0, 0, 0],
        [0, 0.7, 1]
    ],
    tritanopia: [
        [1, 0, 0.7],
        [0, 1, 0.7],
        [0, 0, 0]
    ]
};

const multiply = (a: Matrix, b: Matrix): Matrix => a.map(row => b[0].map((_, col) => row.reduce((sum, value, k) => sum + value * b[k][col], 0)));
const subtract = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => row.map((value, j) => value - b[i][j]));
const add = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => row.map((value, j) => value + b[i][j]));

/** The 3 by 3 color matrix for a mode. "Help" modes use daltonization: original + shift × (original − simulated). */
export function colorMatrix(mode: Mode): Matrix {
    if (mode === "none") return IDENTITY;
    const [kind, type] = mode.split("-");
    if (kind === "simulate") return SIMULATE[type];
    return add(IDENTITY, multiply(SHIFT[type], subtract(IDENTITY, SIMULATE[type])));
}

/** Values for an SVG feColorMatrix (4 by 5, rows red, green, blue, alpha). */
export function svgMatrixValues(mode: Mode) {
    return colorMatrix(mode)
        .map(row => [...row.map(value => value.toFixed(5)), "0", "0"].join(" "))
        .concat("0 0 0 1 0")
        .join("  ");
}
