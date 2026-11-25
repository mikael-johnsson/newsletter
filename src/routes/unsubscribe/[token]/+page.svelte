<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<main class="mx-auto max-w-prose px-4 py-16">
	{#if form?.unsubscribed}
		<h1 class="font-display text-h2 sm:text-display">Du får inga fler brev</h1>
		<p class="mt-8 text-body">
			Ångrar du dig? <a href={resolve('/')} class="underline">Anmäl dig igen</a>.
		</p>
	{:else if data.known && !form}
		<h1 class="font-display text-h2 sm:text-display">Vill du avsluta prenumerationen?</h1>
		<form class="mt-8" method="POST" use:enhance>
			<button
				class="rounded-pill bg-primary px-6 py-2 font-display text-h2 text-ink hover:cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink sm:p-4"
			>
				Avsluta prenumerationen
			</button>
		</form>
	{:else}
		<h1 class="font-display text-h2 sm:text-display">Länken fungerar inte</h1>
		<p class="mt-8 text-body">
			Den kan vara felskriven eller för gammal.
			<a href={resolve('/')} class="underline">Till startsidan</a>
		</p>
	{/if}
</main>
