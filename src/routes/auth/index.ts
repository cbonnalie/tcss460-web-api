import express, { Router } from 'express';

import { signinRouter } from './login';
import { registerRouter } from './register';
import { changePassRouter } from './changepass';
import { deleteUserRouter } from './delete_user';

const authRoutes: Router = express.Router();

authRoutes.use(
    signinRouter,
    registerRouter,
    changePassRouter,
    deleteUserRouter
);

export { authRoutes };
