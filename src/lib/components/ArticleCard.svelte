<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Article } from '#lib/server/articles.ts';

	let { article, added = false }: { article: Article; added?: boolean } = $props();

	let adding = $state(false);

	const dateFormat = new Intl.DateTimeFormat('sv-SE', {
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Stockholm'
	});

	const published = $derived(dateFormat.format(new Date(article.publishedAt)));
</script>

<article class="flex items-start justify-between gap-4 rounded-md bg-ink/5 p-4 sm:p-8">
	<div class="flex min-w-0 flex-col gap-2">
		<h3 class="font-bold">
			<a
				href={article.link}
				rel="external noopener"
				target="_blank"
				class="underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
			>
				{article.title}
			</a>
		</h3>

		{#if article.summary}
			<p>{article.summary}</p>
		{/if}
		<p class="text-muted">
			Publicerad <time datetime={article.publishedAt}>{published}</time>
		</p>
	</div>

	{#if added}
		<button
			type="button"
			disabled
			aria-label="Tillagd i nyhetsbrevet"
			class="shrink-0 rounded-pill bg-accent px-4 py-2 font-display text-h2 text-ink opacity-50"
		>
			✓
		</button>
	{:else}
		<form
			method="POST"
			action="?/addArticle"
			use:enhance={() => {
				adding = true;
				return async ({ update }) => {
					await update();
					adding = false;
				};
			}}
		>
			<input type="hidden" name="link" value={article.link} />
			<button
				disabled={adding}
				aria-label="Lägg till i nyhetsbrev"
				class="shrink-0 rounded-pill bg-accent px-4 py-2 font-display text-h2 text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-50"
			>
				+
			</button>
		</form>
	{/if}
</article>
