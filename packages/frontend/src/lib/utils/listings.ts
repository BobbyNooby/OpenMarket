import type {
  User,
  Item,
  Currency,
  OfferedItem,
  OfferedCurrency,
} from "$lib/api/types";

export interface TransformedListing {
  id: string;
  created_at: string;
  author_id: string;
  requested_item_id?: string;
  requested_currency_id?: string;
  amount: number;
  order_type: "buy" | "sell";
  paying_type: "each" | "total";
  status: "active" | "sold" | "paused" | "expired";
  expires_at: string | null;
  offered_items: OfferedItem[];
  offered_currencies: OfferedCurrency[];
  author: User;
  requested_item?: Item;
  requested_currency?: Currency;
}

export function transformListing(listing: any): TransformedListing | null {
  if (!listing) return null;

  return {
    id: listing.id,
    created_at:
      typeof listing.created_at === "string"
        ? listing.created_at
        : (listing.created_at?.toISOString?.() ?? new Date().toISOString()),
    author_id: listing.author_id ?? listing.author?.id,
    requested_item_id: listing.requested_item?.id ?? listing.requested_item_id,
    requested_currency_id:
      listing.requested_currency?.id ?? listing.requested_currency_id,
    amount: listing.amount,
    order_type: listing.order_type,
    paying_type: listing.paying_type,
    status: listing.status ?? "active",
    expires_at: listing.expires_at ?? null,
    offered_items: listing.offered_items ?? [],
    offered_currencies: listing.offered_currencies ?? [],
    author: listing.author,
    requested_item: listing.requested_item,
    requested_currency: listing.requested_currency,
  };
}
