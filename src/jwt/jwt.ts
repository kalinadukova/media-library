import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = "1h";

export function generateToken(user: any) {
    const claims = {
        sub: user.email,
        sub_id: user.id,
    }
    return jwt.sign(claims, JWT_SECRET, {expiresIn: JWT_EXPIRATION});
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}