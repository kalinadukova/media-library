import express, {NextFunction, Response} from "express";
import {Request as JWTRequest} from "express-jwt";
import multer from "multer";
import prisma from "../../prisma/prisma";

import {deleteImage, getSignedURL, uploadImage} from "../cloudinary/cloudinary";
import {authenticationMiddleware} from "../middleware/authentication";
import {ShareAssetRequest} from "../model/asset";

const router = express.Router();
router.use(authenticationMiddleware);

const upload = multer({storage: multer.memoryStorage()});

function getQueryParams(request: JWTRequest) {
    const userId = (request.auth as any)?.sub_id;

    const query = request.query;

    const tags = typeof query.tags === "string"
        ? query.tags.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    const mimeType = typeof query.mime_type === "string"
        ? query.mime_type.trim()
        : "";

    let createdAt: { gte: Date; lt: Date } | undefined;

    if (typeof query.created_at === "string") {
        const date = new Date(query.created_at.trim());

        if (!Number.isNaN(date.getTime())) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);

            const end = new Date(start);
            end.setDate(end.getDate() + 1);

            createdAt = {gte: start, lt: end};
        }
    }

    return {
        userId,
        ...(mimeType ? {mimeType} : {}),
        ...(createdAt ? {createdAt} : {}),
        ...(tags.length
                ? {
                    AND: tags.map((name) => ({
                        assetTags: {
                            some: {
                                tag: {name},
                            },
                        },
                    })),
                }
                : {}
        ),
    };
}

router.get("/", async (request: JWTRequest, response: Response, next: NextFunction) => {
    try {
        const page = Math.max(Number(request.query.page) || 1, 1);
        const limit = Math.min(Number(request.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        const whereClause = getQueryParams(request);

        const [assets, total] = await Promise.all([
            prisma.asset.findMany({
                where: whereClause,
                orderBy: {createdAt: "desc"},
                skip: offset,
                take: limit,
                select: {
                    id: true,
                    filename: true,
                    mimeType: true,
                    size: true,
                    createdAt: true,
                    assetTags: {select: {tag: {select: {id: true, name: true}}}},
                },
            }),
            prisma.asset.count({
                where: whereClause,
            }),
        ]);

        const result = assets.map((a) => {
            const tags = a.assetTags.map((t) => t.tag.name);
            const url = getSignedURL(a.filename);

            return {
                id: a.id,
                filename: a.filename,
                mime_type: a.mimeType,
                size: a.size,
                created_at: a.createdAt,
                asset_tags: tags,
                url,
            };
        });

        return response.status(200).json({
            result,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        return next(err);
    }
});

router.post("/", upload.single("file"), async (request: JWTRequest, response: Response, next: NextFunction) => {
    try {
        const file = request.file;
        if (!file) return response.status(400).json({error: "No file uploaded"});

        const userId = (request.auth as any)?.sub_id;

        const uuid = crypto.randomUUID();
        const publicId = `uploads/${uuid}`;

        const result = await uploadImage(file.buffer, publicId);

        const rawTags: string[] = Array.isArray(result?.tags) ? result.tags : [];
        const tags = [...new Set(rawTags.map(t => t.trim().toLowerCase()).filter(Boolean))];

        const created = await prisma.$transaction(async (tx) => {
            const asset = await tx.asset.create({
                data: {
                    filename: result.public_id,
                    mimeType: file.mimetype,
                    size: file.size,
                    userId,
                },
                select: {
                    id: true,
                    filename: true,
                    mimeType: true,
                    size: true,
                    createdAt: true,
                    userId: true,
                },
            });

            if (tags.length) {
                await tx.tag.createMany({
                    data: tags.map((name) => ({name})),
                    skipDuplicates: true,
                });

                const tagRows = await tx.tag.findMany({
                    where: {name: {in: tags}},
                    select: {id: true, name: true},
                });

                await tx.assetTag.createMany({
                    data: tagRows.map((t) => ({assetId: asset.id, tagId: t.id})),
                    skipDuplicates: true,
                });
            }

            return asset;
        });

        if (!created) return response.status(500).json({error: "Unexpected error happening while trying to upload file. Please try again later."});

        return response.status(201).json({
            filename: created.filename,
            mime_type: created.mimeType,
            size: created.size,
            created_at: created.createdAt,
            asset_tags: tags
        });
    } catch (error: any) {
        next(error);
    }
});

router.post("/share", async (request: JWTRequest, response: Response, next: NextFunction) => {
    try {
        const userId = (request.auth as any)?.sub_id;

        const {asset_id, expiration_in_seconds} = request.body as ShareAssetRequest;
        if (!asset_id) return response.status(400).json({message: "Asset_id is required"});

        const asset = await prisma.asset.findFirst({
            where: {id: asset_id, userId},
            select: {id: true, filename: true, mimeType: true},
        });

        if (!asset) {
            return response.status(404).json({message: "Asset not found"});
        }

        const expiration = expiration_in_seconds ?? 60 * 60 * 24;
        if (!Number.isFinite(expiration) || expiration <= 0) {
            return response.status(400).json({message: "Expiration must be a positive number"});
        }

        const presignedUrl = getSignedURL(asset.filename, expiration);

        const expiresAt = new Date(Date.now() + expiration * 1000);

        const share = await prisma.share.upsert({
            where: {presignedUrl},
            update: {expiresAt},
            create: {
                presignedUrl,
                expiresAt: expiresAt,
                assetId: asset.id,
                userId,
            },
            select: {
                id: true,
                presignedUrl: true,
                createdAt: true,
                expiresAt: true,
                assetId: true,
            },
        });

        return response.status(200).json({
            url: share.presignedUrl,
            expires_at: share.expiresAt
        });
    } catch (error) {
        next(error);
    }
});

router.delete("/:id", async (request: JWTRequest, response: Response, next: NextFunction) => {
    try {
        const userId = (request.auth as any)?.sub_id;
        const {id} = request.params;

        const asset = await prisma.asset.findFirst({
            where: {id, userId},
            select: {filename: true,},
        });

        if (!asset) return response.status(404).json({message: "Asset not found"});

        await deleteImage(asset.filename);

        await prisma.asset.delete({where: {id}});

        return response.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;