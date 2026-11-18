const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORM_CONTENT_TYPES = [
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain',
	'application/x-sveltekit-formdata'
];
// Mail clients send one-click unsubscribe (RFC 8058) as a form POST without our Origin.
const ONE_CLICK_UNSUBSCRIBE = /^\/unsubscribe\/[^/]+$/;

// Same rule as SvelteKit's own check (turned off in vite.config.ts), except for the unsubscribe route.
export function isForbiddenCrossSiteRequest(request: Request, url: URL): boolean {
	const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
	return (
		MUTATING_METHODS.has(request.method) &&
		(!contentType || FORM_CONTENT_TYPES.includes(contentType)) &&
		request.headers.get('origin') !== url.origin &&
		!ONE_CLICK_UNSUBSCRIBE.test(url.pathname)
	);
}
