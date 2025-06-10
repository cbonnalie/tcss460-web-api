import express, { NextFunction, Request, Response, Router } from 'express';
import { IJwtRequest } from '../../core/models';
import { pool, validationFunctions } from '../../core/utilities';
import { bookUtils } from '../../core/utilities/bookUtils';

const booksRouter: Router = express.Router();

const toBook = bookUtils.toBook;
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
 * @api {get} /books/ Retrieve books with query parameters
 *
 * @apiDescription Request to retrieve books from the database based on provided query parameters. If no query parameters are provided, all books will be returned.
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
 * @apiSuccess {number} books.id The ID of the book
 * @apiSuccess {number} books.isbn13 The ISBN-13 of the book
 * @apiSuccess {string} books.authors The authors of the book
 * @apiSuccess {string} books.publication The publication year of the book
 * @apiSuccess {string} books.original_title The original title of the book
 * @apiSuccess {string} books.title The title of the book
 * @apiSuccess {Object} books.ratings The ratings of the book
 * @apiSuccess {number} books.ratings.average The average rating of the book
 * @apiSuccess {number} books.ratings.count The number of ratings for the book
 * @apiSuccess {number} books.ratings.rating_1 The number of 1-star ratings
 * @apiSuccess {number} books.ratings.rating_2 The number of 2-star ratings
 * @apiSuccess {number} books.ratings.rating_3 The number of 3-star ratings
 * @apiSuccess {number} books.ratings.rating_4 The number of 4-star ratings
 * @apiSuccess {number} books.ratings.rating_5 The number of 5-star ratings
 * @apiSuccess {Object} books.images The book images
 * @apiSuccess {string} books.images.large URL of the large book image
 * @apiSuccess {string} books.images.small URL of the small book image
 *
 * @apiError (400: No query parameter) {String} message
 * "No query parameter in url - please refer to documentation"
 * when a query parameter is not provided
 * @apiError (400: Invalid query parameter type) {String} message
 * "Query parameter not of required type - please refer to documentation"
 * when a query parameter is not one of the valid choices
 * @apiError (400: Invalid query parameter value) {String} message
 * "Query parameter value not of required type - please refer to documentation"
 * when a query parameter value is not of the required data type
 * @apiError (404: No books found) {String} message
 * "No books found for the given query"
 * when the query returns zero books
 * @apiError (500: Server error) {String} message
 * "server error - contact support"
 * when there is a database error
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
                // return response.status(400).send({
                //     message:
                //         'No query parameter in url - please refer to documentation',
                // });

                return next();
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
        const queryLength = Object.keys(query).length;

        // const { queryString, values } = buildBooksQuery(query);

        let queryString: string;
        let values: any[];

        if (queryLength === 0) {
            // no query parameters, return all books
            queryString = 'SELECT * FROM books ORDER BY id';
            values = [];
        } else {
            // build the query string and values based on the query parameters
            const queryResult = buildBooksQuery(query);
            queryString = queryResult.queryString;
            values = queryResult.values;
        }

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
 * @api {get} /books/offset Retrieve books with offset pagination
 *
 * @apiDescription Request to retrieve books from the database with offset pagination using limit and offset query parameters.
 *
 * @apiName GetBooksWithOffsetPagination
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiParam {number} [limit=10] The number of entries to return (default is 10)
 * @apiParam {number} [offset=0] The offset to start retrieving entries from (default is 0)
 *
 * @apiSuccess {Object} pagination Metadata results from the paginated query
 * @apiSuccess {number} pagination.totalRecords The total number of entries in the database
 * @apiSuccess {number} pagination.limit The number of entries returned
 * @apiSuccess {number} pagination.offset The offset used for retrieving entries
 * @apiSuccess {number} pagination.nextPage The offset that should be used on a subsequent call
 * @apiSuccess {Object[]} entries The book objects retrieved
 * @apiSuccess {number} entries.id The ID of the book
 * @apiSuccess {number} entries.isbn13 The ISBN-13 of the book
 * @apiSuccess {string} entries.authors The authors of the book
 * @apiSuccess {string} entries.publication_year The publication year of the book
 * @apiSuccess {string} entries.original_title The original title of the book
 * @apiSuccess {string} entries.title The title of the book
 * @apiSuccess {number} entries.rating_1_star The number of 1-star ratings
 * @apiSuccess {number} entries.rating_2_star The number of 2-star ratings
 * @apiSuccess {number} entries.rating_3_star The number of 3-star ratings
 * @apiSuccess {number} entries.rating_4_star The number of 4-star ratings
 * @apiSuccess {number} entries.rating_5_star The number of 5-star ratings
 * @apiSuccess {string} entries.image_url The URL of the book cover image
 * @apiSuccess {string} entries.image_small_url The URL of the small book cover image
 *
 * @apiError (400: Invalid parameter) {String} message "Query parameter not of required type - please refer to documentation"
 * when a query parameter is not one of the valid choices
 * @apiError (500: Server error) {String} message "server error - contact support"
 * when there is a database error
 */

/**
 * async is used to declare an asynchronous function. It allows us to use the await keyword inside the function.
 * The await keyword is used to wait for a promise to resolve or reject before continuing the execution of the code.
 * It allows us to pause and wait for other asynchronous operations to complete before moving on to the next line of code.
 * This is useful for handling asynchronous operations in a more readable and manageable way.
 *
 * async is useful for API calls and DB queries.
 * Always want to return a promise.
 */
booksRouter.get('/offset', async (request: Request, response: Response) => {
    // the + tells TS to treat this string as a number
    // We cab always change the size of the limit and offset in the future
    const limit =
        validationFunctions.isNumberProvided(request.query.limit) &&
        +request.query.limit > 0
            ? +request.query.limit
            : 10;
    const offset =
        validationFunctions.isNumberProvided(request.query.offset) &&
        +request.query.offset >= 0
            ? +request.query.offset
            : 0;

    const theQuery = `SELECT * 
                      FROM books 
                      ORDER BY id 
                      LIMIT $1 OFFSET $2`;
    const values = [limit, offset];

    // deconstructing the returned object. const {rows}
    const { rows } = await pool.query(theQuery, values);

    // slow on datasets (especially on large datasets)
    /**
     * await (promise syntax) is a keyword that is used to pause execution of an async
     * function until a promise resolves or rejects. It can only be used inside an async function.
     * Basically, it waits here until the result is returned.
     */
    const result = await pool.query(`SELECT COUNT(*) FROM books`);
    const count = result.rows[0].count;
    response.send({
        entries: rows.map((row) => toBook(row)),
        pagination: {
            totalRecords: count,
            limit,
            offset,
            nextPage: limit + offset,
        },
    });
});

/**
 * @api {get} /books/cursor Retrieve books with cursor pagination
 *
 * @apiDescription Request to retrieve books from the database with cursor pagination using limit and cursor query parameters.
 *
 * @apiName GetBooksWithCursorPagination
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiParam {number} [limit=10] The number of entries to return (default is 10)
 * @apiParam {number} [cursor=0] The cursor to start retrieving entries from (default is 0)
 *
 * @apiSuccess {Object} pagination Metadata results from the paginated query
 * @apiSuccess {number} pagination.totalRecords The total number of entries in the database
 * @apiSuccess {number} pagination.limit The number of entries returned
 * @apiSuccess {number} pagination.cursor The cursor that was used to offset the lookup of entries
 * @apiSuccess {Object[]} entries The book objects retrieved
 * @apiSuccess {number} entries.id The ID of the book
 * @apiSuccess {number} entries.isbn13 The ISBN-13 of the book
 * @apiSuccess {string} entries.authors The authors of the book
 * @apiSuccess {string} entries.publication_year The publication year of the book
 * @apiSuccess {string} entries.original_title The original title of the book
 * @apiSuccess {string} entries.title The title of the book
 * @apiSuccess {number} entries.rating_1_star The number of 1-star ratings
 * @apiSuccess {number} entries.rating_2_star The number of 2-star ratings
 * @apiSuccess {number} entries.rating_3_star The number of 3-star ratings
 * @apiSuccess {number} entries.rating_4_star The number of 4-star ratings
 * @apiSuccess {number} entries.rating_5_star The number of 5-star ratings
 * @apiSuccess {string} entries.image_url The URL of the book cover image
 * @apiSuccess {string} entries.image_small_url The URL of the small book cover image
 *
 * @apiError (400: Invalid parameter) {String} message "Query parameter not of required type - please refer to documentation"
 * when a query parameter is not one of the valid choices
 * @apiError (500: Server error) {String} message "server error - contact support"
 * when there is a database error
 */
booksRouter.get('/cursor', async (request: Request, response: Response) => {
    const theQuery = `SELECT *
                      FROM books
                      WHERE id > $2
                      ORDER BY id
                      LIMIT $1`;

    // defaults
    const limit: number =
        validationFunctions.isNumberProvided(request.query.limit) &&
        +request.query.limit > 0
            ? +request.query.limit
            : 10;
    const cursor: number =
        validationFunctions.isNumberProvided(request.query.cursor) &&
        +request.query.cursor >= 0
            ? +request.query.cursor
            : 0;

    const values = [limit, cursor];
    const { rows } = await pool.query(theQuery, values);
    const result = await pool.query(`SELECT COUNT(*) FROM books`);
    const count = result.rows[0].count;

    response.send({
        //entries: rows.map((row) => toBook(row)),
        entries: rows
            .map(({ book_id, ...rest }) => rest)
            .map((row) => toBook(row)),
        pagination: {
            totalRecords: count,
            limit,
            cursor: rows
                .map((row) => row.id)
                .reduce((max, id) => (id > max ? id : max)),
        },
    });
});

/**
 * @api {post} /books/ Add a book
 *
 * @apiDescription Request to add a new book to the database.
 *
 * @apiName AddBook
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiBody {number} isbn13 The ISBN-13 of the book
 * @apiBody {string} authors The authors of the book
 * @apiBody {number} publication_year The publication year of the book
 * @apiBody {string} original_title The original title of the book
 * @apiBody {string} title The title of the book
 * @apiBody {number} rating_1_star The number of 1-star ratings
 * @apiBody {number} rating_2_star The number of 2-star ratings
 * @apiBody {number} rating_3_star The number of 3-star ratings
 * @apiBody {number} rating_4_star The number of 4-star ratings
 * @apiBody {number} rating_5_star The number of 5-star ratings
 * @apiBody {string} image_url The URL of the book cover image
 * @apiBody {string} small_image_url The URL of the small book cover image
 *
 * @apiSuccess {String} message Success message confirming the book was added
 *
 * @apiError (400: Missing parameter) {String} message "[Parameter] not provided - please refer to documentation"
 * when a required parameter is not provided
 * @apiError (400: Invalid parameter type) {String} message "[Parameter] must be a [type] - please refer to documentation"
 * when a parameter is not of the required type
 * @apiError (500: Server error) {String} message "server error - contact support"
 * when there is a database error
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
            request.body.publication_year === null ||
            request.body.publication_year === undefined
        ) {
            response.status(400).send({
                message:
                    'Publication year not provided - please refer to documentation',
            });
        } else if (!isNumberProvided(request.body.publication_year)) {
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
            request.body.rating_1_star === null ||
            request.body.rating_1_star === undefined
        ) {
            request.body.rating_1_star = 0;
            next();
        } else if (!isNumberProvided(request.body.rating_1_star)) {
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
            request.body.rating_2_star === null ||
            request.body.rating_2_star === undefined
        ) {
            request.body.rating_2_star = 0;
            next();
        } else if (!isNumberProvided(request.body.rating_2_star)) {
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
            request.body.rating_3_star === null ||
            request.body.rating_3_star === undefined
        ) {
            request.body.rating_3_star = 0;
            next();
        } else if (!isNumberProvided(request.body.rating_3_star)) {
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
            request.body.rating_4_star === null ||
            request.body.rating_4_star === undefined
        ) {
            request.body.rating_4_star = 0;
            next();
        } else if (!isNumberProvided(request.body.rating_4_star)) {
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
            request.body.rating_5_star === null ||
            request.body.rating_5_star === undefined
        ) {
            request.body.rating_5_star = 0;
            next();
        } else if (!isNumberProvided(request.body.rating_5_star)) {
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

/**
 * @api {patch} /books/ratings/:isbn Update a book's ratings
 *
 * @apiDescription Request to update rating counts for a specific book identified by ISBN.
 *
 * @apiName UpdateBookRatings
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiParam {string} isbn The ISBN-13 of the book to be updated
 *
 * @apiBody {number} ratingType The star rating to be updated (1-5)
 * @apiBody {number} value The value to set/add/subtract to the rating count (non-negative integer)
 * @apiBody {string} [action="set"] The operation to perform: "set" (replace value) or "increment" (add to current value) or "decrement" (subtract from current value)
 *
 * @apiSuccess {Object} result The updated book object
 * @apiSuccess {number} result.id The ID of the book
 * @apiSuccess {number} result.isbn13 The ISBN-13 of the book
 * @apiSuccess {string} result.authors The authors of the book
 * @apiSuccess {string} result.publication The publication year of the book
 * @apiSuccess {string} result.original_title The original title of the book
 * @apiSuccess {string} result.title The title of the book
 * @apiSuccess {Object} result.ratings The updated ratings object
 * @apiSuccess {number} result.ratings.average The new average rating
 * @apiSuccess {number} result.ratings.count The new total rating count
 * @apiSuccess {number} result.ratings.rating_1 Updated 1-star count
 * @apiSuccess {number} result.ratings.rating_2 Updated 2-star count
 * @apiSuccess {number} result.ratings.rating_3 Updated 3-star count
 * @apiSuccess {number} result.ratings.rating_4 Updated 4-star count
 * @apiSuccess {number} result.ratings.rating_5 Updated 5-star count
 * @apiSuccess {Object} result.images Cover URLs
 * @apiSuccess {string} result.images.large Large cover image URL
 * @apiSuccess {string} result.images.small Small cover image URL
 *
 * @apiError (400: Invalid ISBN) {String} message "Invalid ISBN format - must be 13 digits"
 * when the ISBN is not a valid 13-digit number
 * @apiError (400: Invalid rating type) {String} message "Rating type must be between 1-5"
 * when the rating type is not between 1 and 5
 * @apiError (400: Invalid value) {String} message "Value must be a non-negative integer"
 * when the value is not a non-negative integer
 * @apiError (400: Invalid action) {String} message "Action must be either 'set', 'increment', or 'decrement'"
 * when the action is not one of the valid options
 * @apiError (404: Book not found) {String} message "Book not found for ISBN [isbn]"
 * when the book with the given ISBN does not exist
 * @apiError (500: Server error) {String} message "server error - contact support"
 * when there is a database error
 */
booksRouter.patch(
    '/ratings/:isbn',
    //ISBN Validation
    (request: Request, response: Response, next: NextFunction) => {
        const isbn = request.params.isbn;
        if (!/^\d{13}$/.test(isbn)) {
            return response.status(400).send({
                message: 'Invalid ISBN format - must be 13 digits',
            });
        }
        next();
    },
    //Rating Type Validation
    (request: Request, response: Response, next: NextFunction) => {
        const ratingType = request.body.ratingType;
        if (!validationFunctions.isNumberProvided(ratingType)) {
            return response.status(400).send({
                message:
                    'Rating type must be a number - please refer to documentation',
            });
        }
        if (ratingType < 1 || ratingType > 5) {
            return response.status(400).send({
                message:
                    'Rating type must be between 1-5 - please refer to documentation',
            });
        }
        next();
    },
    //Value Validation
    (request: Request, response: Response, next: NextFunction) => {
        const value = request.body.value;
        if (!validationFunctions.isNumberProvided(value)) {
            return response.status(400).send({
                message:
                    'Value must be a number - please refer to documentation',
            });
        }
        if (!Number.isInteger(value) || value < 0) {
            return response.status(400).send({
                message:
                    'Value must be a whole number (non-negative integer) - please refer to documentation',
            });
        }
        next();
    },
    //Action Validation
    (request: Request, response: Response, next: NextFunction) => {
        const action = request.body.action || 'set'; // Default to 'set'
        if (!['set', 'increment', 'decrement'].includes(action)) {
            return response.status(400).send({
                message:
                    "Action must be either 'set', 'increment', or 'decrement' - please refer to documentation",
            });
        }
        next();
    },
    async (request: IJwtRequest, response: Response) => {
        const isbn = request.params.isbn;
        const { ratingType, value } = request.body;
        const action = request.body.action || 'set'; // Default to 'set'

        try {
            const ratingColumn = `rating_${ratingType}_star`;
            let operation: string;

            switch (action) {
                case 'increment':
                    operation = `${ratingColumn} + $1`;
                    break;
                case 'decrement':
                    operation = `GREATEST(${ratingColumn} - $1, 0)`; // Ensure it doesn't go below 0
                    break;
                case 'set':
                default:
                    operation = `$1`;
                    break;
            }

            const updateQuery = `
                UPDATE books
                SET ${ratingColumn} = ${operation}
                WHERE isbn13 = $2
                RETURNING *;
            `;

            const result = await pool.query(updateQuery, [value, isbn]);

            if (result.rowCount === 0) {
                return response.status(404).send({
                    message: `Book not found for ISBN ${isbn}`,
                });
            }

            const updatedBook = toBooks([result.rows[0]])[0];
            return response.status(200).send({
                result: updatedBook,
            });
        } catch (error) {
            console.error('DB Query error on PATCH books/ratings', error);
            return response.status(500).send({
                message: 'server error - contact support',
            });
        }
    }
);

/**
 * @api {delete} /books/rangeOfBooks Delete books by author
 *
 * @apiDescription Request to delete all books from the database that contain the given author.
 *
 * @apiName DeleteBooksByAuthor
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiParam {string} [authors] The author of the books to delete
 *
 * @apiSuccess {String} message Success message confirming deletion
 * @apiSuccess {Object[]} deletedBooks The deleted book objects
 * @apiSuccess {number} deletedBooks.id The ID of the book
 * @apiSuccess {number} deletedBooks.isbn13 The ISBN-13 of the book
 * @apiSuccess {string} deletedBooks.authors The authors of the book
 * @apiSuccess {string} deletedBooks.publication The publication year of the book
 * @apiSuccess {string} deletedBooks.original_title The original title of the book
 * @apiSuccess {string} deletedBooks.title The title of the book
 * @apiSuccess {Object} deletedBooks.ratings The ratings of the book
 * @apiSuccess {number} deletedBooks.ratings.average The average rating
 * @apiSuccess {number} deletedBooks.ratings.count Total rating count
 * @apiSuccess {number} deletedBooks.ratings.rating_1 1-star ratings
 * @apiSuccess {number} deletedBooks.ratings.rating_2 2-star ratings
 * @apiSuccess {number} deletedBooks.ratings.rating_3 3-star ratings
 * @apiSuccess {number} deletedBooks.ratings.rating_4 4-star ratings
 * @apiSuccess {number} deletedBooks.ratings.rating_5 5-star ratings
 * @apiSuccess {Object} deletedBooks.images The book images
 * @apiSuccess {string} deletedBooks.images.large URL of large image
 * @apiSuccess {string} deletedBooks.images.small URL of small image
 *
 * @apiError (400: No author provided) {String} message "Author not provided - please refer to documentation"
 * when the author is not provided
 * @apiError (404: No books found) {String} message "No books found for author [author]"
 * when no books are found for the given author
 * @apiError (500: Server error) {String} message "server error - contact support"
 * when there is a database error
 */
booksRouter.delete(
    '/rangeOfBooks',
    async (request: Request, response: Response) => {
        if (
            request.body.authors == null ||
            request.body.authors == undefined ||
            !validationFunctions.isStringProvided(request.body.authors)
        ) {
            return response.status(400).send({
                message: 'Author not provided - please refer to documentation',
            });
        }

        try {
            const theQuery = `DELETE
                              FROM books
                              WHERE authors ILIKE $1 RETURNING *`;
            const values = [request.body.authors];
            const { rows } = await pool.query(theQuery, values);

            if (rows.length === 0) {
                return response.status(404).send({
                    message: `No books found for author ${request.body.authors}`,
                });
            } else {
                response.status(200).send({
                    message: `Books by author ${request.body.authors} deleted successfully`,
                    deletedBooks: toBooks(rows),
                });
            }
        } catch(error) {
            console.error('DB Query error on DELETE books', error);
            return response.status(500).send({
                message: 'server error - contact support',
            });
        }
    }
);

/**
 * @api {delete} /books/:isbn Delete a book by ISBN
 *
 * @apiDescription Request to delete a book from the database using its ISBN-13.
 *
 * @apiName DeleteBook
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiParam {String} isbn The ISBN-13 of the book to delete
 *
 * @apiSuccess {String} message Success message confirming deletion
 * @apiSuccess {Object} deletedBook The deleted book object
 * @apiSuccess {number} deletedBook.id The ID of the book
 * @apiSuccess {number} deletedBook.isbn13 The ISBN-13 of the book
 * @apiSuccess {string} deletedBook.authors The authors of the book
 * @apiSuccess {string} deletedBook.publication The publication year of the book
 * @apiSuccess {string} deletedBook.original_title The original title of the book
 * @apiSuccess {string} deletedBook.title The title of the book
 * @apiSuccess {Object} deletedBook.ratings The ratings of the book
 * @apiSuccess {number} deletedBook.ratings.average The average rating
 * @apiSuccess {number} deletedBook.ratings.count Total rating count
 * @apiSuccess {number} deletedBook.ratings.rating_1 1-star ratings
 * @apiSuccess {number} deletedBook.ratings.rating_2 2-star ratings
 * @apiSuccess {number} deletedBook.ratings.rating_3 3-star ratings
 * @apiSuccess {number} deletedBook.ratings.rating_4 4-star ratings
 * @apiSuccess {number} deletedBook.ratings.rating_5 5-star ratings
 * @apiSuccess {Object} deletedBook.images The book images
 * @apiSuccess {string} deletedBook.images.large URL of large image
 * @apiSuccess {string} deletedBook.images.small URL of small image
 *
 * @apiError (400: Invalid ISBN) {String} message "Invalid ISBN format - must be 13 digits"
 * when the ISBN is not a valid 13-digit number
 * @apiError (404: Book not found) {String} message "Book not found for ISBN [isbn]"
 * when the book with the given ISBN does not exist
 * @apiError (500: Server error) {String} message "server error - contact support"
 * when there is a database error
 */
booksRouter.delete(
    '/:isbn',
    // ISBN Validation
    (request: Request, response: Response, next: NextFunction) => {
        const isbn = request.params.isbn;
        if (!/^\d{13}$/.test(isbn)) {
            return response.status(400).send({
                message: 'Invalid ISBN format - must be 13 digits',
            });
        }
        next();
    },
    async (request: Request, response: Response) => {
        const isbn = request.params.isbn;

        try {
            const deleteQuery = `
                DELETE FROM books
                WHERE isbn13 = $1
                RETURNING *;
            `;

            const result = await pool.query(deleteQuery, [isbn]);

            if (result.rowCount === 0) {
                return response.status(404).send({
                    message: `Book not found for ISBN ${isbn}`,
                });
            }

            const deletedBook = toBooks([result.rows[0]])[0];
            return response.status(200).send({
                message: 'Book deleted successfully',
                deletedBook,
            });

        } catch (error) {
            console.error('DB Query error on DELETE books', error);
            return response.status(500).send({
                message: 'server error - contact support',
            });
        }
    }
);


export { booksRouter };
