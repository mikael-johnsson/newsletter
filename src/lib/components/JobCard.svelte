<script lang="ts">
	import type { JobAd } from '#lib/server/platsbanken.ts';

	let { job }: { job: JobAd } = $props();

	const dateFormat = new Intl.DateTimeFormat('sv-SE', {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	});

	// The API sends Swedish local time without a zone; reading and formatting it as UTC keeps the day unchanged.
	function formatDate(value: string): string {
		const date = new Date(`${value}Z`);
		return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
	}

	const meta = $derived([job.employer, job.location].filter(Boolean).join(' · '));
	const published = $derived(formatDate(job.publishedAt));
	const deadline = $derived(formatDate(job.applicationDeadline));
</script>

<article class="flex items-start justify-between gap-4 rounded-md bg-ink/5 p-4 sm:p-8">
	<div class="flex flex-col gap-2">
		<h2 class="font-display text-h2">
			<a
				href={job.url}
				rel="external noopener"
				target="_blank"
				class="underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
			>
				{job.title}
			</a>
		</h2>

		{#if meta}
			<p class="font-bold">{meta}</p>
		{/if}
		{#if job.occupation}
			<p>{job.occupation}</p>
		{/if}
		{#if published || deadline}
			<p class="text-muted">
				{#if published}
					Publicerad <time datetime={job.publishedAt}>{published}</time>
				{/if}
				{#if published && deadline}·{/if}
				{#if deadline}
					Sista ansökan <time datetime={job.applicationDeadline}>{deadline}</time>
				{/if}
			</p>
		{/if}
	</div>

	<button
		type="button"
		disabled
		aria-label="Lägg till i nyhetsbrev"
		class="shrink-0 rounded-pill bg-accent px-4 py-2 font-display text-h2 text-ink disabled:opacity-50"
	>
		+
	</button>
</article>
