<script lang="ts">
	import type { ProfileReview, ReviewVoter } from '$lib/api/types';

	interface Props {
		review: ProfileReview;
		voter: ReviewVoter;
		formatDate: (dateString: string) => string;
	}

	let { review, voter, formatDate }: Props = $props();
</script>

<a
	href="/profile/{voter.username}"
	class="block rounded-lg border border-border bg-background p-4 transition-all hover:border-primary hover:shadow-md"
>
	<div class="mb-3 flex items-center gap-3">
		{#if voter.avatar_url}
			<img
				src={voter.avatar_url}
				alt={voter.display_name}
				class="h-10 w-10 rounded-full object-cover"
			/>
		{:else}
			<div
				class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
			>
				{voter.display_name.charAt(0).toUpperCase()}
			</div>
		{/if}

		<div class="flex-1">
			<div class="flex items-center gap-2">
				<span class="font-semibold text-foreground">{voter.display_name}</span>
				<span class="text-sm text-muted-foreground">@{voter.username}</span>
				<span class="text-2xl">
					{review.type === 'upvote' ? '👍' : '👎'}
				</span>
			</div>
			<p class="text-xs text-muted-foreground">
				{formatDate(review.created_at)}
			</p>
		</div>
	</div>

	{#if review.comment}
		<p class="text-sm text-foreground">{review.comment}</p>
	{/if}
</a>
