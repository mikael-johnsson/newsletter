<header class="flex justify-end p-4 sm:p-8">
	<!-- eslint-disable svelte/no-navigation-without-resolve -- /login route not built yet -->
	<a
		href="/login"
		class="rounded-pill bg-primary px-6 py-2 font-display text-h2 text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink sm:p-4"
	>
		Log in
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</header>

<main class="mx-auto max-w-prose px-4 py-16">
	<h1 class="font-display text-h2 sm:text-display">Juniorens nyhetsbrev</h1>
	<p class="mt-8 text-body">
		Korta nyheter och jobbannonser anpassade för din plats i karriären. Brevet kommer en gång i
		veckan - aldrig oftare.
	</p>
	<form class="mt-8 flex flex-col gap-4" action="" method="post">
		<label for="email">Din email</label>
		<input class="" type="email" id="email" name="email" required />
	</form>
</main>
