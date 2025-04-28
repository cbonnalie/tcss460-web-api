import express, { NextFunction, Request, Response, Router } from 'express';
import { IJwtRequest } from '../../core/models';
import { pool, validationFunctions } from '../../core/utilities';
import { IBook } from '../../core/models/book.model';

const booksRouter: Router = express.Router();

function getAverage(
    rating_1: number,
    rating_2: number,
    rating_3: number,
    rating_4: number,
    rating_5: number
): number {
    const totalRatings =
        rating_1 + rating_2 + rating_3 + rating_4 + rating_5;
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
    return (
        rating_1 +
        rating_2 +
        rating_3 +
        rating_4 +
        rating_5
    );
}

function toBook(row): IBook {

    const average = getAverage(row.rating_1_star, row.rating_2_star, row.rating_3_star, row.rating_4_star, row.rating_5_star);
    const count = getRatingCount(row.rating_1_star, row.rating_2_star, row.rating_3_star, row.rating_4_star, row.rating_5_star);

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
            WHERE title ILIKE $1
        `;
        const value = [`%${request.params.title}%`];

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
    '/isbns/',
    (request: Request, response: Response, next: NextFunction) => {
        try {
            const isbn = request.query.isbn;
            if (isbn === null || isbn === undefined) {
                return response.status(400).send({
                    message: 'No query parameter in url - please refer to documentation',
                });
            }

            if (!validationFunctions.isNumberProvided(isbn)) {
                return response.status(400).send({
                    message: 'Query parameter not of required type - please refer to documentation',
                });
            }

            const isbnNumber = Number(isbn);
            if (String(isbnNumber).length != 13) {
                return response.status(400).send({
                    message: 'ISBN not in range - please refer to documentation',
                });
            }

            next();
        } catch (err) {
            next(err);
        }
    },
    async (request: IJwtRequest, response: Response) => {
        try {
            const theQuery = `
                SELECT *
                FROM BOOKS
                WHERE isbn13 = $1
            `;
            const value = [request.query.isbn];

            const result = await pool.query(theQuery, value);

            if (result.rows.length === 1) {
                const book = toBook(result.rows[0]);
                return response.status(200).send({ result: book });
            } else {
                return response.status(404).send({
                    isbn: value,
                    message: 'Book not found for ISBN ' + value
                });
            }
        } catch (error) {
            console.error('DB Query error on GET by ISBN', error);
        }
    }
);

/**
 * @api {get} /books/author/:author Request to retrieve books by author
 *
 * @apiDescription Request to retrieve books from the DB that contain the specified <code>author</code>
 *
 * @apiName GetBooksByAuthor
 * @apiGroup Books
 *
 * @apiUse JWT
 *
 * @apiParam {string} author The author name to search for (partial match, case-insensitive)
 *
 * @apiSuccess {Object[]} books The array of book objects by the specified author
 * @apiSuccess {number} books.id The ID of the book
 * @apiSuccess {number} books.isbn13 The ISBN-13 of the book
 * @apiSuccess {string} books.authors The authors of the book
 * @apiSuccess {string} books.publication The publication year of the book
 * @apiSuccess {string} books.original_title The original title of the book
 * @apiSuccess {string} books.title The title of the book
 * @apiSuccess {Object} books.ratings The ratings of the book
 * @apiSuccess {number} books.ratings.average The average rating
 * @apiSuccess {number} books.ratings.count Total rating count
 * @apiSuccess {number} books.ratings.rating_1 1-star ratings
 * @apiSuccess {number} books.ratings.rating_2 2-star ratings
 * @apiSuccess {number} books.ratings.rating_3 3-star ratings
 * @apiSuccess {number} books.ratings.rating_4 4-star ratings
 * @apiSuccess {number} books.ratings.rating_5 5-star ratings
 * @apiSuccess {Object} books.icons Book cover URLs
 * @apiSuccess {string} books.icons.large Large cover URL
 * @apiSuccess {string} books.icons.small Small cover URL
 *
 * @apiError (400: No query parameter) {String} message "No query parameter in url - please refer to documentation"
 * @apiError (400: Invalid type) {String} message "Query parameter not of required type - please refer to documentation"
 * @apiError (404: No books found) {String} message "No books found by author [author]"
 * @apiError (500: Server error) {String} message "server error - contact support"
 */
booksRouter.get(
    '/author/:author',
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.params.author === null ||
            request.params.author === undefined
        ) {
            response.status(400).send({
                message: 'No query parameter in url - please refer to documentation',
            });
        } else if (
            !validationFunctions.isStringProvided(request.params.author)
        ) {
            response.status(400).send({
                message: 'Query parameter not of required type - please refer to documentation',
            });
        }
        next();
    },
    (request: IJwtRequest, response: Response) => {
        const theQuery = `
            SELECT *
            FROM books
            WHERE authors ILIKE $1
        `;
        const value = [`%${request.params.author}%`];

        pool.query(theQuery, value)
            .then((result) => {
                if (result.rows.length > 0) {
                    const books: IBook[] = toBooks(result.rows);
                    response.status(200).send({
                        books: books,
                    });
                } else {
                    response.status(404).send({
                        message: `No books found by author ${request.params.author}`,
                    });
                }
            })
            .catch((error) => {
                console.error('DB Query error on GET by Author');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);

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
 * @apiParam {number} book_id The ID of the book
 * @apiParam {number} isbn13 The ISBN-13 of the book
 * @apiParam {string} authors The authors of the book
 * @apiParam {number} original_publication_year The original publication year of the book
 * @apiParam {string} original_title The original title of the book
 * @apiParam {string} title The title of the book
 * @apiParam {number} ratings_1 The number of 1-star ratings
 * @apiParam {number} ratings_2 The number of 2-star ratings
 * @apiParam {number} ratings_3 The number of 3-star ratings
 * @apiParam {number} ratings_4 The number of 4-star ratings
 * @apiParam {number} ratings_5 The number of 5-star ratings
 * @apiParam {string} image_url The URL of the large icon
 * @apiParam {string} small_image_url The URL of the small icon
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
    // Book ID
    (request: Request, response: Response, next: NextFunction) => {
        if (
            request.body.book_id === null ||
            request.body.book_id === undefined
        ) {
            response.status(400).send({
                message:
                    'book id not provided - please refer to documentation',
            });
        } else if (
            !validationFunctions.isNumberProvided(request.body.book_id)
        ) {
            response.status(400).send({
                message:
                    'book_id must be a number - please refer to documentation',
            });
        } else {
            next();
        }
    },
    // ISBN-13
    (request: Request, response: Response, next: NextFunction) => {
        if (request.body.isbn13 === null || request.body.isbn13 === undefined) {
            response.status(400).send({
                message:
                    'ISBN not provided - please refer to documentation',
            });
        } else if (!validationFunctions.isNumberProvided(request.body.isbn13)) {
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
                message:
                    'Author not provided - please refer to documentation',
            });
        } else if (
            !validationFunctions.isStringProvided(request.body.authors)
        ) {
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
        } else if (
            !validationFunctions.isNumberProvided(
                request.body.original_publication_year
            )
        ) {
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
        } else if (
            !validationFunctions.isStringProvided(request.body.original_title)
        ) {
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
                message:
                    'Title not provided - please refer to documentation',
            });
        } else if (!validationFunctions.isStringProvided(request.body.title)) {
            response.status(400).send({
                message:
                    'Title must be a string - please refer to documentation',
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
        } else if (
            !validationFunctions.isNumberProvided(request.body.ratings_1)
        ) {
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
        } else if (
            !validationFunctions.isNumberProvided(request.body.ratings_2)
        ) {
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
        } else if (
            !validationFunctions.isNumberProvided(request.body.ratings_3)
        ) {
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
        } else if (
            !validationFunctions.isNumberProvided(request.body.ratings_4)
        ) {
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
        } else if (
            !validationFunctions.isNumberProvided(request.body.ratings_5)
        ) {
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
        } else if (
            !validationFunctions.isStringProvided(request.body.image_url)
        ) {
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
        } else if (
            !validationFunctions.isStringProvided(request.body.small_image_url)
        ) {
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
            INSERT INTO books (id, isbn13, authors, publication_year, original_title, title,
                               rating_1_star, rating_2_star, rating_3_star, rating_4_star, rating_5_star, image_url, image_small_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
        `;
        const values = [
            request.body.book_id,
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
    
