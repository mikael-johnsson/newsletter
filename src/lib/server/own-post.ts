export const TITLE_MAX = 200;
export const TEXT_MAX = 2000;

export interface OwnPost {
	title: string;
	url: string | null;
	text: string;
}

export interface OwnPostValues {
	title: string;
	url: string;
	text: string;
}

export type OwnPostErrors = Partial<Record<keyof OwnPostValues | 'form', string>>;

export type ParsedOwnPost = { post: OwnPost } | { values: OwnPostValues; errors: OwnPostErrors };

export function isHttpUrl(value: string): boolean {
	try {
		const { protocol } = new URL(value);
		return protocol === 'http:' || protocol === 'https:';
	} catch {
		return false;
	}
}

export function parseOwnPost(formData: FormData): ParsedOwnPost {
	const field = (name: string) => {
		const value = formData.get(name);
		return typeof value === 'string' ? value.trim() : '';
	};
	const values = { title: field('title'), url: field('url'), text: field('text') };
	const errors: OwnPostErrors = {};

	if (!values.title) errors.title = 'Skriv en titel.';
	else if (values.title.length > TITLE_MAX) errors.title = `Högst ${TITLE_MAX} tecken.`;

	if (!values.text) errors.text = 'Skriv en text.';
	else if (values.text.length > TEXT_MAX) errors.text = `Högst ${TEXT_MAX} tecken.`;

	if (values.url && !isHttpUrl(values.url)) {
		errors.url = 'Länken måste börja med http:// eller https://.';
	}

	if (Object.keys(errors).length > 0) return { values, errors };
	return { post: { title: values.title, url: values.url || null, text: values.text } };
}
