export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with -
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing -
}

export function generateUniqueSlug(base: string, existingSlugs: string[]): string {
  let slug = generateSlug(base);
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${generateSlug(base)}-${counter}`;
    counter++;
  }

  return slug;
}
