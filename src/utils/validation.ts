import {RegisterRequest} from "../model/user";


export function validateRegisterUser(request: RegisterRequest): string[] {
    const errors: string[] = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
        errors.push("Invalid email address");
    }

    const password = request.password;
    if (password.length < 8) {
        errors.push("Password must be at least 12 characters long");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
    }

    return errors;
}
