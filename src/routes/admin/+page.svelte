<script lang="ts">
	import { enhance } from '$app/forms';
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

<main class="mx-auto max-w-prose px-4 py-16">
	<h1 class="font-display text-h2 sm:text-display">Admin</h1>
	<p class="mt-8 text-body">You're logged in. Issues and subscribers will live here.</p>
</main>
