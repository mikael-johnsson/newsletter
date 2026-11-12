<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import ArticleCard from '#lib/components/ArticleCard.svelte';
	import CurrentNewsletter from '#lib/components/CurrentNewsletter.svelte';
	import JobCard from '#lib/components/JobCard.svelte';
	import OwnPostForm from '#lib/components/OwnPostForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const addedIds = $derived(
		new Set(data.draft.entries.flatMap((entry) => entry.jobAd?.platsbankenId ?? []))
	);
	const addedLinks = $derived(
		new Set(data.draft.entries.flatMap((entry) => (entry.type === 'ARTICLE' && entry.link) || []))
	);

	type Tab = 'jobs' | 'articles' | 'own';
	const tabs: { id: Tab; label: string }[] = [
		{ id: 'jobs', label: 'Jobb' },
		{ id: 'articles', label: 'Artiklar' },
		{ id: 'own', label: 'Eget inlägg' }
	];

	let tab = $state<Tab>('jobs');

	async function moveTab(event: KeyboardEvent) {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();
		const step = event.key === 'ArrowRight' ? 1 : -1;
		const index = tabs.findIndex(({ id }) => id === tab);
		tab = tabs[(index + step + tabs.length) % tabs.length].id;
		await tick();
		document.getElementById(`tab-${tab}`)?.focus();
	}
</script>

<header class="flex justify-end p-4 sm:p-8">
	<form method="POST" action="?/logout" use:enhance>
		<button
			class="rounded-pill bg-primary px-6 py-2 font-display text-h2 text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink sm:p-4"
		>
			Log out
		</button>
	</form>
</header>

<main class="mx-auto px-4 py-16">
	<h1 class="font-display text-h2 sm:text-display">Admin</h1>
	<section class="mt-16 grid grid-cols-1 gap-16 sm:grid-cols-2">
		<CurrentNewsletter newsletter={data.draft} />

		<section>
			{#if form?.addError || form?.removeError}
				<p role="alert" class="mb-8 font-bold">{form.addError ?? form.removeError}</p>
			{/if}

			<div role="tablist" aria-label="Innehåll" class="flex flex-wrap gap-2">
				{#each tabs as { id, label } (id)}
					<button
						type="button"
						role="tab"
						id="tab-{id}"
						aria-selected={tab === id}
						aria-controls="panel-{id}"
						tabindex={tab === id ? 0 : -1}
						onclick={() => (tab = id)}
						onkeydown={moveTab}
						class={[
							'rounded-pill px-6 py-2 font-display text-h2 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink',
							tab === id ? 'bg-ink text-paper' : 'bg-ink/5 text-ink'
						]}
					>
						{label}
					</button>
				{/each}
			</div>

			<div
				id="panel-jobs"
				role="tabpanel"
				aria-labelledby="tab-jobs"
				hidden={tab !== 'jobs'}
				class="mt-8"
			>
				{#if data.jobsError}
					<p role="alert" class="font-bold">{data.jobsError}</p>
				{:else if data.jobs.length === 0}
					<p role="status">Inga annonser hittades.</p>
				{:else}
					<ul class="flex flex-col gap-4">
						{#each data.jobs as job (job.id)}
							<li><JobCard {job} added={addedIds.has(job.id)} /></li>
						{/each}
					</ul>
				{/if}
			</div>

			<div
				id="panel-articles"
				role="tabpanel"
				aria-labelledby="tab-articles"
				hidden={tab !== 'articles'}
				class="mt-8"
			>
				{#if data.articles.failedSources.length > 0}
					<p role="alert" class="mb-8 font-bold">
						Kunde inte hämta: {data.articles.failedSources.join(', ')}.
					</p>
				{/if}
				{#if data.articles.groups.length === 0}
					<p role="status">Inga artiklar från den senaste veckan.</p>
				{:else}
					<div class="flex flex-col gap-8">
						{#each data.articles.groups as group, index (group.source)}
							<section aria-labelledby="source-{index}">
								<h2 id="source-{index}" class="font-display text-h2">{group.source}</h2>
								<ul class="mt-4 flex flex-col gap-4">
									{#each group.articles as article (article.link)}
										<li>
											<ArticleCard {article} added={addedLinks.has(article.link)} />
										</li>
									{/each}
								</ul>
							</section>
						{/each}
					</div>
				{/if}
			</div>

			<div
				id="panel-own"
				role="tabpanel"
				aria-labelledby="tab-own"
				hidden={tab !== 'own'}
				class="mt-8"
			>
				<OwnPostForm values={form?.ownPost?.values} errors={form?.ownPost?.errors} />
			</div>
		</section>
	</section>
</main>
