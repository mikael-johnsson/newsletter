import { describe, expect, it } from 'vitest';
import { pageRange, parsePage } from './pagination.ts';

describe('pageRange', () => {
	it('shows the first, last and neighbouring pages with gaps between', () => {
		expect(pageRange(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
	});

	it('shows a single skipped page instead of a gap', () => {
		expect(pageRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it('starts without a gap on the first page', () => {
		expect(pageRange(1, 20)).toEqual([1, 2, 'gap', 20]);
	});

	it('ends without a gap on the last page', () => {
		expect(pageRange(20, 20)).toEqual([1, 'gap', 19, 20]);
	});

	it('shows every page when there are only a few', () => {
		expect(pageRange(1, 1)).toEqual([1]);
		expect(pageRange(2, 3)).toEqual([1, 2, 3]);
	});
});

describe('parsePage', () => {
	it('reads a page number from the query string', () => {
		expect(parsePage('3', 10)).toBe(3);
	});

	it('falls back to the first page for a missing or invalid value', () => {
		for (const value of [null, '', '0', '-2', '1.5', 'abc']) {
			expect(parsePage(value, 10)).toBe(1);
		}
	});

	it('stops at the last page', () => {
		expect(parsePage('500', 10)).toBe(10);
	});
});
