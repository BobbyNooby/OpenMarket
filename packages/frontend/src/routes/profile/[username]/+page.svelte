<script lang="ts">
	import { ListingCard } from '$lib/shared/components';
	import Button from '$lib/shared/components/Button.svelte';
	import Textarea from '$lib/shared/components/Textarea.svelte';
	import CommentCard from '$lib/shared/components/CommentCard.svelte';
	import { api } from '$lib/api/client';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	// Get session, profile and listings from server data
	const session = $derived(data.session);
	const profile = $derived(data.profile);
	let reviews = $state(profile?.reviews || []);

	// Check if user is viewing their own profile
	const isOwnProfile = $derived(session?.user?.id === profile?.id);

	// Transform listings for display
	const listings = $derived(
		(data.listings || []).map((listing: any) => ({
			id: listing.id,
			created_at: listing.created_at,
			author_id: listing.author.id,
			requested_item_id: listing.requested_item?.id,
			requested_currency_id: listing.requested_currency?.id,
			amount: listing.amount,
			order_type: listing.order_type,
			paying_type: listing.paying_type,
			offered_items: listing.offered_items,
			offered_currencies: listing.offered_currencies,
			_author: listing.author,
			_requested_item: listing.requested_item,
			_requested_currency: listing.requested_currency
		}))
	);

	// Calculate review stats
	const upvotes = $derived(reviews.filter((r: any) => r.type === 'upvote').length);
	const downvotes = $derived(reviews.filter((r: any) => r.type === 'downvote').length);
	const totalReviews = $derived(reviews.length);
	const positivePercentage = $derived(
		totalReviews > 0 ? Math.round((upvotes / totalReviews) * 100) : 0
	);

	// Filter orders by type
	const buyOrders = $derived(listings.filter((o: any) => o.order_type === 'buy').slice(0, 6));
	const sellOrders = $derived(listings.filter((o: any) => o.order_type === 'sell').slice(0, 6));

	// Handle contact click
	function handleContact(order: any) {
		if (profile) {
			alert(`Contact ${profile.display_name} (@${profile.username}) about this order!`);
		}
	}

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	let reviewType = $state<'upvote' | 'downvote' | null>(null);
	let reviewComment = $state('');
	let submitting = $state(false);
	let submitError = $state<string | null>(null);

	async function handleSubmitReview() {
		if (!session?.user) {
			return;
		}

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
			const result = await api.users.profile({ username: profile.username }).reviews.post({
				voter_user_id: session.user.id,
				type: reviewType,
				comment: reviewComment || undefined
			});

			if (result.data?.success) {
				// Refresh page data to get updated reviews
				await invalidateAll();
				// Update local reviews state from new data
				reviews = data.profile?.reviews || [];
				reviewType = null;
				reviewComment = '';
			} else {
				submitError = result.data?.error || 'Failed to submit review';
			}
		} catch (err: any) {
			console.error('Failed to submit review:', err);
			submitError = err.message || 'Failed to submit review';
		} finally {
			submitting = false;
		}
	}
</script>

{#if data.error || !profile}
	<div class="flex min-h-screen items-center justify-center text-[var(--color-text)]">
		<div class="text-center">
			<h1 class="mb-4 text-4xl font-bold">User Not Found</h1>
			<p class="text-lg text-[var(--color-textSecondary)]">
				{data.error || `No user found with username "${data.username}"`}
			</p>
			<a href="/" class="mt-6 inline-block text-[var(--color-primary)] hover:underline">
				← Back to Home
			</a>
		</div>
	</div>
{:else}
	<div class="min-h-screen text-[var(--color-text)]">
		<!-- Profile Header Section -->
		<div class="bg-[var(--color-surface)] pb-20 pt-8 shadow-[var(--shadow-sm)]">
			<div class="mx-auto max-w-7xl px-8">
				<!-- Avatar and User Info -->
				<div class="flex items-start gap-6">
					<!-- Large Avatar -->
					{#if profile.avatar_url}
						<img
							src={profile.avatar_url}
							alt={profile.display_name}
							class="h-32 w-32 rounded-full border-4 border-[var(--color-border)] bg-[var(--color-surface)] object-cover shadow-[var(--shadow-lg)]"
						/>
					{:else}
						<div
							class="flex h-32 w-32 items-center justify-center rounded-full border-4 border-[var(--color-border)] bg-[var(--color-primary)] text-5xl font-bold text-white shadow-[var(--shadow-lg)]"
						>
							{profile.display_name.charAt(0).toUpperCase()}
						</div>
					{/if}

					<!-- User Details -->
					<div class="flex-1">
						<h1 class="mb-2 text-4xl font-bold text-[var(--color-text)]">{profile.display_name}</h1>
						<p class="mb-4 text-lg text-[var(--color-textSecondary)]">@{profile.username}</p>

						{#if profile.description}
							<p class="mb-4 text-[var(--color-text)]">{profile.description}</p>
						{/if}

						<!-- Review Stats -->
						<div class="flex items-center gap-4">
							<div class="flex items-center gap-2">
								<span class="text-2xl">👍</span>
								<span class="font-semibold text-[var(--color-success)]">{upvotes}</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-2xl">👎</span>
								<span class="font-semibold text-[var(--color-danger)]">{downvotes}</span>
							</div>
							<div class="text-sm text-[var(--color-textTertiary)]">
								({positivePercentage}% positive)
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Active Listings Section -->
		<div class="px-8 py-12">
			<div class="mx-auto max-w-7xl">
				<h2 class="mb-8 text-3xl font-bold text-[var(--color-text)]">Active Listings</h2>

				{#if buyOrders.length === 0 && sellOrders.length === 0}
					<div class="py-12 text-center">
						<p class="text-lg text-[var(--color-textSecondary)]">This user has no listings yet.</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<!-- Buy Orders Column -->
						<div>
							<h3
								class="mb-4 rounded-t-[var(--radius-lg)] bg-[var(--color-success)] p-3 text-center text-xl font-semibold text-white"
							>
								🛒 Buy Orders ({buyOrders.length})
							</h3>
							<div class="space-y-4">
								{#each buyOrders as order}
									<ListingCard
										{order}
										author={order._author}
										requestedItem={order._requested_item}
										requestedCurrency={order._requested_currency}
										onContact={() => handleContact(order)}
									/>
								{/each}
								{#if buyOrders.length === 0}
									<p class="py-4 text-center text-[var(--color-textSecondary)]">No buy orders</p>
								{/if}
							</div>
						</div>

						<!-- Sell Orders Column -->
						<div>
							<h3
								class="mb-4 rounded-t-[var(--radius-lg)] bg-[var(--color-warning)] p-3 text-center text-xl font-semibold text-white"
							>
								💰 Sell Orders ({sellOrders.length})
							</h3>
							<div class="space-y-4">
								{#each sellOrders as order}
									<ListingCard
										{order}
										author={order._author}
										requestedItem={order._requested_item}
										requestedCurrency={order._requested_currency}
										onContact={() => handleContact(order)}
									/>
								{/each}
								{#if sellOrders.length === 0}
									<p class="py-4 text-center text-[var(--color-textSecondary)]">No sell orders</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Reviews Section -->
		<div class="bg-[var(--color-surface)] px-8 py-12">
			<div class="mx-auto max-w-7xl">
				<h2 class="mb-8 text-3xl font-bold text-[var(--color-text)]">Reviews ({totalReviews})</h2>

				<!-- Add Review Box -->
				<div
					class="mb-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background)] p-6"
				>
					<h3 class="mb-4 text-lg font-semibold text-[var(--color-text)]">Leave a Review</h3>

					{#if !session?.user}
						<!-- Not signed in -->
						<div class="py-4 text-center">
							<p class="mb-4 text-[var(--color-textSecondary)]">
								You must be signed in to leave a review.
							</p>
							<a
								href="/auth/signin"
								class="inline-block rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-2 font-semibold text-white transition-colors hover:opacity-90"
							>
								Sign In
							</a>
						</div>
					{:else if isOwnProfile}
						<!-- Viewing own profile -->
						<div class="py-4 text-center">
							<p class="text-[var(--color-textSecondary)]">You cannot review your own profile.</p>
						</div>
					{:else}
						<!-- Can leave review -->
						{#if submitError}
							<div
								class="mb-4 rounded-[var(--radius-md)] bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400"
							>
								{submitError}
							</div>
						{/if}

						<!-- Vote Buttons -->
						<div class="mb-4 flex gap-4">
							<button
								class="flex items-center gap-2 rounded-[var(--radius-md)] border-2 px-6 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-50"
								class:border-[var(--color-success)]={reviewType === 'upvote'}
								class:bg-[var(--color-success)]={reviewType === 'upvote'}
								class:text-white={reviewType === 'upvote'}
								class:border-[var(--color-border)]={reviewType !== 'upvote'}
								class:hover:border-[var(--color-success)]={reviewType !== 'upvote'}
								onclick={() => (reviewType = reviewType === 'upvote' ? null : 'upvote')}
								disabled={submitting}
							>
								<span class="text-2xl">👍</span>
								<span class="font-semibold">Upvote</span>
							</button>

							<button
								class="flex items-center gap-2 rounded-[var(--radius-md)] border-2 px-6 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-50"
								class:border-[var(--color-danger)]={reviewType === 'downvote'}
								class:bg-[var(--color-danger)]={reviewType === 'downvote'}
								class:text-white={reviewType === 'downvote'}
								class:border-[var(--color-border)]={reviewType !== 'downvote'}
								class:hover:border-[var(--color-danger)]={reviewType !== 'downvote'}
								onclick={() => (reviewType = reviewType === 'downvote' ? null : 'downvote')}
								disabled={submitting}
							>
								<span class="text-2xl">👎</span>
								<span class="font-semibold">Downvote</span>
							</button>
						</div>

						<!-- Comment Textarea -->
						<div class="mb-4">
							<Textarea
								bind:value={reviewComment}
								placeholder="Share your experience with this user (optional)..."
								rows={3}
								disabled={submitting}
							/>
						</div>

						<!-- Submit Button -->
						<div class="flex justify-end">
							<Button variant="primary" onclick={handleSubmitReview} disabled={submitting}>
								{#if submitting}
									Submitting...
								{:else}
									Submit Review
								{/if}
							</Button>
						</div>
					{/if}
				</div>

				{#if reviews.length === 0}
					<div class="py-12 text-center">
						<p class="text-lg text-[var(--color-textSecondary)]">No reviews yet.</p>
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
			</div>
		</div>
	</div>
{/if}
