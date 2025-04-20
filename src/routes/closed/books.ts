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
        const theQuery = `SELECT *
                          FROM BOOKS
                          WHERE isbn13 = $1`;
        const value = [request.params.isbn];

        pool.query(theQuery, value)
            .then((result) => {
                if (result.rows.length === 1) {
                    console.log('Raw DB row:', JSON.stringify(result.rows[0], null, 2));
                    const book = toBook(result.rows[0]);
                    console.log('Transformed book:', JSON.stringify(book, null, 2));
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