<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { PUBLIC_API_URL } from '$env/static/public';
	import Plus from '@lucide/svelte/icons/plus';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { debounce } from '$lib/utils/debounce';

	interface UserResult {
		id: string;
		username: string;
		display_name: string;
		avatar: string | null;
	}

	interface Props {
		onSelect: (userId: string) => void;
	}

	let { onSelect }: Props = $props();

	let open = $state(false);
	let query = $state('');
	let results = $state<UserResult[]>([]);
	let loading = $state(false);

	const debouncedSearch = debounce(async (q: string) => {
		if (q.trim().length < 2) {
			results = [];
			loading = false;
			return;
		}
		try {
			const res = await fetch(
				`${PUBLIC_API_URL}/api/users/search?q=${encodeURIComponent(q.trim())}`,
				{ credentials: 'include' }
			);
			const json = await res.json();
			if (json.success) results = json.data;
		} catch {
			results = [];
		} finally {
			loading = false;
		}
	}, 300);

	function handleInput() {
		loading = true;
		debouncedSearch(query);
	}

	function selectUser(userId: string) {
		open = false;
		query = '';
		results = [];
		onSelect(userId);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" title="New conversation">
				<Plus class="h-5 w-5" />
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>New Conversation</Dialog.Title>
			<Dialog.Description>Search for a user to start a conversation with.</Dialog.Description>
		</Dialog.Header>

		<Input
			placeholder="Search by username..."
			bind:value={query}
			oninput={handleInput}
			autofocus
		/>

		<div class="mt-2 max-h-64 overflow-y-auto">
			{#if loading}
				<div class="flex justify-center py-4">
					<Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			{:else if results.length > 0}
				{#each results as user (user.id)}
					<button
						class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
						onclick={() => selectUser(user.id)}
					>
						<Avatar.Root class="h-8 w-8">
							{#if user.avatar}
								<Avatar.Image src={user.avatar} alt={user.display_name} />
							{/if}
							<Avatar.Fallback class="bg-primary text-xs font-bold text-primary-foreground">
								{user.display_name.charAt(0).toUpperCase()}
							</Avatar.Fallback>
						</Avatar.Root>
						<div>
							<p class="text-sm font-medium">{user.display_name}</p>
							<p class="text-xs text-muted-foreground">@{user.username}</p>
						</div>
					</button>
				{/each}
			{:else if query.trim().length >= 2}
				<p class="py-4 text-center text-sm text-muted-foreground">No users found</p>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
