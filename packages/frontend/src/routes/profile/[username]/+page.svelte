<script lang="ts">
	import { ListingCard, CommentCard, ReportDialog, ItemImage } from '$lib/components';
	import { m } from '$lib/paraglide/messages.js';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import ThumbsUpIcon from '@lucide/svelte/icons/thumbs-up';
	import ThumbsDownIcon from '@lucide/svelte/icons/thumbs-down';
	import Flag from '@lucide/svelte/icons/flag';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Coins from '@lucide/svelte/icons/coins';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Shield from '@lucide/svelte/icons/shield';
	import Repeat from '@lucide/svelte/icons/repeat';
	import Package from '@lucide/svelte/icons/package';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { invalidateAll } from '$app/navigation';
	import { transformListing, type TransformedListing } from '$lib/utils/listings';
	import { toast } from 'svelte-sonner';
	import { track } from '$lib/utils/analytics';
	import { onMount } from 'svelte';

	let { data } = $props();

	const session = $derived(data.session);
	const profile = $derived(data.profile);

	onMount(() => {
		if (profile && !isOwnProfile) {
			track('profile_view', { target_user_id: profile.id });
		}
	});
	let reviews = $state<NonNullable<typeof data.profile>['reviews']>([]);
	$effect(() => { reviews = data.profile?.reviews ?? []; });

	const isOwnProfile = $derived(session?.user?.id === profile?.id);
	let reportDialogOpen = $state(false);

	const listings = $derived(
		(data.listings || [])
			.map(transformListing)
			.filter((l): l is TransformedListing => l !== null)
	);

	const upvotes = $derived(reviews.filter((r: any) => r.type === 'upvote').length);
	const downvotes = $derived(reviews.filter((r: any) => r.type === 'downvote').length);
	const totalReviews = $derived(reviews.length);
	const positivePercentage = $derived(
		totalReviews > 0 ? Math.round((upvotes / totalReviews) * 100) : 0
	);

	const buyOrders = $derived(listings.filter((o: any) => o.order_type === 'buy').slice(0, 6));
	const sellOrders = $derived(listings.filter((o: any) => o.order_type === 'sell').slice(0, 6));

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString(undefined, {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Profile stats
	const totalListings = $derived(profile?.listing_stats?.total ?? listings.length);
	const tradeCount = $derived(profile?.trade_count ?? 0);
	const trustScore = $derived(profile?.trust_score ?? null);

	// Trust score badge color
	const trustScoreVariant = $derived<'default' | 'secondary' | 'destructive' | 'outline'>(
		trustScore !== null && trustScore >= 70 ? 'default' :
		trustScore !== null && trustScore >= 40 ? 'secondary' :
		'destructive'
	);
	const trustScoreColor = $derived(
		trustScore !== null && trustScore >= 70 ? 'bg-green-600 hover:bg-green-600' :
		trustScore !== null && trustScore >= 40 ? 'bg-yellow-500 hover:bg-yellow-500 text-black' :
		''
	);

	// Member since
	const memberSince = $derived(
		profile?.created_at ? formatDate(profile.created_at) : null
	);

	// Profile customization (Story 7.4)
	const accentColor = $derived(profile?.accent_color ?? null);
	const bio = $derived(profile?.bio ?? null);
	const socialLinks = $derived<[string, string][]>(
		profile?.social_links
			? Object.entries(profile.social_links).filter(([k, v]) => k && v) as [string, string][]
			: []
	);

	// Have / Want lists (Story 7.10)
	const haveEntries = $derived((data.lists?.have ?? []) as any[]);
	const wantEntries = $derived((data.lists?.want ?? []) as any[]);
	const haveCount = $derived(haveEntries.length);
	const wantCount = $derived(wantEntries.length);

	// Build a URL for a social link — accept full URLs or platform handles
	function socialUrl(platform: string, value: string): string {
		if (/^https?:\/\//i.test(value)) return value;
		const handle = value.replace(/^@/, '');
		const lower = platform.toLowerCase();
		if (lower === 'twitter' || lower === 'x') return `https://x.com/${handle}`;
		if (lower === 'github') return `https://github.com/${handle}`;
		if (lower === 'youtube') return `https://youtube.com/@${handle}`;
		if (lower === 'twitch') return `https://twitch.tv/${handle}`;
		if (lower === 'reddit') return `https://reddit.com/user/${handle}`;
		// Discord/other platforms — leave as plain text inside a span by signaling no URL
		return '';
	}

	let reviewType = $state<'upvote' | 'downvote' | null>(null);
	let reviewComment = $state('');
	let submitting = $state(false);
	let submitError = $state<string | null>(null);

	async function handleSubmitReview() {
		if (!session?.user) return;

		if (!reviewType) {
			submitError = 'Please select either upvote or downvote';
			return;
		}

		if (!profile?.username) {
			submitError = 'Profile not found';
			return;
		}

		submitting = true;
		submitError = null;

		try {
			const formData = new FormData();
			formData.set('type', reviewType);
			if (reviewComment) formData.set('comment', reviewComment);

			const res = await fetch('?/submitReview', {
				method: 'POST',
				body: formData
			});
			const result = await res.json();

			if (result.type === 'failure') {
				submitError = result.data?.error || 'Failed to submit review';
				toast.error(submitError!);
			} else {
				toast.success('Review submitted');
				await invalidateAll();
				reviews = data.profile?.reviews || [];
				reviewType = null;
				reviewComment = '';
			}
		} catch (err: any) {
			console.error('Failed to submit review:', err);
			submitError = err.message || 'Failed to submit review';
			toast.error(submitError!);
		} finally {
			submitting = false;
		}
	}
</script>

{#if data.error || !profile}
	<div class="flex min-h-screen items-center justify-center text-foreground">
		<div class="text-center">
			<h1 class="mb-4 text-4xl font-bold">User Not Found</h1>
			<p class="text-lg text-muted-foreground">
				{data.error || `No user found with username "${data.username}"`}
			</p>
			<a href="/" class="mt-6 inline-block text-primary hover:underline">
				← Back to Home
			</a>
		</div>
	</div>
{:else}
	<div class="min-h-screen text-foreground">
		<!-- Profile Header Section -->
		<div
			class="bg-card pb-20 pt-8 shadow-sm"
			style={accentColor ? `border-top: 4px solid ${accentColor};` : ''}
		>
			<div class="mx-auto max-w-7xl px-8">
				<div class="flex items-start gap-6">
					{#if profile.avatar_url}
						<img
							src={profile.avatar_url}
							alt={profile.display_name}
							class="h-32 w-32 rounded-full border-4 bg-card object-cover shadow-lg"
							style={accentColor ? `border-color: ${accentColor};` : 'border-color: var(--border);'}
						/>
					{:else}
						<div
							class="flex h-32 w-32 items-center justify-center rounded-full border-4 bg-primary text-5xl font-bold text-primary-foreground shadow-lg"
							style={accentColor ? `border-color: ${accentColor};` : 'border-color: var(--border);'}
						>
							{profile.display_name.charAt(0).toUpperCase()}
						</div>
					{/if}

					<div class="flex-1">
						<div class="mb-2 flex items-center gap-3">
							<h1 class="text-4xl font-bold text-foreground">{profile.display_name}</h1>
							{#if trustScore !== null}
								<Badge class={trustScoreColor}>
									<Shield class="mr-1 h-3.5 w-3.5" />
									Trust: {trustScore}/100
								</Badge>
							{/if}
						</div>
						<p class="mb-4 text-lg text-muted-foreground">@{profile.username}</p>

						{#if profile.description}
							<p class="mb-2 text-foreground">{profile.description}</p>
						{/if}

						{#if bio}
							<p class="mb-4 whitespace-pre-line text-sm text-muted-foreground">{bio}</p>
						{/if}

						{#if socialLinks.length > 0}
							<div class="mb-4 flex flex-wrap gap-2">
								{#each socialLinks as [platform, value]}
									{@const url = socialUrl(platform, value)}
									{#if url}
										<a
											href={url}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
										>
											<ExternalLink class="h-3 w-3" />
											{platform}
										</a>
									{:else}
										<Badge variant="outline" class="font-normal">
											{platform}: {value}
										</Badge>
									{/if}
								{/each}
							</div>
						{/if}

						<div class="flex items-center gap-4">
							<div class="flex items-center gap-2">
								<ThumbsUpIcon class="size-5 text-green-500" />
								<span class="font-semibold text-green-500">{upvotes}</span>
							</div>
							<div class="flex items-center gap-2">
								<ThumbsDownIcon class="size-5 text-destructive" />
								<span class="font-semibold text-destructive">{downvotes}</span>
							</div>
							<div class="text-sm text-muted-foreground">
								({positivePercentage}% positive)
							</div>
							{#if session?.user && !isOwnProfile}
								<Button
									variant="outline"
									size="sm"
									class="text-muted-foreground hover:text-destructive"
									onclick={() => (reportDialogOpen = true)}
								>
									<Flag class="mr-1.5 h-3.5 w-3.5" />
									Report
								</Button>
							{/if}
						</div>

						<!-- Profile Stats Bar -->
						<div class="mt-5 flex flex-wrap items-center gap-6 rounded-lg border border-border bg-background/50 px-5 py-3">
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<Package class="h-4 w-4" />
								<span class="font-medium text-foreground">{totalListings}</span>
								Listings
							</div>
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<Repeat class="h-4 w-4" />
								<span class="font-medium text-foreground">{tradeCount}</span>
								Trades
							</div>
							{#if memberSince}
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar class="h-4 w-4" />
									Member since
									<span class="font-medium text-foreground">{memberSince}</span>
								</div>
							{/if}
							{#if trustScore !== null}
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Shield class="h-4 w-4" />
									<Badge variant={trustScoreVariant} class={trustScoreColor}>
										Trust: {trustScore}/100
									</Badge>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Tabbed Content Section -->
		<div class="px-8 py-12">
			<div class="mx-auto max-w-7xl">
				<Tabs.Root value="listings">
					<Tabs.List class="mb-8">
						<Tabs.Trigger value="listings">{m.profile_view_listings()}</Tabs.Trigger>
						<Tabs.Trigger value="havewant">{m.profile_view_have_want()} ({haveCount + wantCount})</Tabs.Trigger>
						<Tabs.Trigger value="reviews">{m.profile_view_reviews()} ({totalReviews})</Tabs.Trigger>
					</Tabs.List>

					<!-- Listings Tab -->
					<Tabs.Content value="listings">
						{#if buyOrders.length === 0 && sellOrders.length === 0}
							<div class="py-12 text-center">
								<p class="text-lg text-muted-foreground">{m.profile_no_listings()}</p>
							</div>
						{:else}
							<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<div>
									<h3 class="mb-4 rounded-t-lg bg-green-500 p-3 text-center text-xl font-semibold text-white">
										<ShoppingCart class="inline h-5 w-5" /> {m.listings_buy_orders()} ({buyOrders.length})
									</h3>
									<div class="space-y-4">
										{#each buyOrders as order}
											<ListingCard {order} sessionUserId={data.session?.user?.id} />
										{/each}
									</div>
								</div>

								<div>
									<h3 class="mb-4 rounded-t-lg bg-amber-500 p-3 text-center text-xl font-semibold text-white">
										<Coins class="inline h-5 w-5" /> {m.listings_sell_orders()} ({sellOrders.length})
									</h3>
									<div class="space-y-4">
										{#each sellOrders as order}
											<ListingCard {order} sessionUserId={data.session?.user?.id} />
										{/each}
									</div>
								</div>
							</div>
						{/if}
					</Tabs.Content>

					<!-- Have / Want Tab -->
					<Tabs.Content value="havewant">
						{#if haveCount === 0 && wantCount === 0}
							<div class="py-12 text-center">
								<p class="text-lg text-muted-foreground">
									{isOwnProfile ? m.profile_have_want_empty_self() : m.profile_have_want_empty_other()}
								</p>
								{#if isOwnProfile}
									<a href="/settings/profile" class="mt-4 inline-block text-primary hover:underline">
										{m.profile_edit_lists()}
									</a>
								{/if}
							</div>
						{:else}
							<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<div>
									<h3 class="mb-4 rounded-t-lg bg-emerald-600 p-3 text-center text-xl font-semibold text-white">
										{m.profile_have_count({ count: haveCount })}
									</h3>
									{#if haveEntries.length === 0}
										<p class="py-6 text-center text-muted-foreground">{m.profile_have_empty()}</p>
									{:else}
										<div class="grid grid-cols-4 gap-3 sm:grid-cols-6">
											{#each haveEntries as entry (entry.id)}
												<a
													href={entry.slug ? `/listings/${entry.slug}` : '#'}
													class="flex flex-col items-center gap-1 rounded-md p-2 transition-colors hover:bg-card"
												>
													<ItemImage src={entry.image_url ?? ''} alt={entry.name} size="md" />
													<p class="text-center text-xs text-foreground">{entry.name}</p>
												</a>
											{/each}
										</div>
									{/if}
								</div>
								<div>
									<h3 class="mb-4 rounded-t-lg bg-sky-600 p-3 text-center text-xl font-semibold text-white">
										{m.profile_want_count({ count: wantCount })}
									</h3>
									{#if wantEntries.length === 0}
										<p class="py-6 text-center text-muted-foreground">{m.profile_want_empty()}</p>
									{:else}
										<div class="grid grid-cols-4 gap-3 sm:grid-cols-6">
											{#each wantEntries as entry (entry.id)}
												<a
													href={entry.slug ? `/listings/${entry.slug}` : '#'}
													class="flex flex-col items-center gap-1 rounded-md p-2 transition-colors hover:bg-card"
												>
													<ItemImage src={entry.image_url ?? ''} alt={entry.name} size="md" />
													<p class="text-center text-xs text-foreground">{entry.name}</p>
												</a>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</Tabs.Content>

					<!-- Reviews Tab -->
					<Tabs.Content value="reviews">
						<div class="mb-8 rounded-lg border border-border bg-card p-6">
							<h3 class="mb-4 text-lg font-semibold text-foreground">Leave a Review</h3>

							{#if !session?.user}
								<div class="py-4 text-center">
									<p class="mb-4 text-muted-foreground">
										You must be signed in to leave a review.
									</p>
									<a
										href="/login"
										class="inline-block rounded-md bg-primary px-6 py-2 font-semibold text-primary-foreground transition-colors hover:opacity-90"
									>
										{m.nav_sign_in()}
									</a>
								</div>
							{:else if isOwnProfile}
								<div class="py-4 text-center">
									<p class="text-muted-foreground">{m.profile_review_self()}</p>
								</div>
							{:else}
								{#if submitError}
									<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
										{submitError}
									</div>
								{/if}

								<div class="mb-4 flex gap-4">
									<button
										class="flex items-center gap-2 rounded-md border-2 px-6 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-50 {reviewType === 'upvote' ? 'border-green-500 bg-green-500 text-white' : 'border-border hover:border-green-500'}"
										onclick={() => (reviewType = reviewType === 'upvote' ? null : 'upvote')}
										disabled={submitting}
									>
										<ThumbsUpIcon class="size-5" />
										<span class="font-semibold">Upvote</span>
									</button>

									<button
										class="flex items-center gap-2 rounded-md border-2 px-6 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-50 {reviewType === 'downvote' ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border hover:border-destructive'}"
										onclick={() => (reviewType = reviewType === 'downvote' ? null : 'downvote')}
										disabled={submitting}
									>
										<ThumbsDownIcon class="size-5" />
										<span class="font-semibold">Downvote</span>
									</button>
								</div>

								<div class="mb-4">
									<Textarea
										bind:value={reviewComment}
										placeholder={m.profile_review_placeholder()}
										rows={3}
										disabled={submitting}
									/>
								</div>

								<div class="flex justify-end">
									<Button onclick={handleSubmitReview} disabled={submitting}>
										{submitting ? m.profile_review_submitting() : m.profile_review_submit()}
									</Button>
								</div>
							{/if}
						</div>

						{#if reviews.length === 0}
							<div class="py-12 text-center">
								<p class="text-lg text-muted-foreground">{m.profile_no_reviews()}</p>
							</div>
						{:else}
							<div class="space-y-4">
								{#each reviews as review}
									{#if review.voter}
										<CommentCard {review} voter={review.voter} {formatDate} />
									{/if}
								{/each}
							</div>
						{/if}
					</Tabs.Content>
				</Tabs.Root>
			</div>
		</div>
	</div>

	{#if session?.user && !isOwnProfile && profile}
		<ReportDialog
			bind:open={reportDialogOpen}
			targetType="user"
			targetId={profile.id}
			targetLabel="@{profile.username}"
		/>
	{/if}
{/if}
