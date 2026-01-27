<script lang="ts">
  import ItemButton from "../item/ItemButton.svelte";
  import Button from "../ui/Button.svelte";
  import type { TransformedListing } from "$lib/utils/listings";

  interface Props {
    order: TransformedListing;
    onContact?: () => void;
  }

  let { order, onContact }: Props = $props();

  const author = $derived(order.author);
  const requestedItem = $derived(order.requested_item);
  const requestedCurrency = $derived(order.requested_currency);

  const requested = $derived(requestedItem ?? requestedCurrency);
  const requestedName = $derived(requested?.name ?? "Unknown");
  const requestedImage = $derived(requested?.image_url ?? "");
  const requestedSlug = $derived(requested?.slug ?? "");

  // Get offered items/currencies
  const displayItems = $derived(() => {
    const items: Array<{
      name: string;
      type: string;
      slug: string;
      description?: string;
      image_url?: string;
      amount: number;
    }> = [];

    if (order.offered_items) {
      order.offered_items.forEach((offered) => {
        items.push({
          name: offered.item.name,
          type: "item",
          slug: offered.item.slug,
          description: offered.item.description ?? undefined,
          image_url: offered.item.image_url ?? "",
          amount: offered.amount,
        });
      });
    }

    if (order.offered_currencies) {
      order.offered_currencies.forEach((offered) => {
        items.push({
          name: offered.currency.name,
          type: "currency",
          slug: offered.currency.slug,
          description: offered.currency.description ?? undefined,
          image_url: offered.currency.image_url ?? "",
          amount: offered.amount,
        });
      });
    }

    return items;
  });

  // Format relative time
  function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }
</script>

<div
  class="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
>
  <!-- Top Row: Item Name + WTB/WTS Badge -->
  <div class="flex items-center justify-between">
    <a
      href="/listings?item={requestedSlug}"
      class="text-lg font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
    >
      {requestedName}
    </a>
    <span
      class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold uppercase"
      class:bg-[var(--color-success)]={order.order_type === "buy"}
      class:bg-[var(--color-warning)]={order.order_type === "sell"}
      class:text-[var(--color-background)]={true}
      title={order.order_type === "buy" ? "Want to Buy" : "Want to Sell"}
    >
      {order.order_type === "buy" ? "Buy" : "Sell"}
    </span>
  </div>

  <!-- Middle Row: Offered Items → Wanted Items -->
  <div class="flex flex-col gap-2">
    <!-- Items Row -->
    <div class="flex items-center gap-4">
      <!-- Requested Item (from title) -->
      <ItemButton
        name={requestedName}
        type={requestedItem ? "item" : "currency"}
        slug={requestedSlug}
        description={requested?.description ?? undefined}
        image_url={requestedImage}
        amount={order.amount}
      />

      <!-- Arrow (direction based on order type) -->
      <svg
        class="h-5 w-5 shrink-0 text-[var(--color-textTertiary)]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {#if order.order_type === "buy"}
          <!-- Left arrow: I want this ← here's my offer -->
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        {:else}
          <!-- Right arrow: I'm selling this → I want these -->
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        {/if}
      </svg>

      <!-- Offered Items -->
      <div class="flex flex-wrap gap-2">
        {#each displayItems() as item}
          <ItemButton
            name={item.name}
            type={item.type}
            slug={item.slug}
            description={item.description}
            image_url={item.image_url}
            amount={item.amount}
          />
        {/each}
        {#if displayItems().length === 0}
          <div
            class="flex h-16 w-16 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-textTertiary)]"
          >
            ?
          </div>
        {/if}
      </div>
    </div>

    <!-- Stock & Paying Type -->
    <div
      class="flex items-center gap-3 text-xs text-[var(--color-textSecondary)]"
    >
      <span class="flex items-center gap-1" title="Stock">
        <svg
          class="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        {order.amount}
      </span>
      <span
        class="rounded bg-[var(--color-background)] px-1.5 py-0.5 font-medium"
      >
        {order.paying_type === "each" ? "each" : "total"}
      </span>
    </div>
  </div>

  <!-- Bottom Row: Divider + Seller / Date / Contact -->
  <div
    class="flex items-center justify-between border-t border-[var(--color-border)] pt-3"
  >
    <a
      href="/profile/{author.username}"
      class="text-sm text-[var(--color-textSecondary)] transition-colors hover:text-[var(--color-primary)]"
    >
      @{author.username}
    </a>
    <div class="flex items-center gap-4">
      <span class="text-xs text-[var(--color-textTertiary)]">
        {timeAgo(order.created_at)}
      </span>
      <Button variant="primary" size="sm" onclick={onContact}>Contact</Button>
    </div>
  </div>
</div>
