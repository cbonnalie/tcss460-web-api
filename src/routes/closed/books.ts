import express, { NextFunction, Request, Response, Router } from 'express';
import { IJwtRequest } from '../../core/models';
import { pool, validationFunctions } from '../../core/utilities';
import { IBook } from '../../core/models/book.model';

const booksRouter: Router = express.Router();

function toBook(row): IBook {
    return {
        id: row.id,
        isbn13: row.isbn13,
        authors: row.authors,
        publication: row.publication_year,
        original_title: row.original_title,
        title: row.title,
        ratings: {
            average: row.rating_avg,
            count: row.rating_count,
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

/**
 * @apiDefine JWT
 * @apiHeader {String} Authorization The string "Bearer " + a valid JSON Web Token (JWT).
 */

/**
 * @api {get} /books/title/:title Request to retrieve books by title
 *
 * @apiDescription Request to retrieve books from the DB that contain the given <code>title</code>
 *
 * @apiName GetBookByTitle
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiParam {string} title The title of the book to be retrieved
 *
 * @apiSuccess {Object[]} books The array of book objects associated with <code>title</code>
 * @apiSuccess {number} books.id The ID of the book
 * @apiSuccess {number} books.isbn13 The ISBN-13 of the book
 * @apiSuccess {string} books.authors The authors of the book
 * @apiSuccess {string} books.publication The publication year of the book
 * @apiSuccess {string} books.original_title The original title of the book
 * @apiSuccess {string} result.title The title of the book
 * @apiSuccess {Object} result.ratings The ratings of the book
 * @apiSuccess {number} result.ratings.average The average rating of the book
 * @apiSuccess {number} result.ratings.count The number of ratings for the book
 * @apiSuccess {number} result.ratings.rating_1 The number of 1-star ratings
 * @apiSuccess {number} result.ratings.rating_2 The number of 2-star ratings
 * @apiSuccess {number} result.ratings.rating_3 The number of 3-star ratings
 * @apiSuccess {number} result.ratings.rating_4 The number of 4-star ratings
 * @apiSuccess {number} result.ratings.rating_5 The number of 5-star ratings
 * @apiSuccess {Object} result.icons The icons of the book
 * @apiSuccess {string} result.icons.large The URL of the large icon
 * @apiSuccess {string} result.icons.small The URL of the small icon
 *
 * @apiError (400: No query parameter) {String} message "No query parameter in url - please refer to documentation"
 * @apiError (400: Invalid type) {String} message "Query parameter not of required type - please refer to documentation"
 * @apiError (404: No books found) {String} message "No books found with title [title]"
 * @apiError (500: Server error) {String} message "server error - contact support"
 */
booksRouter.get(
    '/title/:title',
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.params.title === null ||
            request.params.title === undefined
        ) {
            response.status(400).send({
                message:
                    'No query parameter in url - please refer to documentation',
            });
        } else if (
            !validationFunctions.isStringProvided(request.params.title)
        ) {
            response.status(400).send({
                message:
                    'Query parameter not of required type - please refer to documentation',
            });
        }
        next();
    },
    (request: IJwtRequest, response: Response) => {
        const theQuery = `
            SELECT *
            FROM books
            WHERE title CONTAINS $1
        `;
        const value = [request.params.title];

        pool.query(theQuery, value)
            .then((result) => {
                if (result.rows.length > 0) {
                    const books: IBook[] = toBooks(result.rows);
                    response.status(200).send({
                        books: books,
                    });
                } else {
                    response.status(404).send({
                        message: 'No books found with title ',
                        value,
                    });
                }
            })
            .catch((error) => {
                console.error('DB Query error on GET by Title');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);

/**
 * @api {get} /books/isbns/:isbn Request to retrieve a book by ISBN
 *
 * @apiDescription Request to retrieve a book from the DB by its <code>ISBN</code>.
 *
 * @apiName GetBookByISBN
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiParam {number} isbn The ISBN of the book to be retrieved
 *
 * @apiSuccess {Object} result The book object associated with <code>isbn</code>
 * @apiSuccess {number} result.id The ID of the book
 * @apiSuccess {number} result.isbn13 The ISBN-13 of the book
 * @apiSuccess {string} result.authors The authors of the book
 * @apiSuccess {string} result.publication The publication year of the book
 * @apiSuccess {string} result.original_title The original title of the book
 * @apiSuccess {string} result.title The title of the book
 * @apiSuccess {Object} result.ratings The ratings of the book
 * @apiSuccess {number} result.ratings.average The average rating of the book
 * @apiSuccess {number} result.ratings.count The number of ratings for the book
 * @apiSuccess {number} result.ratings.rating_1 The number of 1-star ratings
 * @apiSuccess {number} result.ratings.rating_2 The number of 2-star ratings
 * @apiSuccess {number} result.ratings.rating_3 The number of 3-star ratings
 * @apiSuccess {number} result.ratings.rating_4 The number of 4-star ratings
 * @apiSuccess {number} result.ratings.rating_5 The number of 5-star ratings
 * @apiSuccess {Object} result.icons The icons of the book
 * @apiSuccess {string} result.icons.large The URL of the large icon
 * @apiSuccess {string} result.icons.small The URL of the small icon
 *
 * @apiError (400: No query parameter) {String} message "No query parameter in url - please refer to documentation"
 * @apiError (400: Invalid type) {String} message "Query parameter not of required type - please refer to documentation"
 * @apiError (400: Invalid ISBN) {String} message "ISBN not in range - please refer to documentation"
 * @apiError (404: Book not found) {String} message "Book not found for ISBN [isbn]"
 * @apiError (500: Server error) {String} message "server error - contact support"
 */
booksRouter.get(
    '/isbns/:isbn',
    (request: Request, response: Response, next: NextFunction) => {
        if (request.params.isbn === null || request.params.isbn === undefined) {
            response.status(400).send({
                message:
                    'No query parameter in url - please refer to documentation',
            });
        } else if (!validationFunctions.isNumberProvided(request.params.isbn)) {
            response.status(400).send({
                message:
                    'Query parameter not of required type - please refer to documentation',
            });
        } else if (
            Number(request.params.isbn) < 0 ||
            Number(request.params.isbn) > Math.pow(10, 13)
        ) {
            response.status(400).send({
                message: 'ISBN not in range - please refer to documentation',
            });
        }
        next();
    },
    (request: IJwtRequest, response: Response) => {
        const theQuery = `
            SELECT *
            FROM BOOKS
            WHERE isbn13 = $1
        `;
        const value = [request.params.isbn];

        pool.query(theQuery, value)
            .then((result) => {
                if (result.rows.length === 1) {
                    const book = toBook(result.rows[0]);
                    response.status(200).send({
                        result: book,
                    });
                } else {
                    response.status(404).send({
                        message: 'Book not found for ISBN ',
                        value,
                    });
                }
            })
            .catch((error) => {
                console.error('DB Query error on GET by ISBN');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);

export { booksRouter };
