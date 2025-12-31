import {v2 as cloudinary} from "cloudinary";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
});

export const uploadImage = async (buffer: Buffer, publicId: string): Promise<any> => {
    return new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                public_id: publicId,
                resource_type: "image",
                quality_analysis: true,
                colors: true,
                categorization: "google_tagging",
                auto_tagging: 0.8,
                type: "authenticated",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        stream.end(buffer);
    });
};

export function getSignedURL(publicId: string, expiresInSeconds = 60 * 60 * 24) {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    return cloudinary.url(publicId, {
        type: "authenticated",
        sign_url: true,
        secure: true,
        expires_at: expiresAt,
    });
}

export const deleteImage = async (publicId: string) => {
    return await cloudinary.uploader.destroy(publicId);
}