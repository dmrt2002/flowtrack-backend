"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlug = generateSlug;
exports.generateUniqueSlug = generateUniqueSlug;
function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function generateUniqueSlug(base, existingSlugs) {
    let slug = generateSlug(base);
    let counter = 1;
    while (existingSlugs.includes(slug)) {
        slug = `${generateSlug(base)}-${counter}`;
        counter++;
    }
    return slug;
}
//# sourceMappingURL=slug.util.js.map