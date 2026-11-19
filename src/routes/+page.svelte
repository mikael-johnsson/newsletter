<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<header class="flex justify-end p-4 sm:p-8">
	<a
		href={resolve('/login')}
		class="rounded-pill bg-primary px-6 py-2 font-display text-h2 text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink sm:p-4"
	>
		Log in
	</a>
</header>

<main class="mx-auto max-w-prose px-4 py-16">
	<h1 class="font-display text-h2 sm:text-display">Juniorens nyhetsbrev</h1>
	<p class="mt-8 text-body">
		Korta nyheter och jobbannonser anpassade för din plats i karriären. Brevet kommer en gång i
		veckan - aldrig oftare.
	</p>
	{#if form?.success}
		<p role="status" class="mt-8 font-bold">
			Kolla din inkorg! Vi har skickat en länk som bekräftar din prenumeration.
		</p>
	{:else}
		<form class="mt-8 flex flex-col gap-4" action="?/subscribe" method="POST" use:enhance>
			<label for="email" class="font-display text-h2">Din email</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				value={form?.email ?? ''}
				aria-invalid={form?.error ? 'true' : undefined}
				aria-describedby={form?.error ? 'email-error' : undefined}
				class="rounded-sm border-0 bg-ink/5 px-4 py-2 text-body focus:ring-4 focus:ring-ink"
			/>

			{#if form?.error}
				<p id="email-error" role="alert" class="font-bold">{form.error}</p>
			{/if}

			<button
				class="self-start rounded-pill bg-primary px-6 py-2 font-display text-h2 text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink sm:p-4"
			>
				Prenumerera
			</button>
		</form>
	{/if}
</main>
