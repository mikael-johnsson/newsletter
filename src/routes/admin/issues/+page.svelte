<script lang="ts">
	import { resolve } from '$app/paths';
	import Pagination from '#lib/components/Pagination.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<header class="flex justify-end p-4 sm:p-8">
	<a
		href={resolve('/admin')}
		class="rounded-pill bg-primary px-6 py-2 font-display text-h2 text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink sm:p-4"
	>
		Admin
	</a>
</header>

<main class="mx-auto px-4 py-16">
	<h1 class="font-display text-h2 sm:text-display">Tidigare utskick</h1>

	{#if data.issues.length === 0}
		<p class="mt-16">Inga utskick än.</p>
	{:else}
		<ul class="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.issues as issue (issue.id)}
				<li class="rounded-md bg-ink/5 p-4 sm:p-8">
					<h2 class="font-display text-h2 break-words">{issue.subject}</h2>
					{#if issue.sentAt}
						<p class="mt-4 text-muted">Skickat {issue.sentAt.toLocaleDateString('sv-SE')}</p>
					{/if}
					{#if issue.entries.length === 0}
						<p class="text-muted">0 inlägg</p>
					{:else}
						<details>
							<summary
								class="text-muted hover:cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
							>
								{issue.entries.length} inlägg
							</summary>
							<ol class="mt-4 flex flex-col gap-4">
								{#each issue.entries as entry (entry.id)}
									<li class="flex flex-col gap-1">
										<h3 class="font-bold break-words">
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
										<p class="text-muted">{entry.source}</p>
									</li>
								{/each}
							</ol>
						</details>
					{/if}
				</li>
			{/each}
		</ul>

		<div class="mt-8">
			<Pagination
				page={data.page}
				totalPages={data.totalPages}
				href={(page) => resolve(`/admin/issues?${new URLSearchParams({ page: String(page) })}`)}
				label="Sidor med utskick"
			/>
		</div>
	{/if}
</main>
