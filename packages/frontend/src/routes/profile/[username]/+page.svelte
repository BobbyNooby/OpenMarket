<script lang="ts">
	import { ListingCard, CommentCard, ReportDialog } from '$lib/components';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import ThumbsUpIcon from '@lucide/svelte/icons/thumbs-up';
	import ThumbsDownIcon from '@lucide/svelte/icons/thumbs-down';
	import Flag from '@lucide/svelte/icons/flag';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Coins from '@lucide/svelte/icons/coins';
	import { invalidateAll } from '$app/navigation';
	import { transformListing, type TransformedListing } from '$lib/utils/listings';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	const session = $derived(data.session);
	const profile = $derived(data.profile);
	let reviews = $state(profile?.reviews || []);

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

	function handleContact(order: any) {
		if (profile) {
			alert(`Contact ${profile.display_name} (@${profile.username}) about this order!`);
		}
	}

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
		<div class="bg-card pb-20 pt-8 shadow-sm">
			<div class="mx-auto max-w-7xl px-8">
				<div class="flex items-start gap-6">
					{#if profile.avatar_url}
						<img
							src={profile.avatar_url}
							alt={profile.display_name}
							class="h-32 w-32 rounded-full border-4 border-border bg-card object-cover shadow-lg"
						/>
					{:else}
						<div
							class="flex h-32 w-32 items-center justify-center rounded-full border-4 border-border bg-primary text-5xl font-bold text-primary-foreground shadow-lg"
						>
							{profile.display_name.charAt(0).toUpperCase()}
						</div>
					{/if}

					<div class="flex-1">
						<h1 class="mb-2 text-4xl font-bold text-foreground">{profile.display_name}</h1>
						<p class="mb-4 text-lg text-muted-foreground">@{profile.username}</p>

						{#if profile.description}
							<p class="mb-4 text-foreground">{profile.description}</p>
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
					</div>
				</div>
			</div>
		</div>

		<!-- Active Listings Section -->
		<div class="px-8 py-12">
			<div class="mx-auto max-w-7xl">
				<h2 class="mb-8 text-3xl font-bold text-foreground">Active Listings</h2>

				{#if buyOrders.length === 0 && sellOrders.length === 0}
					<div class="py-12 text-center">
						<p class="text-lg text-muted-foreground">This user has no listings yet.</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<div>
							<h3 class="mb-4 rounded-t-lg bg-green-500 p-3 text-center text-xl font-semibold text-white">
								<ShoppingCart class="inline h-5 w-5" /> Buy Orders ({buyOrders.length})
							</h3>
							<div class="space-y-4">
								{#each buyOrders as order}
									<ListingCard {order} onContact={() => handleContact(order)} sessionUserId={data.session?.user?.id} />
								{/each}
								{#if buyOrders.length === 0}
									<p class="py-4 text-center text-muted-foreground">No buy orders</p>
								{/if}
							</div>
						</div>

						<div>
							<h3 class="mb-4 rounded-t-lg bg-amber-500 p-3 text-center text-xl font-semibold text-white">
								<Coins class="inline h-5 w-5" /> Sell Orders ({sellOrders.length})
							</h3>
							<div class="space-y-4">
								{#each sellOrders as order}
									<ListingCard {order} onContact={() => handleContact(order)} sessionUserId={data.session?.user?.id} />
								{/each}
								{#if sellOrders.length === 0}
									<p class="py-4 text-center text-muted-foreground">No sell orders</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Reviews Section -->
		<div class="bg-card px-8 py-12">
			<div class="mx-auto max-w-7xl">
				<h2 class="mb-8 text-3xl font-bold text-foreground">Reviews ({totalReviews})</h2>

				<div class="mb-8 rounded-lg border border-border bg-background p-6">
					<h3 class="mb-4 text-lg font-semibold text-foreground">Leave a Review</h3>

					{#if !session?.user}
						<div class="py-4 text-center">
							<p class="mb-4 text-muted-foreground">
								You must be signed in to leave a review.
							</p>
							<a
								href="/auth/signin"
								class="inline-block rounded-md bg-primary px-6 py-2 font-semibold text-primary-foreground transition-colors hover:opacity-90"
							>
								Sign In
							</a>
						</div>
					{:else if isOwnProfile}
						<div class="py-4 text-center">
							<p class="text-muted-foreground">You cannot review your own profile.</p>
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
								placeholder="Share your experience with this user (optional)..."
								rows={3}
								disabled={submitting}
							/>
						</div>

						<div class="flex justify-end">
							<Button onclick={handleSubmitReview} disabled={submitting}>
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
						<p class="text-lg text-muted-foreground">No reviews yet.</p>
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

	{#if session?.user && !isOwnProfile && profile}
		<ReportDialog
			bind:open={reportDialogOpen}
			targetType="user"
			targetId={profile.id}
			targetLabel="@{profile.username}"
		/>
	{/if}
{/if}
