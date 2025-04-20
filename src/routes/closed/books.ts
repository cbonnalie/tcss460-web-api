import express, { NextFunction, Request, Response, Router } from 'express';
import { IJwtRequest } from '../../core/models';
import { pool, validationFunctions } from '../../core/utilities';

const booksRouter: Router = express.Router();

interface IRatings {
    average: number;
    count: number;
    rating_1: number;
    rating_2: number;
    rating_3: number;
    rating_4: number;
    rating_5: number;
}

interface IUrlIcon {
    large: string;
    small: string;
}

interface IBook {
    isbn13: number;
    authors: string;
    publication: number;
    original_title: string;
    title: string;
    ratings: IRatings;
    icons: IUrlIcon;
}

function toBook(row): IBook {
    return {
        isbn13: row.isbn13,
        authors: row.authors,
        publication: row.publication,
        original_title: row.original_title,
        title: row.title,
        ratings: {
            average: row.average,
            count: row.count,
            rating_1: row.rating_1,
            rating_2: row.rating_2,
            rating_3: row.rating_3,
            rating_4: row.rating_4,
            rating_5: row.rating_5,
        },
        icons: {
            large: row.large_icon,
            small: row.small_icon,
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