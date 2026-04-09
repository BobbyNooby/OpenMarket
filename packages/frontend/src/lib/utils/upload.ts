import { PUBLIC_API_URL } from '$env/static/public';

export type UploadedImage = {
	id: string;
	url: string;
	width: number;
	height: number;
	size_bytes: number;
};

export type UploadResult =
	| { success: true; data: UploadedImage }
	| { success: false; error: string };

// Turn a relative /uploads/... path from the API into an absolute URL the browser can load
export function resolveUploadUrl(url: string): string {
	if (!url) return url;
	if (url.startsWith('http://') || url.startsWith('https://')) return url;
	return `${PUBLIC_API_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

// POST a single image file to the upload service and return the stored record.
// Throws on network errors; returns { success: false, error } for 4xx/5xx.
export async function uploadImage(file: File): Promise<UploadResult> {
	const formData = new FormData();
	formData.append('file', file);

	const res = await fetch(`${PUBLIC_API_URL}/uploads/image`, {
		method: 'POST',
		body: formData,
		credentials: 'include',
	});

	let payload: unknown;
	try {
		payload = await res.json();
	} catch {
		return { success: false, error: `Upload failed (HTTP ${res.status})` };
	}

	if (!res.ok || !payload || typeof payload !== 'object' || !('success' in payload)) {
		const error = (payload as { error?: string })?.error ?? `Upload failed (HTTP ${res.status})`;
		return { success: false, error };
	}

	const result = payload as UploadResult;
	if (!result.success) return result;

	// Normalise the url to an absolute one so callers can drop it straight into <img src>
	return { success: true, data: { ...result.data, url: resolveUploadUrl(result.data.url) } };
}
