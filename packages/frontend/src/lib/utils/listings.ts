/**
 * Transform raw API listing data to match component expectations
 */
export function transformListing(listing: any) {
	if (!listing) return null;

	return {
		id: listing.id,
		created_at: listing.created_at,
		author_id: listing.author_id ?? listing.author?.id,
		requested_item_id: listing.requested_item?.id,
		requested_currency_id: listing.requested_currency?.id,
		amount: listing.amount,
		order_type: listing.order_type,
		paying_type: listing.paying_type,
		offered_items: listing.offered_items ?? [],
		offered_currencies: listing.offered_currencies ?? [],
		_author: listing.author,
		_requested_item: listing.requested_item,
		_requested_currency: listing.requested_currency
	};
}

export type TransformedListing = NonNullable<ReturnType<typeof transformListing>>;
