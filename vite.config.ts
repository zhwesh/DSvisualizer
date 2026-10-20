import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 构建时将 JS/CSS 内联进 index.html，使 dist/index.html 可通过 file:// 直接双击打开
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
  base: './',
})
