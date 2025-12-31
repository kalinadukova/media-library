import {expressjwt} from "express-jwt";

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticationMiddleware = expressjwt({
    secret: JWT_SECRET,
    algorithms: ["HS256"],
});
