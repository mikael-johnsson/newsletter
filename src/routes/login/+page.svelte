<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<main class="mx-auto max-w-prose px-4 py-16">
	<h1 class="font-display text-h2 sm:text-display">Log in</h1>

	<form method="POST" use:enhance class="mt-8 flex flex-col gap-4">
		<label for="password" class="font-display text-h2">Password</label>
		<input
			id="password"
			name="password"
			type="password"
			autocomplete="current-password"
			required
			class="rounded-sm border-0 bg-ink/5 px-4 py-2 text-body focus:ring-4 focus:ring-ink"
		/>

		{#if form?.error}
			<p role="alert" class="font-bold">{form.error}</p>
		{/if}

		<button
			class="self-start rounded-pill bg-primary px-6 py-2 font-display text-h2 text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink sm:p-4"
		>
			Log in
		</button>
	</form>
</main>
