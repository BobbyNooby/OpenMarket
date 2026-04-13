<script lang="ts">
	import { ItemButton } from '$lib/components';
	import { Input } from '$lib/components/ui/input';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	let searchQuery = $state('');

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

<svelte:head>
	<title>Items & Currencies · {data.siteConfig?.site_name ?? 'OpenMarket'}</title>
	<meta name="description" content="Browse all tradeable items and currencies" />
</svelte:head>

<div class="min-h-screen text-foreground">
	<div class="bg-card py-8 shadow-sm">
		<div class="mx-auto max-w-7xl px-8">
			<h1 class="text-4xl font-bold text-primary">{m.items_title()}</h1>
			<p class="mt-2 text-muted-foreground">
				{m.items_subtitle()}
			</p>

			<div class="mt-6 max-w-md">
				<Input type="search" placeholder={m.items_search_placeholder()} bind:value={searchQuery} />
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-7xl px-8 py-8">
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
			<div>
				<h2 class="mb-4 text-2xl font-bold text-foreground">
					{m.items_section_items({ count: filteredItems.length })}
				</h2>
				{#if filteredItems.length === 0}
					<p class="text-muted-foreground">{m.items_no_items()}</p>
				{:else}
					<div class="flex flex-wrap gap-2">
						{#each filteredItems as item}
							<ItemButton
								name={item.name}
								type="item"
								description={item.description ?? undefined}
								image_url={item.image_url ?? undefined}
								item_id={item.id}
								slug={item.slug}
							/>
						{/each}
					</div>
				{/if}
			</div>

			<div>
				<h2 class="mb-4 text-2xl font-bold text-foreground">
					{m.items_section_currencies({ count: filteredCurrencies.length })}
				</h2>
				{#if filteredCurrencies.length === 0}
					<p class="text-muted-foreground">{m.items_no_currencies()}</p>
				{:else}
					<div class="flex flex-wrap gap-2">
						{#each filteredCurrencies as currency}
							<ItemButton
								name={currency.name}
								type="currency"
								description={currency.description ?? undefined}
								image_url={currency.image_url ?? undefined}
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
