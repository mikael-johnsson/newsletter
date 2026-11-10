<script lang="ts">
	import { enhance } from '$app/forms';
	import CurrentNewsletter from '#lib/components/CurrentNewsletter.svelte';
	import JobCard from '#lib/components/JobCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const addedIds = $derived(
		new Set(data.draft.entries.flatMap((entry) => entry.jobAd?.platsbankenId ?? []))
	);
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
	<p class="mt-8 text-body">You're logged in. Issues and subscribers will live here.</p>
	<section class="mt-16 grid grid-cols-1 gap-16 sm:grid-cols-2">
		<CurrentNewsletter newsletter={data.draft} />

		<section>
			{#if form?.addError || form?.removeError}
				<p role="alert" class="mb-8 font-bold">{form.addError ?? form.removeError}</p>
			{/if}

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
		</section>
	</section>
</main>
