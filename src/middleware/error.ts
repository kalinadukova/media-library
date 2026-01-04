import type {NextFunction, Request, Response} from "express";

export function errorMiddleware(err: any, _request: Request, response: Response, _response: NextFunction) {
    console.log('Error middleware: ', err)

    if (err.name === "UnauthorizedError") {
        return response.status(401).json({
            error: "Unauthorized",
            message: err.message,
        });
    }

    if (err.statusCode) {
        return response.status(err.statusCode).json({
            error: err.name ?? "An error occurred. Please try again.",
            message: err.message,
        });
    }

    return response.status(500).json({
        error: "Internal Server Error",
        message: "Something went wrong on our side. Please try again later.",
    });
}
