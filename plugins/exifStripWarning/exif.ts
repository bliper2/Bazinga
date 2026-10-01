/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Finds and removes GPS location data in JPEG and PNG files, by editing bytes in place.
// The image itself is never re-encoded, so quality and orientation stay the same.

const GPS_IFD_POINTER = 0x8825;
const TYPE_SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8, 11: 4, 12: 8 };

/** Returns the byte offset of a TIFF header (the start of EXIF data) inside the file, or -1. */
function findTiffHeader(bytes: Uint8Array): number {
    // JPEG: walk the segments looking for APP1 "Exif\0\0".
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        let pos = 2;
        while (pos + 4 < bytes.length && bytes[pos] === 0xff) {
            const marker = bytes[pos + 1];
            const length = (bytes[pos + 2] << 8) | bytes[pos + 3];
            if (marker === 0xda) break; // Start of image data, no more metadata.
            if (marker === 0xe1 && String.fromCharCode(...bytes.subarray(pos + 4, pos + 10)) === "Exif\0\0") {
                return pos + 10;
            }
            pos += 2 + length;
        }
        return -1;
    }

    // PNG: look for an eXIf chunk.
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        let pos = 8;
        while (pos + 8 < bytes.length) {
            const length = new DataView(bytes.buffer, bytes.byteOffset + pos).getUint32(0);
            const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
            if (type === "eXIf") return pos + 8;
            if (type === "IDAT" || type === "IEND") break;
            pos += 12 + length;
        }
    }
    return -1;
}

interface GpsLocation {
    tiff: number;
    littleEndian: boolean;
    /** Offset of the GPS IFD, relative to the TIFF header. */
    gpsIfd: number;
}

function findGps(bytes: Uint8Array): GpsLocation | null {
    const tiff = findTiffHeader(bytes);
    if (tiff < 0 || tiff + 8 > bytes.length) return null;

    const view = new DataView(bytes.buffer, bytes.byteOffset);
    const littleEndian = bytes[tiff] === 0x49; // "II" = little endian, "MM" = big endian.
    const ifd0 = view.getUint32(tiff + 4, littleEndian);
    if (tiff + ifd0 + 2 > bytes.length) return null;

    const count = view.getUint16(tiff + ifd0, littleEndian);
    for (let i = 0; i < count; i++) {
        const entry = tiff + ifd0 + 2 + i * 12;
        if (entry + 12 > bytes.length) return null;
        if (view.getUint16(entry, littleEndian) === GPS_IFD_POINTER) {
            const gpsIfd = view.getUint32(entry + 8, littleEndian);
            if (tiff + gpsIfd + 2 > bytes.length) return null;
            return { tiff, littleEndian, gpsIfd };
        }
    }
    return null;
}

/** True when the file contains a GPS block with at least one entry. */
export function hasGps(bytes: Uint8Array) {
    const gps = findGps(bytes);
    if (!gps) return false;
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    return view.getUint16(gps.tiff + gps.gpsIfd, gps.littleEndian) > 0;
}

/**
 * Zeroes every GPS value and empties the GPS block. Returns a new array; the input is not changed.
 * PNG eXIf chunks carry a CRC, so for PNG the whole chunk is removed instead.
 */
export function stripGps(input: Uint8Array): Uint8Array {
    const bytes = input.slice();
    const gps = findGps(bytes);
    if (!gps) return bytes;

    if (bytes[0] === 0x89) return removePngExif(bytes);

    const view = new DataView(bytes.buffer, bytes.byteOffset);
    const { tiff, littleEndian, gpsIfd } = gps;
    const count = view.getUint16(tiff + gpsIfd, littleEndian);

    for (let i = 0; i < count; i++) {
        const entry = tiff + gpsIfd + 2 + i * 12;
        if (entry + 12 > bytes.length) break;
        const size = (TYPE_SIZES[view.getUint16(entry + 2, littleEndian)] ?? 1) * view.getUint32(entry + 4, littleEndian);
        if (size <= 4) {
            bytes.fill(0, entry + 8, entry + 12);
        } else {
            const start = tiff + view.getUint32(entry + 8, littleEndian);
            bytes.fill(0, Math.min(start, bytes.length), Math.min(start + size, bytes.length));
        }
        bytes.fill(0, entry, entry + 8);
    }
    view.setUint16(tiff + gpsIfd, 0, littleEndian);
    return bytes;
}

function removePngExif(bytes: Uint8Array): Uint8Array {
    const start = findTiffHeader(bytes) - 8;
    const length = new DataView(bytes.buffer, bytes.byteOffset + start).getUint32(0);
    const out = new Uint8Array(bytes.length - (12 + length));
    out.set(bytes.subarray(0, start));
    out.set(bytes.subarray(start + 12 + length), start);
    return out;
}
