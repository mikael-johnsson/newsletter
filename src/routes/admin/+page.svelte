<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ArticleCard from '#lib/components/ArticleCard.svelte';
	import CurrentNewsletter from '#lib/components/CurrentNewsletter.svelte';
	import JobCard from '#lib/components/JobCard.svelte';
	import OwnPostForm from '#lib/components/OwnPostForm.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
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
	let sendingTest = $state(false);

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

<header class="flex flex-wrap items-center justify-end gap-4 p-4 sm:p-8">
	<a
		href={resolve('/admin/subscribers')}
		class="rounded-pill bg-ink/5 px-6 py-2 font-display text-h2 text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink sm:p-4"
	>
		Prenumeranter
	</a>
	<form method="POST" action="?/logout" use:enhance>
		<button
			class="rounded-pill bg-primary px-6 py-2 font-display text-h2 text-ink hover:cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink sm:p-4"
		>
			Sign out
		</button>
	</form>
</header>

<main class="mx-auto px-4 py-16">
	<h1 class="font-display text-h2 sm:text-display">Admin</h1>
	<section class="mt-16 grid grid-cols-1 gap-16 sm:grid-cols-2">
		<div class="flex flex-col gap-8">
			<CurrentNewsletter newsletter={data.draft} />

			<form
				method="POST"
				action="?/sendTest"
				use:enhance={() => {
					sendingTest = true;
					return async ({ update }) => {
						await update();
						sendingTest = false;
					};
				}}
				class="flex flex-col items-start gap-4"
			>
				<button
					disabled={sendingTest || data.draft.entries.length === 0}
					class="rounded-pill bg-ink px-6 py-2 font-bold text-paper hover:cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-50"
				>
					{sendingTest ? 'Skickar…' : 'Skicka testmejl'}
				</button>
				{#if form?.testSent}
					<p role="status">{form.testSent}</p>
				{:else if form?.testError}
					<p role="alert" class="font-bold">{form.testError}</p>
				{/if}
			</form>

			{#if data.outgoing}
				<p role="status" class="font-bold">
					{data.outgoing.subject}
					{data.outgoing.status === 'SENDING'
						? `skickas nu, ${data.outgoing._count.deliveries} klara.`
						: 'skickas vid nästa utskick.'}
				</p>
			{:else if data.draft.entries.length > 0}
				<details class="flex flex-col items-start gap-4">
					<summary
						class="w-fit cursor-pointer rounded-pill bg-primary px-6 py-2 font-bold text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
					>
						Skicka till alla
					</summary>
					<form method="POST" action="?/schedule" use:enhance class="mt-4 flex flex-col gap-4">
						<p>Brevet går till alla bekräftade prenumeranter och kan inte ångras.</p>
						<button
							class="w-fit rounded-pill bg-ink px-6 py-2 font-bold text-paper hover:cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
						>
							Ja, skicka till alla
						</button>
					</form>
				</details>
			{/if}
			{#if form?.scheduleError}
				<p role="alert" class="font-bold">{form.scheduleError}</p>
			{/if}
		</div>

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
							'rounded-pill px-6 py-2 font-display text-h2 hover:cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink',
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
				<form method="GET" role="search" class="mb-8 flex flex-wrap items-end gap-4">
					<label class="flex grow flex-col gap-2">
						<span class="font-bold">Sök jobb</span>
						<input
							type="search"
							name="q"
							value={data.jobsQuery}
							maxlength="100"
							class="rounded-sm border-0 bg-ink/5 px-4 py-2 text-body focus:ring-4 focus:ring-ink"
						/>
					</label>
					<button
						class="rounded-pill bg-ink px-6 py-2 font-bold text-paper hover:cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
					>
						Sök
					</button>
				</form>

				{#if data.jobsError}
					<p role="alert" class="font-bold">{data.jobsError}</p>
				{:else if data.jobs.length === 0}
					<p role="status">Inga annonser hittades för ”{data.jobsQuery}”.</p>
				{:else}
					<ul class="flex flex-col gap-4">
						{#each data.jobs as job (job.id)}
							<li><JobCard {job} added={addedIds.has(job.id)} /></li>
						{/each}
					</ul>
					<div class="mt-8">
						<Pagination
							page={data.jobsPage}
							totalPages={data.jobsTotalPages}
							href={(page) =>
								resolve(`/admin?${new URLSearchParams({ q: data.jobsQuery, page: String(page) })}`)}
							label="Sidor med jobbannonser"
						/>
					</div>
				{/if}
			</div>

			<div
				id="panel-articles"
				role="tabpanel"
				aria-labelledby="tab-articles"
				hidden={tab !== 'articles'}
				class="mt-8"
			>
				{#await data.articles}
					<p role="status">Hämtar artiklar…</p>
				{:then articles}
					{#if articles.failedSources.length > 0}
						<p role="alert" class="mb-8 font-bold">
							Kunde inte hämta: {articles.failedSources.join(', ')}.
						</p>
					{/if}
					{#if articles.groups.length === 0}
						<p role="status">Inga artiklar från den senaste veckan.</p>
					{:else}
						<div class="flex flex-col gap-8">
							{#each articles.groups as group, index (group.source)}
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
				{/await}
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
