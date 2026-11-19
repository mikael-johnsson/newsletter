<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<main class="mx-auto max-w-prose px-4 py-16">
	{#if data.confirmed}
		<h1 class="font-display text-h2 sm:text-display">Du är nu prenumerant</h1>
		<p class="mt-8 text-body">Nästa brev landar i din inkorg.</p>
	{:else}
		<h1 class="font-display text-h2 sm:text-display">Länken fungerar inte</h1>
		<p class="mt-8 text-body">
			Den kan vara felskriven eller för gammal.
			<a href={resolve('/')} class="underline">Anmäl dig igen</a> så skickar vi en ny.
		</p>
	{/if}
</main>
