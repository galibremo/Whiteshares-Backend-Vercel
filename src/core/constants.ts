export const sessionTimeout = 1000 * 60 * 60 * 5; // 30 minutes in milliseconds
export const csrfTimeout = 1000 * 60 * 60; // 5 seconds in milliseconds

export const blackListDomains = [
	".vercel.app",
	".herokuapp.com",
	".netlify.app",
	".render.com",
	".onrender.com",
	".surge.sh",
	".firebaseapp.com",
	".web.app",
	".pages.dev", // Cloudflare Pages
	".workers.dev", // Cloudflare Workers
	".glitch.me",
	".now.sh", // old Vercel domains
	".github.io",
	".gitlab.io",
	".bitbucket.io",
	".stackblitz.io",
	".repl.co",
	".supabase.co",
	".railway.app",
	".ngrok-free.app"
];