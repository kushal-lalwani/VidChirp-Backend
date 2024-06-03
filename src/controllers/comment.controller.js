import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const getVideoComments = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    const allComments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            },
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
            },
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'comment',
                as: 'likes'
            },
            $addFields: {
                likesCount: {
                    $size: "likes"
                },
                isLiked: {
                    $cond: {
                        $if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                        //for that liked button 
                    }
                },
                $owner: {
                    $first: "owner"
                }
            },
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

    const {content} = req.body
    const {videoId} = req.params

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,'Video Not Found')
    }
    if(!content){
        throw new ApiError(400,'Content required')
    }
    
    const comment = await Comment.create({
        content: content,
        owner: req.body._id,
        video:videoId
    })

    if(!comment){
        throw new ApiError(500,"Something went wrong, cannot add comment.")
    }

    return res.status(201).json(new ApiResponse(201,comment,"Comment Added"))
})

const updateComment = asyncHandler(async (req, res) => {
    
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}