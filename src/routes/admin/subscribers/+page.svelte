<script lang="ts">
	import { resolve } from '$app/paths';
	import Pagination from '#lib/components/Pagination.svelte';
	import type { SubscriberStatus } from '#lib/server/subscribers.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const labels: Record<SubscriberStatus, string> = {
		confirmed: 'Bekräftad',
		pending: 'Väntar på bekräftelse',
		unsubscribed: 'Avregistrerad'
	};

	const date = (value: Date) => value.toLocaleDateString('sv-SE');
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
	<h1 class="font-display text-h2 sm:text-display">Prenumeranter</h1>

	<dl class="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
		{#each Object.entries(labels) as [status, label] (status)}
			<div class="rounded-md bg-ink/5 p-4 sm:p-8">
				<dt class="text-muted">{label}</dt>
				<dd class="font-display text-h2">{data.counts[status as SubscriberStatus]}</dd>
			</div>
		{/each}
	</dl>

	{#if data.subscribers.length === 0}
		<p class="mt-16">Inga prenumeranter än.</p>
	{:else}
		<div class="mt-16 overflow-x-auto">
			<table class="w-full text-left">
				<thead>
					<tr>
						<th class="p-2 font-bold">E-post</th>
						<th class="p-2 font-bold">Anmäld</th>
						<th class="p-2 font-bold">Status</th>
						<th class="p-2 font-bold">Sedan</th>
					</tr>
				</thead>
				<tbody>
					{#each data.subscribers as subscriber (subscriber.id)}
						<tr class="odd:bg-ink/5">
							<td class="p-2 break-all">{subscriber.email}</td>
							<td class="p-2 whitespace-nowrap">{date(subscriber.createdAt)}</td>
							<td class="p-2">{labels[subscriber.status]}</td>
							<td class="p-2 whitespace-nowrap">{date(subscriber.since)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-8">
			<Pagination
				page={data.page}
				totalPages={data.totalPages}
				href={(page) =>
					resolve(`/admin/subscribers?${new URLSearchParams({ page: String(page) })}`)}
				label="Sidor med prenumeranter"
			/>
		</div>
	{/if}
</main>
