"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

export async function createFeedPost(data: any) {
    try {
        const post = await prisma.feedPost.create({
            data: {
                author: data.author,
                role: data.role,
                location: data.location,
                description: data.description,
                image: data.image || '/feed1.png',
                tags: data.tags || '',
                likes: 0,
                comments: 0,
                projectId: Number(data.projectId)
            }
        });
        revalidatePath('/');
        triggerObsidianSync();
        return post;
    } catch (e: any) {
        console.error(e);
        throw e;
    }
}

/**
 * CURTIDA POR USUÁRIO (Toggle Like)
 */
export async function toggleLikePost(postId: number, userName: string) {
    try {
        // Verifica se o usuário já curtiu este post
        const existingLike = await prisma.feedLike.findUnique({
            where: {
                userName_postId: {
                    userName,
                    postId
                }
            }
        });

        if (existingLike) {
            // Se já curtiu, descurte (remove o like)
            await prisma.feedLike.delete({
                where: { id: existingLike.id }
            });

            const post = await prisma.feedPost.update({
                where: { id: postId },
                data: { likes: { decrement: 1 } }
            });

            revalidatePath('/');
            return { success: true, liked: false, likes: post.likes };
        } else {
            // Se não curtiu, adiciona o like
            await prisma.feedLike.create({
                data: { userName, postId }
            });

            const post = await prisma.feedPost.update({
                where: { id: postId },
                data: { likes: { increment: 1 } }
            });

            revalidatePath('/');
            return { success: true, liked: true, likes: post.likes };
        }
    } catch (e: any) {
        console.error("Erro no toggleLike:", e);
        return { success: false };
    }
}

export async function deleteFeedPost(postId: number, reason: string, user: string) {
    try {
        await prisma.feedPost.delete({
            where: { id: postId }
        });
        revalidatePath('/');
        triggerObsidianSync(); 
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao excluir post:", e);
        return { success: false, error: e.message };
    }
}

export async function addComment(postId: number, content: string, author: string) {
    try {
        const comment = await prisma.feedComment.create({
            data: { content, author, postId }
        });

        await prisma.feedPost.update({
            where: { id: postId },
            data: { comments: { increment: 1 } }
        });

        revalidatePath('/');
        return { success: true, comment };
    } catch (e: any) {
        console.error("Erro ao comentar:", e);
        return { success: false, error: e.message };
    }
}

export async function getComments(postId: number) {
    try {
        return await prisma.feedComment.findMany({
            where: { postId },
            orderBy: { createdAt: 'desc' }
        });
    } catch (e) {
        return [];
    }
}

/**
 * BUSCA QUAIS POSTS O USUÁRIO JÁ CURTIU
 */
export async function getUserLikes(userName: string, projectPostsIds: number[]) {
    try {
        const likes = await prisma.feedLike.findMany({
            where: {
                userName,
                postId: { in: projectPostsIds }
            }
        });
        return likes.map(l => l.postId);
    } catch (e) {
        return [];
    }
}
