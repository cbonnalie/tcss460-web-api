import express, { Router } from 'express';

import { signinRouter } from './login';
import { registerRouter } from './register';
import { changePassRouter } from './changepass';

const authRoutes: Router = express.Router();

authRoutes.use(signinRouter, registerRouter, changePassRouter);

export { authRoutes };
