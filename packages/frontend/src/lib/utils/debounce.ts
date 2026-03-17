export function debounce<T extends (...args: never[]) => void>(fn: T, ms = 300) {
	let timer: ReturnType<typeof setTimeout>;
	const debounced = (...args: Parameters<T>) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
	debounced.cancel = () => clearTimeout(timer);
	return debounced;
}
