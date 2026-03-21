import { defineConfig } from 'vite';
import javascriptObfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
    test: {
        environment: 'node',
    },
    base: './', // Ensure relative paths in build
    build: {
        outDir: 'dist',
        minify: 'terser', // Use terser for better minification
        terserOptions: {
            compress: {
                drop_console: true, // Clean up console logs
            },
        },
    },
    plugins: [
        javascriptObfuscator({
            include: [/js\/.*\.js$/], // Obfuscate all JS files in js folder
            options: {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.75,
                numbersToExpressions: true,
                simplify: true,
                stringArray: true,
                stringArrayThreshold: 0.75,
                splitStrings: true,
                stringArrayWrappersType: 'variable',
            },
        })
    ]
});
