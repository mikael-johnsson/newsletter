<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { pageRange } from '#lib/pagination.ts';

	let {
		page,
		totalPages,
		href,
		label
	}: {
		page: number;
		totalPages: number;
		href: (page: number) => ResolvedPathname;
		label: string;
	} = $props();

	const items = $derived(pageRange(page, totalPages));

	const link =
		'block rounded-pill px-4 py-2 font-bold focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink';
</script>

{#if totalPages > 1}
	<nav aria-label={label}>
		<ul class="flex flex-wrap items-center gap-2">
			{#if page > 1}
				<li><a href={href(page - 1)} class={[link, 'bg-ink/5']}>Föregående</a></li>
			{/if}

			{#each items as item, index (item === 'gap' ? `gap-${index}` : item)}
				<li>
					{#if item === 'gap'}
						<span class="px-2 text-muted">…</span>
					{:else}
						<a
							href={href(item)}
							aria-label="Sida {item}"
							aria-current={item === page ? 'page' : undefined}
							class={[link, item === page ? 'bg-ink text-paper' : 'bg-ink/5']}
						>
							{item}
						</a>
					{/if}
				</li>
			{/each}

			{#if page < totalPages}
				<li><a href={href(page + 1)} class={[link, 'bg-ink/5']}>Nästa</a></li>
			{/if}
		</ul>
	</nav>
{/if}
