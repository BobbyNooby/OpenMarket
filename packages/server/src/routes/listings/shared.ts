import { db } from '../../db/db';
import {
	listingOfferedItemsTable,
	listingOfferedCurrenciesTable,
	itemsTable,
	currenciesTable,
	userProfilesTable,
} from '../../db/schemas';
import { user } from '../../db/schemas';
import { eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export const requestedCurrencyTable = alias(currenciesTable, 'requested_currency');

// --- serializers ---

export function serializeItem(item: {
	id: string; created_at: Date; slug: string; name: string;
	description: string | null; wiki_link: string | null; image_url: string | null;
}) {
	return {
		id: item.id,
		created_at: item.created_at.toISOString(),
		slug: item.slug,
		name: item.name,
		description: item.description ?? undefined,
		wiki_link: item.wiki_link ?? undefined,
		image_url: item.image_url ?? undefined,
	};
}

export function serializeCurrency(currency: {
	id: string; created_at: Date; slug: string; name: string;
	description: string | null; wiki_link: string | null; image_url: string | null;
}) {
	return {
		id: currency.id,
		created_at: currency.created_at.toISOString(),
		slug: currency.slug,
		name: currency.name,
		description: currency.description ?? undefined,
		wiki_link: currency.wiki_link ?? undefined,
		image_url: currency.image_url ?? undefined,
	};
}

export function serializeItemOrNull(item: { id: string | null } & Record<string, unknown>) {
	if (!item || !item.id) return undefined;
	return serializeItem(item as Parameters<typeof serializeItem>[0]);
}

export function serializeCurrencyOrNull(currency: { id: string | null } & Record<string, unknown>) {
	if (!currency || !currency.id) return undefined;
	return serializeCurrency(currency as Parameters<typeof serializeCurrency>[0]);
}

export function serializeAuthor(
	userData: { id: string; name: string; image: string | null; createdAt: Date },
	profile: { username: string; description: string | null } | null,
) {
	return {
		id: userData.id,
		created_at: userData.createdAt.toISOString(),
		username: profile?.username ?? userData.name,
		display_name: userData.name,
		avatar_url: userData.image ?? undefined,
		description: profile?.description ?? undefined,
	};
}

// --- shared SELECT shape used by all listing queries ---

export const listingSelectShape = {
	id: listingsTable.id,
	created_at: listingsTable.created_at,
	amount: listingsTable.amount,
	order_type: listingsTable.order_type,
	paying_type: listingsTable.paying_type,
	status: listingsTable.status,
	expires_at: listingsTable.expires_at,
	author: {
		id: user.id,
		name: user.name,
		image: user.image,
		createdAt: user.createdAt,
	},
	authorProfile: {
		username: userProfilesTable.username,
		description: userProfilesTable.description,
	},
	requested_item: {
		id: itemsTable.id,
		slug: itemsTable.slug,
		name: itemsTable.name,
		description: itemsTable.description,
		wiki_link: itemsTable.wiki_link,
		image_url: itemsTable.image_url,
		created_at: itemsTable.created_at,
	},
	requested_currency: {
		id: requestedCurrencyTable.id,
		slug: requestedCurrencyTable.slug,
		name: requestedCurrencyTable.name,
		description: requestedCurrencyTable.description,
		wiki_link: requestedCurrencyTable.wiki_link,
		image_url: requestedCurrencyTable.image_url,
		created_at: requestedCurrencyTable.created_at,
	},
};

import { listingsTable } from '../../db/schemas';

// --- batched offered items + currencies fetcher ---

export async function fetchOfferedForListings(listingIds: string[]) {
	if (listingIds.length === 0) return { offeredItemsByListing: new Map(), offeredCurrenciesByListing: new Map() };

	const [allOfferedItems, allOfferedCurrencies] = await Promise.all([
		db.select({
			listing_id: listingOfferedItemsTable.listing_id,
			item: {
				id: itemsTable.id, slug: itemsTable.slug, name: itemsTable.name,
				description: itemsTable.description, wiki_link: itemsTable.wiki_link,
				image_url: itemsTable.image_url, created_at: itemsTable.created_at,
			},
			amount: listingOfferedItemsTable.amount,
		})
			.from(listingOfferedItemsTable)
			.innerJoin(itemsTable, eq(listingOfferedItemsTable.item_id, itemsTable.id))
			.where(inArray(listingOfferedItemsTable.listing_id, listingIds)),

		db.select({
			listing_id: listingOfferedCurrenciesTable.listing_id,
			currency: {
				id: currenciesTable.id, slug: currenciesTable.slug, name: currenciesTable.name,
				description: currenciesTable.description, wiki_link: currenciesTable.wiki_link,
				image_url: currenciesTable.image_url, created_at: currenciesTable.created_at,
			},
			amount: listingOfferedCurrenciesTable.amount,
		})
			.from(listingOfferedCurrenciesTable)
			.innerJoin(currenciesTable, eq(listingOfferedCurrenciesTable.currency_id, currenciesTable.id))
			.where(inArray(listingOfferedCurrenciesTable.listing_id, listingIds)),
	]);

	const offeredItemsByListing = new Map<string, typeof allOfferedItems>();
	for (const row of allOfferedItems) {
		const arr = offeredItemsByListing.get(row.listing_id) ?? [];
		arr.push(row);
		offeredItemsByListing.set(row.listing_id, arr);
	}

	const offeredCurrenciesByListing = new Map<string, typeof allOfferedCurrencies>();
	for (const row of allOfferedCurrencies) {
		const arr = offeredCurrenciesByListing.get(row.listing_id) ?? [];
		arr.push(row);
		offeredCurrenciesByListing.set(row.listing_id, arr);
	}

	return { offeredItemsByListing, offeredCurrenciesByListing };
}

// --- serialize a full listing row into the API response shape ---

export function serializeListing(
	listing: {
		id: string; created_at: Date; amount: number;
		order_type: 'buy' | 'sell'; paying_type: 'each' | 'total';
		status: 'active' | 'sold' | 'paused' | 'expired'; expires_at: Date | null;
		author: { id: string; name: string; image: string | null; createdAt: Date };
		authorProfile: { username: string; description: string | null } | null;
		requested_item: { id: string | null } & Record<string, unknown>;
		requested_currency: { id: string | null } & Record<string, unknown>;
	},
	offeredItemsByListing: Map<string, { item: Parameters<typeof serializeItem>[0]; amount: number }[]>,
	offeredCurrenciesByListing: Map<string, { currency: Parameters<typeof serializeCurrency>[0]; amount: number }[]>,
) {
	return {
		id: listing.id,
		created_at: listing.created_at.toISOString(),
		author_id: listing.author.id,
		requested_item_id: listing.requested_item?.id ?? undefined,
		requested_currency_id: listing.requested_currency?.id ?? undefined,
		amount: listing.amount,
		order_type: listing.order_type,
		paying_type: listing.paying_type,
		status: listing.status,
		expires_at: listing.expires_at?.toISOString() ?? null,
		author: serializeAuthor(listing.author, listing.authorProfile),
		requested_item: serializeItemOrNull(listing.requested_item),
		requested_currency: serializeCurrencyOrNull(listing.requested_currency),
		offered_items: (offeredItemsByListing.get(listing.id) ?? []).map((o) => ({
			item: serializeItem(o.item),
			amount: o.amount,
		})),
		offered_currencies: (offeredCurrenciesByListing.get(listing.id) ?? []).map((o) => ({
			currency: serializeCurrency(o.currency),
			amount: o.amount,
		})),
	};
}
