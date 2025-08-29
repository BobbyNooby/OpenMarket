<script lang="ts">
	let { data } = $props();

	const { status, profile, error } = data;
</script>

{#if !profile}
	<div>
		status:{status} error :{error}
	</div>
{:else}
	<div>
		<img src={profile.avatar_url} alt={profile.username} />
		{JSON.stringify(profile)}
	</div>
{/if}
