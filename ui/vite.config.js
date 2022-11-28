import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'

export default defineConfig({
	resolve: {
		alias: {
			'@': `${path.resolve(__dirname, 'src')}`,
		},
	},

	build: {
		minify: true,
	},

	plugins: [
		vue(),
	],

	server: {
		port: 8090,
		proxy: {
			"^/socket.io": {
				target: "http://localhost:8091",
        ws: true
			},
    }
	},
})
