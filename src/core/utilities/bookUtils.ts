import { IBook } from '../models/book.model';

function toBook(row): IBook {
    const average = getAverageRating(
        row.rating_1_star,
        row.rating_2_star,
        row.rating_3_star,
        row.rating_4_star,
        row.rating_5_star
    );
    const count = getRatingCount(
        row.rating_1_star,
        row.rating_2_star,
        row.rating_3_star,
        row.rating_4_star,
        row.rating_5_star
    );

    return {
        id: row.id,
        isbn13: row.isbn13,
        authors: row.authors,
        publication: row.publication_year,
        original_title: row.original_title,
        title: row.title,
        ratings: {
            average: average,
            count: count,
            rating_1: row.rating_1_star,
            rating_2: row.rating_2_star,
            rating_3: row.rating_3_star,
            rating_4: row.rating_4_star,
            rating_5: row.rating_5_star,
        },
        icons: {
            large: row.image_url,
            small: row.image_small_url,
        },
    };
}

function toBooks(rows): IBook[] {
    return rows.map(toBook);
}

function getAverageRating(
    rating_1: number,
    rating_2: number,
    rating_3: number,
    rating_4: number,
    rating_5: number
): number {
    const totalRatings = getRatingCount(
        rating_1,
        rating_2,
        rating_3,
        rating_4,
        rating_5
    );

    const totalWeightedRatings =
        rating_1 + 2 * rating_2 + 3 * rating_3 + 4 * rating_4 + 5 * rating_5;

    return totalWeightedRatings / totalRatings;
}

function getRatingCount(
    rating_1: number,
    rating_2: number,
    rating_3: number,
    rating_4: number,
    rating_5: number
): number {
    return rating_1 + rating_2 + rating_3 + rating_4 + rating_5;
}

const bookUtils = { getAverageRating, getRatingCount, toBook, toBooks };

export { bookUtils };