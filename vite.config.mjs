import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { visualizer } from "rollup-plugin-visualizer";

const analyze = process.env.ANALYZE === "true";

export default defineConfig({
    assetsInclude: ["**/*.glb", "**/*.hdr", "**/*.exr"],

    plugins: [
        viteSingleFile({
            removeViteModuleLoader: true,
        }),

        // ...(analyze
        //     ? [
        //           visualizer({
        //               filename: "dist/bundle-stats.html",
        //               template: "treemap",
        //               open: true,
        //               gzipSize: true,
        //               brotliSize: true,
        //           }),
        //       ]
        //     : []),
    ],

    build: {
        minify: "oxc",
        target: "esnext",
        cssCodeSplit: false,
    },
});
