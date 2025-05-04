// express is the framework we're going to use to handle requests
import express, { Request, Response, Router, NextFunction } from 'express';
import { checkToken } from '../../core/middleware/jwt';
import { IJwtRequest } from '../../core/models/JwtRequest.model';

import {
    pool,
    validationFunctions,
    credentialingFunctions,
} from '../../core/utilities';

export interface Auth {
    email: string;
    password: string;
}

export interface AuthRequest extends Request {
    auth: Auth;
}

const isStringProvided = validationFunctions.isStringProvided;
const generateHash = credentialingFunctions.generateHash;
const generateSalt = credentialingFunctions.generateSalt;

const changePassRouter: Router = express.Router();

/**
 * @apiDefine JWT
 * @apiHeader {String} Authorization The string "Bearer " + a valid JSON Web Token (JWT).
 */

/**
 * @api {patch} /changePassword Request to change user's password
 *
 * @apiDescription Request to change the currently signed in user's password.
 *
 * @apiName PatchPassword
 * @apiGroup Auth
 *
 * @apiUse JWT
 *
 * @apiBody {String} oldPassword the user's old password
 * @apiBody {String} newPassword the user's new password
 *
 * @apiSuccess {String} message "Password changed successfully"
 *
 * @apiError (403: Forbidden) {String} message "Token is not valid"
 * @apiError (401: Unauthorized) {String} message "Auth token is not supplied"
 * @apiError (400: Invalid type) {String} message "Request body values are not of required type"
 * @apiError (400: Invalid length) {String} message "Password needs to be 7 or more characters"
 * @apiError (400: Invalid Credentials) {String} message "The supplied account id from the JWT does not exist or the supplied password does not match"
 * @apiError (500: Server error) {String} message "server error - contact support"
 */
changePassRouter.patch(
    '/changePassword',
    checkToken,
    (request: Request, response: Response, next: NextFunction) => {
        if (
            isStringProvided(request.body.oldPassword) &&
            isStringProvided(request.body.newPassword)
        ) {
            next();
        } else {
            response.status(400).send({
                message: 'Request body values are not of required type',
            });
        }
    },
    (request: Request, response: Response, next: NextFunction) => {
        if (request.body.newPassword.length > 7) {
            next();
        } else {
            response.status(400).send({
                message: 'Password needs to be 7 or more characters',
            });
        }
    },
    (request: IJwtRequest, response: Response, next: NextFunction) => {
        const accountId = request.claims.id;

        const theQuery = `SELECT salted_hash, salt FROM Account_Credential WHERE account_id = $1`;
        const values = [accountId];

        pool.query(theQuery, values)
            .then((result) => {
                if (result.rowCount !== 1) {
                    console.error('User not found or duplicate credentials');
                    return response.status(400).send({
                        message:
                            'The supplied account id from the JWT does not exist or the supplied password does not match',
                    });
                }

                const { salt, salted_hash: storedSaltedHash } = result.rows[0];
                const providedSaltedHash = generateHash(
                    request.body.oldPassword,
                    salt
                );

                if (storedSaltedHash !== providedSaltedHash) {
                    console.error('Old password did not match');
                    return response.status(400).send({
                        message:
                            'The supplied account id from the JWT does not exist or the supplied password does not match',
                    });
                }

                next();
            })
            .catch((error) => {
                console.error(
                    'DB Query error during password verification:',
                    error
                );
                response
                    .status(500)
                    .send({ message: 'server error - contact support' });
            });
    },
    (request: IJwtRequest, response: Response) => {
        const accountId = request.claims.id;

        const newSalt = generateSalt(32);
        const newSaltedHash = generateHash(request.body.newPassword, newSalt);

        const updateQuery = `UPDATE Account_Credential SET salted_hash = $1, salt = $2 WHERE account_id = $3 RETURNING credential_id`;
        const updateValues = [newSaltedHash, newSalt, accountId];

        pool.query(updateQuery, updateValues)
            .then((updateResult) => {
                if (updateResult.rowCount === 1) {
                    response
                        .status(200)
                        .send({ message: 'Password changed successfully' });
                } else {
                    console.error('Failed to update password');
                    response
                        .status(500)
                        .send({ message: 'server error - contact support' });
                }
            })
            .catch((error) => {
                console.error('Error updating password:', error);

                response
                    .status(500)
                    .send({ message: 'server error - contact support' });
            });
    }
);

export { changePassRouter };
