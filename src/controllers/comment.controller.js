import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js"


const getVideoComments = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const allComments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
            }
        },
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'comment',
                as: 'likes'
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                        //for that liked button 
                    }
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                content: 1,
                likesCount: 1,
                isLiked: 1,
                owner: {
                    fullName: 1,
                    avatar: 1,
                    username: 1
                },
                createdAt: 1
            }
        }

    ])

const paginateOptions = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
};

const comments = await Comment.aggregatePaginate(
    allComments,
    paginateOptions
);

return res.status(200).json(new ApiResponse(200, comments, "Comments fetched successfully"));


})

const addComment = asyncHandler(async (req, res) => {

    const { content } = req.body
    const { videoId } = req.params

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, 'Video Not Found')
    }
    if (!content) {
        throw new ApiError(400, 'Content required')
    }

    const comment = await Comment.create({
        content: content,
        owner: req.body._id,
        video: videoId
    })

    if (!comment) {
        throw new ApiError(500, "Something went wrong, cannot add comment.")
    }

    return res.status(201).json(new ApiResponse(201, comment, "Comment Added"))
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, 'Content required')
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // comment can only be edited by the owner..

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to edit this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(comment._id, {
        $set: {
            content: content
        }
    },
        {
            // return updated comment
            new: true
        })

    if (!updatedComment) {
        throw new ApiError(500, "Comment can't be updated. Please Try Again")
    }

    return res.json(new ApiResponse(200, updatedComment, "Comment Edited"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    await Comment.findByIdAndDelete(commentId)

    // also like have to be removed from database
    await Like.deleteMany({
        comment: commentId
    })

    return res.json(new ApiResponse(200, commentId, "Comment Deleted"))

})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}