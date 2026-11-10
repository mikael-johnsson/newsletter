<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { OwnPostErrors, OwnPostValues } from '#lib/server/own-post.ts';

	let { values, errors }: { values?: OwnPostValues; errors?: OwnPostErrors } = $props();

	let title = $state(untrack(() => values?.title ?? ''));
	let url = $state(untrack(() => values?.url ?? ''));
	let text = $state(untrack(() => values?.text ?? ''));
	let submitting = $state(false);

	const previewHref = $derived(/^https?:\/\/\S+$/i.test(url.trim()) ? url.trim() : null);

	const inputClass = 'rounded-sm border-0 bg-ink/5 px-4 py-2 text-body focus:ring-4 focus:ring-ink';
</script>

<form
	method="POST"
	action="?/addOwnPost"
	class="flex flex-col gap-4"
	use:enhance={() => {
		submitting = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				title = '';
				url = '';
				text = '';
			}
			submitting = false;
		};
	}}
>
	<label for="own-title" class="font-display text-h2">Titel</label>
	<input
		id="own-title"
		name="title"
		required
		maxlength="200"
		bind:value={title}
		aria-invalid={errors?.title ? 'true' : undefined}
		aria-describedby={errors?.title ? 'own-title-error' : undefined}
		class={inputClass}
	/>
	{#if errors?.title}<p id="own-title-error" class="font-bold">{errors.title}</p>{/if}

	<label for="own-url">Länk (valfri)</label>
	<input
		id="own-url"
		name="url"
		type="url"
		placeholder="https://"
		bind:value={url}
		aria-invalid={errors?.url ? 'true' : undefined}
		aria-describedby={errors?.url ? 'own-url-error' : undefined}
		class={inputClass}
	/>
	{#if errors?.url}<p id="own-url-error" class="font-bold">{errors.url}</p>{/if}

	<label for="own-text" class="font-display text-h2">Text</label>
	<textarea
		id="own-text"
		name="text"
		required
		maxlength="2000"
		rows="6"
		bind:value={text}
		aria-invalid={errors?.text ? 'true' : undefined}
		aria-describedby={errors?.text ? 'own-text-error' : undefined}
		class={inputClass}></textarea>
	{#if errors?.text}<p id="own-text-error" class="font-bold">{errors.text}</p>{/if}

	{#if errors?.form}<p role="alert" class="font-bold">{errors.form}</p>{/if}

	<article
		aria-label="Förhandsvisning"
		class="mt-4 flex items-start justify-between gap-4 rounded-md bg-ink/5 p-4 sm:p-8"
	>
		<div class="flex flex-col gap-2">
			<h2 class="font-display text-h2">
				{#if !title.trim()}
					<span class="text-muted">Din titel</span>
				{:else if previewHref}
					<a
						href={previewHref}
						rel="external noopener"
						target="_blank"
						class="underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
					>
						{title}
					</a>
				{:else}
					{title}
				{/if}
			</h2>
			<p class={['whitespace-pre-line', !text.trim() && 'text-muted']}>
				{text.trim() ? text : 'Din text'}
			</p>
		</div>

		<button
			disabled={submitting}
			aria-label="Lägg till i nyhetsbrev"
			class="shrink-0 rounded-pill bg-accent px-4 py-2 font-display text-h2 text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-50"
		>
			+
		</button>
	</article>
</form>
