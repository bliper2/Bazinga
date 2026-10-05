import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// The Rich Presence helper (about 100 MB) is normally not packed: Bazinga downloads it from the release when it is
// first wanted (src/main/arrpc/download.ts). Set BAZINGA_BUNDLE_ARRPC=1 to pack it for an offline install.
async function copyArRPCBinaries(context) {
    if (process.env.BAZINGA_BUNDLE_ARRPC !== "1") {
        console.log("Not packing the arRPC binary (set BAZINGA_BUNDLE_ARRPC=1 to include it)");
        return;
    }

    const { electronPlatformName, arch, appOutDir } = context;

    // map electron-builder arch enum to string
    // 0 = ia32, 1 = x64, 2 = armv7l, 3 = arm64
    const archMap = { 0: "ia32", 1: "x64", 2: "armv7l", 3: "arm64" };
    const archString = typeof arch === "number" ? archMap[arch] : arch;

    if (archString === "universal" || archString === undefined) {
        console.log("Skipping arRPC copy for universal build (already merged from x64/arm64)");
        return;
    }

    const resourcesDir = join(appOutDir, electronPlatformName === "darwin" ? `${context.packager.appInfo.productFilename}.app/Contents/Resources` : "resources");
    const arrpcDestDir = join(resourcesDir, "arrpc");

    mkdirSync(arrpcDestDir, { recursive: true });

    const arrpcSourceDir = join(process.cwd(), "static", "dist");
    const platformName = electronPlatformName === "win32" ? "windows" : electronPlatformName;

    let binaryName = `arrpc-${platformName}-${archString}`;
    if (electronPlatformName === "win32") binaryName += ".exe";

    const binarySourcePath = join(arrpcSourceDir, binaryName);
    if (existsSync(binarySourcePath)) {
        const destBinaryName = electronPlatformName === "win32" ? "arrpc.exe" : "arrpc";
        const binaryDestPath = join(arrpcDestDir, destBinaryName);
        console.log(`Copying arRPC binary: ${binaryName} -> ${destBinaryName}...`);
        cpSync(binarySourcePath, binaryDestPath);
    } else {
        console.warn(`Warning: arRPC binary not found: ${binarySourcePath}`);
        console.warn("Run 'bun compileArrpc' to build arRPC binaries");
    }
}

export default async function afterPack(context) {
    await copyArRPCBinaries(context);
}
