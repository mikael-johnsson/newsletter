// Read by Tailwind (tailwind.config.ts) and inlined into email HTML, which cannot use CSS variables.
export const colors = {
	primary: '#FF4D2E',
	secondary: '#2B2BFF',
	accent: '#FFD23F',
	ink: '#141414',
	paper: '#FFF8EE',
	muted: '#6B6459'
};

// The Variable names come from Fontsource on the site; email clients fall back to the plain name or Arial.
export const fonts = {
	display: "'Bricolage Grotesque Variable','Bricolage Grotesque',Arial,sans-serif",
	sans: "'Inter Variable',Inter,Arial,sans-serif"
};
