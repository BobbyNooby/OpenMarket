<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Chart from '$lib/components/ui/chart';
	import { AreaChart } from 'layerchart';
	import { scaleUtc } from 'd3-scale';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Users from '@lucide/svelte/icons/users';
	import Package from '@lucide/svelte/icons/package';
	import Search from '@lucide/svelte/icons/search';
	import Clock from '@lucide/svelte/icons/clock';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import { apiFetch } from './admin-api';

	interface Props { dataVersion: number; }
	let { dataVersion }: Props = $props();

	type RangePreset = '7d' | '30d' | '90d';
	let selectedRange = $state<RangePreset>('30d');
	let loading = $state(false);

	let overview = $state<{
		total_users: number; active_users: number; new_registrations: number;
		total_listings: number; active_listings: number;
		total_messages: number; total_reviews: number; total_searches: number;
	} | null>(null);

	let topQueries = $state<{ query: string; count: number }[]>([]);
	let eventsPerDay = $state<{ date: Date; count: number }[]>([]);
	let uniqueUsersPerDay = $state<{ date: Date; count: number }[]>([]);
	let pageViewsPerDay = $state<{ date: Date; count: number }[]>([]);
	let topEventTypes = $state<{ event_type: string; count: number }[]>([]);
	let topViewedListings = $state<{ listing_id: string; name: string; count: number }[]>([]);
	let peakHours = $state<{ hour: string; count: number }[]>([]);
	let topPages = $state<{ path: string; count: number }[]>([]);
	let popularItems = $state<{ item_name: string; item_image: string | null; count: number }[]>([]);
	let activeUsersTop10 = $state<{ user_id: string; username: string; avatar: string | null; count: number }[]>([]);

	const maxPeakCount = $derived(peakHours.length > 0 ? Math.max(...peakHours.map((h) => h.count)) : 1);
	const maxEventTypeCount = $derived(topEventTypes.length > 0 ? Math.max(...topEventTypes.map((e) => e.count)) : 1);

	function getDateRange(preset: RangePreset) {
		const to = new Date();
		const from = new Date();
		from.setDate(from.getDate() - (preset === '7d' ? 7 : preset === '30d' ? 30 : 90));
		return { from: from.toISOString(), to: to.toISOString() };
	}

	function parseDates(data: { date: string; count: number }[]): { date: Date; count: number }[] {
		return data.map(d => ({ date: new Date(d.date), count: d.count }));
	}

	function formatHour(hour: number): string {
		return `${hour % 12 || 12} ${hour >= 12 ? 'PM' : 'AM'}`;
	}

	function formatEventType(type: string): string {
		return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	async function loadData() {
		loading = true;
		const { from, to } = getDateRange(selectedRange);
		const params = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

		const [overviewRes, eventsRes, searchRes, engagementRes] = await Promise.all([
			apiFetch(`/admin/insights/overview?${params}`),
			apiFetch(`/admin/insights/events?${params}`),
			apiFetch(`/admin/insights/search?${params}`),
			apiFetch(`/admin/insights/engagement?${params}`)
		]);

		if (overviewRes.success) overview = overviewRes.data;
		if (eventsRes.success) {
			eventsPerDay = parseDates(eventsRes.data.events_per_day ?? []);
			uniqueUsersPerDay = parseDates(eventsRes.data.unique_users_per_day ?? []);
			pageViewsPerDay = parseDates(eventsRes.data.page_views_per_day ?? []);
			topEventTypes = eventsRes.data.top_event_types ?? [];
		}
		if (searchRes.success) topQueries = searchRes.data.top_queries ?? [];
		if (engagementRes.success) {
			topViewedListings = engagementRes.data.top_viewed_listings ?? [];
			peakHours = (engagementRes.data.peak_hours ?? []).map((h: { hour: number; count: number }) => ({ hour: formatHour(h.hour), count: h.count }));
			topPages = engagementRes.data.top_pages ?? [];
			popularItems = engagementRes.data.popular_items ?? [];
			activeUsersTop10 = engagementRes.data.active_users_top10 ?? [];
		}
		loading = false;
	}

	$effect(() => { void dataVersion; loadData(); });

	const eventsConfig = { count: { label: 'Events', color: 'hsl(217 91% 60%)' } } satisfies Chart.ChartConfig;
	const usersConfig = { count: { label: 'Users', color: 'hsl(142 76% 46%)' } } satisfies Chart.ChartConfig;
	const viewsConfig = { count: { label: 'Views', color: 'hsl(262 83% 58%)' } } satisfies Chart.ChartConfig;
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold text-foreground">Analytics</h3>
		<div class="flex gap-1">
			{#each [{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }] as preset}
				<Button size="sm" variant={selectedRange === preset.value ? 'default' : 'outline'} onclick={() => { selectedRange = preset.value as RangePreset; loadData(); }}>
					{preset.label}
				</Button>
			{/each}
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
	{:else}
		<!-- Summary Cards -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Users</Card.Title>
					<Users class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{overview?.total_users ?? 0}</div>
					<p class="text-xs text-muted-foreground">{overview?.new_registrations ?? 0} new registrations</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Active Users</Card.Title>
					<TrendingUp class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{overview?.active_users ?? 0}</div>
					<p class="text-xs text-muted-foreground">in selected period</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Listings</Card.Title>
					<Package class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{overview?.total_listings ?? 0}</div>
					<p class="text-xs text-muted-foreground">{overview?.active_listings ?? 0} active</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Searches</Card.Title>
					<Search class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{overview?.total_searches ?? 0}</div>
					<p class="text-xs text-muted-foreground">{overview?.total_reviews ?? 0} reviews, {overview?.total_messages ?? 0} messages</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Area Charts -->
		{@const areaCharts = [
			{ title: 'Total Events', data: eventsPerDay, config: eventsConfig, total: eventsPerDay.reduce((s, d) => s + d.count, 0) },
			{ title: 'Unique Users', data: uniqueUsersPerDay, config: usersConfig, total: uniqueUsersPerDay.reduce((s, d) => s + d.count, 0) },
			{ title: 'Page Views', data: pageViewsPerDay, config: viewsConfig, total: pageViewsPerDay.reduce((s, d) => s + d.count, 0) },
		]}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			{#each areaCharts as chart}
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">{chart.title}</Card.Title>
						<div class="text-2xl font-bold">{chart.total.toLocaleString()}</div>
					</Card.Header>
					<Card.Content class="pb-2">
						{#if chart.data.length > 0}
							<Chart.Container config={chart.config} class="h-32 w-full">
								<AreaChart
									data={chart.data}
									x="date"
									xScale={scaleUtc()}
									y="count"
									series={[{ key: 'count', color: Object.values(chart.config)[0].color ?? 'hsl(217 91% 60%)' }]}
								/>
							</Chart.Container>
						{:else}
							<p class="py-4 text-center text-sm text-muted-foreground">No data</p>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Event Types + Peak Hours side by side -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2"><BarChart3 class="h-4 w-4" /> Event Types</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if topEventTypes.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No event data available.</p>
					{:else}
						<div class="space-y-2">
							{#each topEventTypes as item}
								<div class="flex items-center gap-3">
									<span class="w-32 truncate text-sm">{formatEventType(item.event_type)}</span>
									<div class="flex-1">
										<div class="h-4 rounded bg-primary/60" style="width: {maxEventTypeCount > 0 ? (item.count / maxEventTypeCount) * 100 : 0}%"></div>
									</div>
									<span class="w-10 text-right text-sm font-medium">{item.count}</span>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2"><Clock class="h-4 w-4" /> Peak Hours</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if peakHours.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No activity data available.</p>
					{:else}
						<div class="space-y-2">
							{#each peakHours as item}
								<div class="flex items-center gap-3">
									<span class="w-14 text-right text-sm text-muted-foreground">{item.hour}</span>
									<div class="flex-1">
										<div class="h-4 rounded bg-primary/80" style="width: {maxPeakCount > 0 ? (item.count / maxPeakCount) * 100 : 0}%"></div>
									</div>
									<span class="w-10 text-right text-sm font-medium">{item.count}</span>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Top Pages + Popular Items -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2"><TrendingUp class="h-4 w-4" /> Top Pages</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if topPages.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No page data.</p>
					{:else}
						<Table.Root>
							<Table.Header><Table.Row><Table.Head>Page</Table.Head><Table.Head class="text-right">Views</Table.Head></Table.Row></Table.Header>
							<Table.Body>
								{#each topPages as page}
									<Table.Row>
										<Table.Cell class="font-mono text-sm">{page.path}</Table.Cell>
										<Table.Cell class="text-right">{page.count}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2"><Package class="h-4 w-4" /> Most Popular Items</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if popularItems.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No item data.</p>
					{:else}
						<Table.Root>
							<Table.Header><Table.Row><Table.Head>Item</Table.Head><Table.Head class="text-right">Views</Table.Head></Table.Row></Table.Header>
							<Table.Body>
								{#each popularItems as item}
									<Table.Row>
										<Table.Cell>
											<div class="flex items-center gap-2">
												{#if item.item_image}
													<img src={item.item_image} alt="" class="h-6 w-6 rounded object-cover" />
												{/if}
												<span class="font-medium">{item.item_name}</span>
											</div>
										</Table.Cell>
										<Table.Cell class="text-right">{item.count}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Tables -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2"><Search class="h-4 w-4" /> Top Searches</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if topQueries.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No search data.</p>
					{:else}
						<Table.Root>
							<Table.Header><Table.Row><Table.Head>Query</Table.Head><Table.Head class="text-right">Count</Table.Head></Table.Row></Table.Header>
							<Table.Body>
								{#each topQueries as item}
									<Table.Row><Table.Cell class="font-medium">{item.query}</Table.Cell><Table.Cell class="text-right">{item.count}</Table.Cell></Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2"><BarChart3 class="h-4 w-4" /> Top Listings</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if topViewedListings.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No view data.</p>
					{:else}
						<Table.Root>
							<Table.Header><Table.Row><Table.Head>Listing</Table.Head><Table.Head class="text-right">Views</Table.Head></Table.Row></Table.Header>
							<Table.Body>
								{#each topViewedListings as item}
									<Table.Row><Table.Cell class="font-medium">{item.name}</Table.Cell><Table.Cell class="text-right">{item.count}</Table.Cell></Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2"><Users class="h-4 w-4" /> Most Active</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if activeUsersTop10.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No user data.</p>
					{:else}
						<Table.Root>
							<Table.Header><Table.Row><Table.Head>User</Table.Head><Table.Head class="text-right">Activity</Table.Head></Table.Row></Table.Header>
							<Table.Body>
								{#each activeUsersTop10 as item}
									<Table.Row>
										<Table.Cell>
											<a href="/profile/{item.username}" class="flex items-center gap-2 hover:text-primary hover:underline">
												{#if item.avatar}<img src={item.avatar} alt="" class="h-5 w-5 rounded-full" />{/if}
												<span class="font-medium">@{item.username}</span>
											</a>
										</Table.Cell>
										<Table.Cell class="text-right">{item.count}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
