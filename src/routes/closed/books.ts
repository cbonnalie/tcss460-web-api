import express, { NextFunction, Request, Response, Router } from 'express';
import { IJwtRequest } from '../../core/models';
import { pool, validationFunctions } from '../../core/utilities';
import { bookUtils } from '../../core/utilities/bookUtils';

const booksRouter: Router = express.Router();

const toBooks = bookUtils.toBooks;
const buildBooksQuery = bookUtils.buildBooksQuery;
const checkParams = validationFunctions.checkParams;
const isValidParam = validationFunctions.isValidParam;
const isNumberProvided = validationFunctions.isNumberProvided;
const isStringProvided = validationFunctions.isStringProvided;

/**
 * @apiDefine JWT
 * @apiHeader {String} Authorization The string "Bearer " + a valid JSON Web Token (JWT).
 */

/**
 * @api {get} /books/ Request to retrieve books that contain the given query parameters
 *
 * @apiName GetBooks
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiParam {string} [isbn13] The ISBN-13 of the book
 * @apiParam {string} [authors] The authors of the book
 * @apiParam {string} [publication_year] The publication year of the book
 * @apiParam {string} [original_title] The original title of the book
 * @apiParam {string} [title] The title of the book
 * @apiParam {string} [rating] The minimum rating of the book
 *
 * @apiSuccess {Object[]} books The array of book objects associated with the given query parameters
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
 * @apiError (400: Invalid query parameter type) {String} message "Query parameter not of required type - please refer to documentation"
 * @apiError (400: Invalid query parameter value) {String} message "Query parameter value not of required type - please refer to documentation"
 * @apiError (404: No books found) {String} message "No books found for the given query"
 * @apiError (500: Server error) {String} message "server error - contact support"
 */
booksRouter.get(
    '/',
    // check if the query parameters are valid
    (request: Request, response: Response, next: NextFunction) => {
        try {
            // do we have a query parameter?
            const query = request.query;
            const queryLength = Object.keys(query).length;
            if (queryLength === 0) {
                return response.status(400).send({
                    message:
                        'No query parameter in url - please refer to documentation',
                });
            }

            // check that each query parameter is valid
            for (let i = 0; i < queryLength; i++) {
                const param = Object.keys(query)[i];
                if (!isValidParam(param)) {
                    return response.status(400).send({
                        message:
                            'Query parameter not of required type - please refer to documentation',
                    });
                }

                // check that the value of the query parameter is of the correct type
                // and that it is in the correct range
                const value = query[param];
                if (!checkParams(param, value)) {
                    return response.status(400).send({
                        message:
                            'Invalid query parameter value - please refer to documentation',
                    });
                }
            }
            next();
        } catch (error) {
            next(error);
        }
    },
    async (request: Request, response: Response) => {
        const query = request.query;
        const { queryString, values } = buildBooksQuery(query);

        await pool
            .query(queryString, values)
            .then((result) => {
                if (result.rows.length > 0) {
                    const books = toBooks(result.rows);
                    return response.status(200).send({ books: books });
                } else {
                    return response.status(404).send({
                        message: 'No books found for the given query',
                    });
                }
            })
            .catch((error) => {
                console.error('DB Query error on GET books', error);
                return response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);

/**
 * @api {get} /books/all Request to retrieve books by cursor pagination
 *
 * @apiDescription Request to retrieve paginated books using a cursor.
 *
 * @apiName Books Cursor Pagination
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiQuery {number} [limit=10] The number of books to return (default is 10).
 * If a value less than zero is provided, or if a non-numeric value is provided,
 * or if no value is provided, the default limit of 10 will be used.
 *
 * @apiQuery {number} [cursor=0] The cursor to start the pagination from (default is 0). When no cursor is
 * provided, the result is the first set of paginated entries. Note, if a value less than 0 is provided
 * or a non-numeric value is provided results will be the same as not providing a cursor.
 *
 * @apiSuccess {Object[]} books The array of book objects associated with the given query parameters
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
 * @apiSuccess {Object} pagination Metadata results from the query
 * @apiSuccess {number} pagination.totalRecords The total number of records in the database
 * @apiSuccess {number} pagination.limit The number of records returned
 * @apiSuccess {number} pagination.rowsReturned The number of records returned
 * @apiSuccess {number} pagination.cursor The cursor for the next page of results
 *
 * @apiError (500: Server error) {String} message "server error - contact support"
 */
booksRouter.get('/all', async (request: Request, response: Response) => {
    const theQuery = `SELECT *
                      FROM books
                      WHERE id > $2
                      ORDER BY id LIMIT $1`;

    const limit: number =
        isNumberProvided(request.query.limit) && +request.query.limit > 0
            ? +request.query.limit
            : 10;

    const cursor: number =
        isNumberProvided(request.query.cursor) && +request.query.cursor >= 0
            ? +request.query.cursor
            : 0;

    const values = [limit, cursor];

    try {
        const { rows } = await pool.query(theQuery, values);
        const result = await pool.query('SELECT COUNT(*) AS count FROM books;');
        const count = result.rows[0].count;

        response.send({
            books: toBooks(rows),
            pagination: {
                totalRecords: count,
                limit,
                rowsReturned: rows.length,
                cursor: rows
                    .map((row) => row.id)
                    .reduce((max, id) => (id > max ? id : max), 0),
            },
        });
    } catch (error) {
        console.error('DB Query error on GET books', error);
        response.status(500).send({
            message: 'server error - contact support',
        });
    }
});

/**
 * @api {post} /books/ Request to add a book
 *
 * @apiDescription Request to add a book to the DB.
 *
 * @apiName AddBook
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiSuccess {Object} result The book object
 * @apiSuccess {number} result.id The ID of the book
 * @apiSuccess {number} result.isbn13 The ISBN-13 of the book
 * @apiSuccess {string} result.authors The authors of the book
 * @apiSuccess {string} result.publication The publication year of the book
 * @apiSuccess {string} result.original_title The original title of the book
 * @apiSuccess {string} result.title The title of the book
 * @apiSuccess {Object} result.ratings The ratings of the book
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
 * @apiError (500: Server error) {String} message "server error - contact support"
 */
booksRouter.post(
    '/',
    // ISBN-13
    (request: Request, response: Response, next: NextFunction) => {
        if (request.body.isbn13 === null || request.body.isbn13 === undefined) {
            response.status(400).send({
                message: 'ISBN not provided - please refer to documentation',
            });
        } else if (!isNumberProvided(request.body.isbn13)) {
            response.status(400).send({
                message:
                    'ISBN must be a number - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // Authors
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.authors === null ||
            request.body.authors === undefined
        ) {
            response.status(400).send({
                message: 'Author not provided - please refer to documentation',
            });
        } else if (!isStringProvided(request.body.authors)) {
            response.status(400).send({
                message:
                    'Author must be a string - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // Original Publication Year
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.original_publication_year === null ||
            request.body.original_publication_year === undefined
        ) {
            response.status(400).send({
                message:
                    'Publication year not provided - please refer to documentation',
            });
        } else if (!isNumberProvided(request.body.original_publication_year)) {
            response.status(400).send({
                message:
                    'Publication year must be a number - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // Original Title
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.original_title === null ||
            request.body.original_title === undefined
        ) {
            response.status(400).send({
                message:
                    'Original title not provided - please refer to documentation',
            });
        } else if (!isStringProvided(request.body.original_title)) {
            response.status(400).send({
                message:
                    'Original title must be a string - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // Title
    (request: Request, response: Response, next: NextFunction) => {
        if (request.body.title === null || request.body.title === undefined) {
            response.status(400).send({
                message: 'Title not provided - please refer to documentation',
                value: request.body.title,
            });
        } else if (!isStringProvided(request.body.title)) {
            response.status(400).send({
                message:
                    'Title must be a string - please refer to documentation',
                value: request.body.title,
            });
        } else {
            next();
        }
    },
    // Ratings 1
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.ratings_1 === null ||
            request.body.ratings_1 === undefined
        ) {
            response.status(400).send({
                message:
                    'Ratings 1 not provided - please refer to documentation',
            });
        } else if (!isNumberProvided(request.body.ratings_1)) {
            response.status(400).send({
                message:
                    'Ratings 1 must be a number - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // Ratings 2
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.ratings_2 === null ||
            request.body.ratings_2 === undefined
        ) {
            response.status(400).send({
                message:
                    'Ratings 2 not provided - please refer to documentation',
            });
        } else if (!isNumberProvided(request.body.ratings_2)) {
            response.status(400).send({
                message:
                    'Ratings 2 must be a number - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // Ratings 3
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.ratings_3 === null ||
            request.body.ratings_3 === undefined
        ) {
            response.status(400).send({
                message:
                    'Ratings 3 not provided - please refer to documentation',
            });
        } else if (!isNumberProvided(request.body.ratings_3)) {
            response.status(400).send({
                message:
                    'Ratings 3 must be a number - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // Ratings 4
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.ratings_4 === null ||
            request.body.ratings_4 === undefined
        ) {
            response.status(400).send({
                message:
                    'Ratings 4 not provided - please refer to documentation',
            });
        } else if (!isNumberProvided(request.body.ratings_4)) {
            response.status(400).send({
                message:
                    'Ratings 4 must be a number - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // Ratings 5
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.ratings_5 === null ||
            request.body.ratings_5 === undefined
        ) {
            response.status(400).send({
                message:
                    'Ratings 5 not provided - please refer to documentation',
            });
        } else if (!isNumberProvided(request.body.ratings_5)) {
            response.status(400).send({
                message:
                    'Ratings 5 must be a number - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // Image URL
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.image_url === null ||
            request.body.image_url === undefined
        ) {
            response.status(400).send({
                message:
                    'Image URL not provided - please refer to documentation',
            });
        } else if (!isStringProvided(request.body.image_url)) {
            response.status(400).send({
                message:
                    'Wrong type for image URL - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // Small Image URL
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.small_image_url === null ||
            request.body.small_image_url === undefined
        ) {
            response.status(400).send({
                message:
                    'Small image URL not provided - please refer to documentation',
            });
        } else if (!isStringProvided(request.body.small_image_url)) {
            response.status(400).send({
                message:
                    'Wrong type for small image URL - please refer to documentation',
            });
        } else {
            next();
        }
    },
    (request: IJwtRequest, response: Response) => {
        const theQuery = `
            INSERT INTO books (isbn13, authors, publication_year, original_title, title,
                               rating_1_star, rating_2_star, rating_3_star, rating_4_star, rating_5_star, image_url,
                               image_small_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
        `;
        const values = [
            request.body.isbn13,
            request.body.authors,
            request.body.publication_year,
            request.body.original_title,
            request.body.title,
            request.body.rating_1_star,
            request.body.rating_2_star,
            request.body.rating_3_star,
            request.body.rating_4_star,
            request.body.rating_5_star,
            request.body.image_url,
            request.body.small_image_url,
        ];

        pool.query(theQuery, values)
            .then((result) => {
                response.status(201).send({
                    message: 'Book added successfully',
                });
            })
            .catch((error) => {
                console.error('DB Query error on POST books');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);

export { booksRouter };
