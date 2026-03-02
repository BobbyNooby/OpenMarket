<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import type { ProfileReview, ReviewVoter } from '$lib/api/types';

	interface Props {
		review: ProfileReview;
		voter: ReviewVoter;
		formatDate: (dateString: string) => string;
	}

	let { review, voter, formatDate }: Props = $props();
</script>

<a href="/profile/{voter.username}" class="block">
	<Card.Root class="gap-3 py-4 transition-all hover:border-primary hover:shadow-md">
		<Card.Header class="gap-0">
			<div class="flex items-center gap-3">
				<Avatar.Root class="size-10">
					<Avatar.Image src={voter.avatar_url} alt={voter.display_name} />
					<Avatar.Fallback class="bg-primary text-sm font-bold text-primary-foreground">
						{voter.display_name.charAt(0).toUpperCase()}
					</Avatar.Fallback>
				</Avatar.Root>

				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="font-semibold text-foreground">{voter.display_name}</span>
						<span class="text-sm text-muted-foreground">@{voter.username}</span>
						<Badge variant={review.type === 'upvote' ? 'default' : 'destructive'}>
							{review.type === 'upvote' ? '👍' : '👎'}
						</Badge>
					</div>
					<p class="text-xs text-muted-foreground">
						{formatDate(review.created_at)}
					</p>
				</div>
			</div>
		</Card.Header>

		{#if review.comment}
			<Card.Content>
				<p class="text-sm text-foreground">{review.comment}</p>
			</Card.Content>
		{/if}
	</Card.Root>
</a>
