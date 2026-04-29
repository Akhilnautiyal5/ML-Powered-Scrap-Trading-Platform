export const getImageUrl = (url) => {
	if (typeof url !== "string") return null;
	const value = url.trim();
	if (!value) return null;
	if (value.startsWith("http://") || value.startsWith("https://")) {
		return value;
	}
	return null;
};
