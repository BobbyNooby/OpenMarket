<script lang="ts">
	import { Input, ItemButton } from '$lib/shared/components';

	let { data } = $props();

	let searchQuery = $state('');

	// Filter items and currencies based on search
	const filteredItems = $derived(
		(data.items || []).filter((item: any) =>
			searchQuery.trim() ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
		)
	);

	const filteredCurrencies = $derived(
		(data.currencies || []).filter((currency: any) =>
			searchQuery.trim() ? currency.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
		)
	);
</script>

<div class="min-h-screen text-[var(--color-text)]">
	<!-- Header -->
	<div class="bg-[var(--color-surface)] py-8 shadow-[var(--shadow-sm)]">
		<div class="mx-auto max-w-7xl px-8">
			<h1 class="text-4xl font-bold text-[var(--color-primary)]">Items & Currencies</h1>
			<p class="mt-2 text-[var(--color-textSecondary)]">
				Browse all tradeable items and currencies
			</p>

			<!-- Search -->
			<div class="mt-6 max-w-md">
				<Input type="search" placeholder="Search..." bind:value={searchQuery} />
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="mx-auto max-w-7xl px-8 py-8">
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
			<!-- Items Section -->
			<div>
				<h2 class="mb-4 text-2xl font-bold text-[var(--color-text)]">
					Items ({filteredItems.length})
				</h2>
				{#if filteredItems.length === 0}
					<p class="text-[var(--color-textSecondary)]">No items found.</p>
				{:else}
					<div class="flex flex-wrap gap-2">
						{#each filteredItems as item}
							<ItemButton
								name={item.name}
								type="item"
								description={item.description}
								image_url={item.image_url}
								item_id={item.id}
								slug={item.slug}
							/>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Currencies Section -->
			<div>
				<h2 class="mb-4 text-2xl font-bold text-[var(--color-text)]">
					Currencies ({filteredCurrencies.length})
				</h2>
				{#if filteredCurrencies.length === 0}
					<p class="text-[var(--color-textSecondary)]">No currencies found.</p>
				{:else}
					<div class="flex flex-wrap gap-2">
						{#each filteredCurrencies as currency}
							<ItemButton
								name={currency.name}
								type="currency"
								description={currency.description}
								image_url={currency.image_url}
								item_id={currency.id}
								slug={currency.slug}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
