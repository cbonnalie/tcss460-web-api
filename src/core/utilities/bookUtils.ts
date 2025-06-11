import { IBook } from '../models/book.model';

/**
 * This file contains utility functions for handling book data.
 */

/**
 * Inserted into a SQL query to calculate the average rating of a book.
 */
const avgRatingQuery = `CASE 
    WHEN (rating_1_star + rating_2_star + rating_3_star + rating_4_star + rating_5_star) = 0 
    THEN NULL 
    ELSE 
        CAST(
            ((rating_1_star * 1) +
            (rating_2_star * 2) +
            (rating_3_star * 3) +
            (rating_4_star * 4) +
            (rating_5_star * 5)) AS DECIMAL(10,2)) / 
        CAST((rating_1_star +
            rating_2_star +
            rating_3_star +
            rating_4_star +
            rating_5_star) AS DECIMAL(10,2))
    END`;

function buildBooksQuery(queryParams: any) {
    const keys = Object.keys(queryParams);
    const values = [];
    let queryString: string = 'SELECT * FROM books WHERE ';

    keys.forEach((parameter, i) => {
        const isStringSearch = ['authors', 'title', 'original_title'].includes(
            parameter
        );

        const isRatingQuery = parameter === 'rating';

        if (isStringSearch) {
            queryParams[parameter] = `%${queryParams[parameter]}%`;
            queryString += `${parameter} ILIKE $${i + 1}`;
        } else if (isRatingQuery) {
            queryString += `${avgRatingQuery} >= $${i + 1}`;
        } else {
            queryString += `${parameter} = $${i + 1}`;
        }

        if (i < keys.length - 1) {
            queryString += '\nAND ';
        }

        values.push(queryParams[parameter]);
    });

    queryString += `;`;
    return { queryString, values };
}

/**
 * Converts a row from the database into a book object.
 * @param row - The row from the database.
 */
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

/**
 * Converts an array of rows from the database into an array of book objects.
 * @param rows - The rows from the database.
 */
function toBooks(rows): IBook[] {
    return rows.map(toBook);
}

/**
 * Calculates the average rating of a book.
 * @param rating_1 - The number of 1-star ratings.
 * @param rating_2 - The number of 2-star ratings.
 * @param rating_3 - The number of 3-star ratings.
 * @param rating_4 - The number of 4-star ratings.
 * @param rating_5 - The number of 5-star ratings.
 */
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

    // rounds to 1 decimal places
    return Math.round((totalWeightedRatings / totalRatings) * 10) / 10;
}

/**
 * Calculates the total number of ratings for a book.
 * @param rating_1 - The number of 1-star ratings.
 * @param rating_2 - The number of 2-star ratings.
 * @param rating_3 - The number of 3-star ratings.
 * @param rating_4 - The number of 4-star ratings.
 * @param rating_5 - The number of 5-star ratings.
 */
function getRatingCount(
    rating_1: number,
    rating_2: number,
    rating_3: number,
    rating_4: number,
    rating_5: number
): number {
    return rating_1 + rating_2 + rating_3 + rating_4 + rating_5;
}

const bookUtils = { toBook, toBooks, buildBooksQuery };

export { bookUtils };
