import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id")
    }

    const liked = await Like.findOne({
        likedBy: req.user?._id,
        video:videoId
    })

    if(!liked){
        await Like.create({
            video:videoId,
            likedBy:req.user._id
        })

        return res.status(200).json(new ApiResponse(200,{isLiked:true},"Video Liked"))
    }

    await Like.findByIdAndDelete(liked?._id)
    return res.status(200).json(new ApiResponse(200,{isLiked:false},"Video Like removed"))

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const liked = await Like.findOne({
        likedBy: req.user?._id,
        comment: commentId
    })

    if (!liked) {
        await Like.create({
            comment: commentId,
            likedBy: req.user._id
        })

        return res.status(200).json(new ApiResponse(200, { isLiked: true }, "Comment Liked"))
    }

    await Like.findByIdAndDelete(liked?._id)
    return res.status(200).json(new ApiResponse(200, { isLiked: false }, "Comment Like removed"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet id")
    }

    const liked = await Like.findOne({
        likedBy: req.user?._id,
        tweet: tweetId
    })

    if (!liked) {
        await Like.create({
            tweet: tweetId,
            likedBy: req.user._id
        })

        return res.status(200).json(new ApiResponse(200, { isLiked: true }, "Tweet Liked"))
    }

    await Like.findByIdAndDelete(liked?._id)
    return res.status(200).json(new ApiResponse(200, { isLiked: false }, "Tweet Like removed"))

}
)

const getLikedVideos = asyncHandler(async (req, res) => {

    const likedVideos = await Like.aggregate([
        {
            $match:{
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:'videos',
                localField:"video",
                foreignField:"_id",
                as:"likedVideos",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails"
                        }
                    },
                    {
                      // to get the object of owner details instead the array (flattening the array using $unwind)!  
                      $unwind:"$ownerDetails"
                    }
                ]
            }
        },
        {
            $project:{
                likedVideos:1,
                owner:1,
                title:1,
                thumbnail:1,
                videoFile:1,
                duration:1,
                views:1,
                ownerDetails:{
                    // for channel name and little circle of avatar
                    username:1,
                    fullName:1,
                    avatar:1
                },
                createdAt:1
            }
        }

    ])

    return res.status(200).json(new ApiResponse(200,likedVideos,"Liked Videos Fetched"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}