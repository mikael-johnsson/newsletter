<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Draft } from '#lib/server/newsletters.ts';

	let { newsletter }: { newsletter: Draft } = $props();

	let removingId = $state<string | null>(null);
</script>

<section aria-labelledby="newsletter-subject" class="rounded-md bg-ink/5 p-4 sm:p-8">
	<p class="text-muted">Utkast</p>
	<h2 id="newsletter-subject" class="font-display text-h2">{newsletter.subject}</h2>

	{#if newsletter.entries.length === 0}
		<p class="mt-8">Inga inlägg än. Lägg till annonser med +.</p>
	{:else}
		<ol class="mt-8 flex flex-col gap-8">
			{#each newsletter.entries as entry (entry.id)}
				<li class="flex items-start justify-between gap-4">
					<div class="flex flex-col gap-2">
						<h3 class="font-bold">
							{#if entry.link}
								<a
									href={entry.link}
									rel="external noopener"
									target="_blank"
									class="underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
								>
									{entry.title}
								</a>
							{:else}
								{entry.title}
							{/if}
						</h3>
						<p class="whitespace-pre-line">{entry.summary}</p>
						<p class="text-muted">{entry.source}</p>
					</div>

					<form
						method="POST"
						action="?/removeEntry"
						use:enhance={() => {
							removingId = entry.id;
							return async ({ update }) => {
								await update();
								removingId = null;
							};
						}}
					>
						<input type="hidden" name="entryId" value={entry.id} />
						<button
							disabled={removingId === entry.id}
							aria-label="Ta bort {entry.title} från nyhetsbrevet"
							class="shrink-0 rounded-pill bg-accent px-4 py-2 font-display text-h2 text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-50"
						>
							−
						</button>
					</form>
				</li>
			{/each}
		</ol>
	{/if}
</section>
