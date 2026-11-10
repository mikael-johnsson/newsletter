import { describe, expect, it } from 'vitest';
import { parseOwnPost } from './own-post.ts';

function formData(fields: Record<string, string>) {
	const data = new FormData();
	for (const [name, value] of Object.entries(fields)) data.set(name, value);
	return data;
}

describe('parseOwnPost', () => {
	it('accepts a post with a link', () => {
		expect(
			parseOwnPost(formData({ title: ' Veckans tips ', url: 'https://example.se', text: 'Hej!' }))
		).toEqual({ post: { title: 'Veckans tips', url: 'https://example.se', text: 'Hej!' } });
	});

	it('treats an empty link as no link', () => {
		expect(parseOwnPost(formData({ title: 'Tips', url: '  ', text: 'Hej!' }))).toEqual({
			post: { title: 'Tips', url: null, text: 'Hej!' }
		});
	});

	it('requires a title and a text, and keeps what was typed', () => {
		const result = parseOwnPost(formData({ title: '', url: 'https://example.se', text: ' ' }));

		expect(result).toMatchObject({
			values: { title: '', url: 'https://example.se', text: '' },
			errors: { title: expect.any(String), text: expect.any(String) }
		});
	});

	it('rejects links that are not http or https', () => {
		for (const url of ['javascript:alert(1)', 'ftp://example.se', 'example.se']) {
			const result = parseOwnPost(formData({ title: 'Tips', url, text: 'Hej!' }));
			expect(result, url).toMatchObject({ errors: { url: expect.any(String) } });
		}
	});

	it('rejects a title that is too long', () => {
		const result = parseOwnPost(formData({ title: 'a'.repeat(201), text: 'Hej!' }));

		expect(result).toMatchObject({ errors: { title: expect.any(String) } });
	});
});
