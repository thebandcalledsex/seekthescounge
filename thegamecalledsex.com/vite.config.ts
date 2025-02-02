import { defineConfig } from "vite";

export default defineConfig({
    server: {
        open: true,  // Opens browser on start
        port: 5500,  // Ensure this port is free
        watch: {
            usePolling: true, // Ensures file changes are detected
        },
    },
});
