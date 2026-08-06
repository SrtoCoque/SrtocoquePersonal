import type { UserBook } from "@/lib/types";

/**
 * Autores preferidos a partir de la biblioteca + wishlist.
 * Leídos con nota alta pesan más.
 */
export function deriveTopAuthors(books: UserBook[], max = 3): string[] {
  const weights = new Map<string, number>();

  for (const book of books) {
    let weight = 1;
    if (book.status === "read") weight = 2.5;
    else if (book.status === "reading") weight = 2;
    else if (book.status === "wishlist") weight = 1.5;
    else if (book.status === "owned") weight = 1.2;

    if (book.rating != null) {
      if (book.rating >= 4) weight += 3;
      else if (book.rating >= 3) weight += 1;
    }

    for (const raw of book.authors ?? []) {
      const author = raw.trim();
      if (!author || /desconocido/i.test(author)) continue;
      weights.set(author, (weights.get(author) ?? 0) + weight);
    }
  }

  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([name]) => name);
}

export function libraryGoogleBooksIds(books: UserBook[]): string[] {
  return books
    .map((b) => b.google_books_id)
    .filter((id): id is string => !!id);
}

export function libraryBookTitles(books: UserBook[]): string[] {
  return books.map((b) => b.title).filter(Boolean);
}
