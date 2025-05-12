// express is the framework we're going to use to handle requests
import express, { Request, Response, Router, NextFunction } from 'express';
import { checkToken } from '../../core/middleware/jwt';
import { IJwtRequest } from '../../core/models/JwtRequest.model';

import { pool } from '../../core/utilities';

export interface Auth {
    email: string;
    password: string;
}

export interface AuthRequest extends Request {
    auth: Auth;
}

const deleteUserRouter: Router = express.Router();

/**
 * @apiDefine JWT
 * @apiHeader {String} Authorization The string "Bearer " + a valid JSON Web Token (JWT).
 */

/**
 * @api {patch} /deleteAccount Request to delete user
 *
 * @apiDescription Request to delete the currently signed-in user.
 *
 * @apiName DeleteAccount
 * @apiGroup User
 *
 * @apiUse JWT
 *
 * @apiSuccess {String} message "User account deleted successfully."
 * @apiSuccess {account} Details of the deleted account.
 * @apiSuccess {number} account.account_id The id of the deleted account.
 * @apiSuccess {string} account.firstname The first name of the deleted account.
 * @apiSuccess {string} account.lastname The last name of the deleted account.
 * @apiSuccess {string} account.username The username of the deleted account.
 * @apiSuccess {string} account.email The email of the deleted account.
 * @apiSuccess {string} account.phone The phone number of the deleted account.
 * @apiSuccess {number} account.role The role of the deleted account.
 *
 * @apiError (403: Forbidden) {String} message "Token is not valid"
 * @apiError (401: Unauthorized) {String} message "Auth token is not supplied"
 * @apiError (400: Invalid Credentials) {String} message "The supplied account id from the JWT does not exist"
 * @apiError (400: Invalid Credentials) {String} message "The supplied account id from the JWT is the id for multiple accounts"
 * @apiError (500: Server error) {String} message "server error - contact support"
 */
deleteUserRouter.delete(
    '/deleteAccount',
    checkToken,
    (request: IJwtRequest, response: Response, next: NextFunction) => {
        const accountId = request.claims.id;

        const theQuery = `DELETE FROM Account_Credential WHERE account_id = $1 RETURNING *`;
        const values = [accountId];

        pool.query(theQuery, values)
            .then((result) => {
                if (result.rowCount === 0) {
                    console.error('User id not found.');
                    return response.status(400).send({
                        message:
                            'The supplied account id from the JWT does not exist',
                    });
                } else if (result.rowCount > 1) {
                    console.error('Multiple users found with id: ' + accountId);
                    return response.status(400).send({
                        message:
                            'The supplied account id from the JWT is the id for multiple accounts',
                    });
                }

                next();
            })
            .catch((error) => {
                console.error('DB Query error:', error);
                response
                    .status(500)
                    .send({ message: 'server error - contact support' });
            });
    },
    (request: IJwtRequest, response: Response) => {
        const accountId = request.claims.id;

        const theQuery = `DELETE FROM Account WHERE account_id = $1 RETURNING *`;
        const values = [accountId];

        pool.query(theQuery, values)
            .then((result) => {
                if (result.rowCount === 0) {
                    console.error('User id not found.');
                    return response.status(400).send({
                        message:
                            'The supplied account id from the JWT does not exist',
                    });
                } else if (result.rowCount > 1) {
                    console.error('Multiple users found with id: ' + accountId);
                    return response.status(400).send({
                        message:
                            'The supplied account id from the JWT is the id for multiple accounts',
                    });
                } else {
                    return response.status(200).send({
                        message: 'User account deleted successfully.',
                        account: result.rows[0],
                    });
                }
            })
            .catch((error) => {
                console.error('DB Query error:', error);
                response
                    .status(500)
                    .send({ message: 'server error - contact support' });
            });
    }
);

export { deleteUserRouter };
