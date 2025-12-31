import express, {NextFunction, type Request, Response} from "express";
import prisma from "../../prisma/prisma";

import {LoginRequest, RegisterRequest} from "../model/user";

import {generateToken} from "../jwt/jwt";
import {validateRegisterUser} from "../utils/validation";

import bcrypt from "bcrypt";

const router = express.Router();

router.post("/register", async (request: Request, response: Response, next: NextFunction) => {
    try {
        const body = request.body as RegisterRequest;

        const errors = validateRegisterUser(body);
        if (errors.length > 0) {
            return response.status(400).json({errors});
        }

        const email = body.email.trim().toLowerCase();
        const hashedPassword = await bcrypt.hash(body.password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
            select: {
                id: true,
                email: true,
            },
        });

        return response.status(201).json(user);
    } catch (err: any) {
        if (err?.code === "P2002") {
            return response.status(409).json({message: "Email already registered"});
        }
        next(err);
    }
});

router.post("/login", async (request: Request, response: Response, next: NextFunction) => {
    try {
        const body = request.body as LoginRequest;

        const user = await prisma.user.findUnique({
            where: {email: body.email}
        });

        if (!user) {
            return response.status(401).json({message: "Invalid credentials"});
        }

        const isValid = await bcrypt.compare(body.password, user.password);
        if (!isValid) {
            return response.status(401).json({message: "Invalid credentials"});
        }

        const token = generateToken({id: user.id, email: user.email});
        response.status(200).json({token});
    } catch (error) {
        next(error);
    }
});

export default router;