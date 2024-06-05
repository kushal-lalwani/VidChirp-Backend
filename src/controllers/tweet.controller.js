import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    const owner = req.user._id

    if (!content) {
        throw new ApiError(400, "Tweet Can't be Empty")
    }

    const tweet = await Tweet.create({
        content: content,
        owner: owner
    })

    if (!tweet) {
        throw new ApiError(500, "Can't create tweet, please try again.")
    }

    return req.status(201), json(new ApiResponse(201, tweet, "Tweet Created Successfully."))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "User",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "Like",
                localField: "_id",
                foreignField: "tweet",
                as: "likes",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                // for liked button
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?.id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                owner: {
                    $first: "$owner"
                }

            }
        },
        {
            $project: {
                owner: 1,
                likesCount: 1,
                isLiked: 1,
                content: 1,
                createdAt: 1
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, tweets, "User Tweets Fetched"))

})

const updateTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params
    const { content } = req.body

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }

    if (!content) {
        throw new ApiError(400, 'Content required')
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Comment not found")
    }

    // can only be edited by the owner

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to edit this comment")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId, {
        $set: {
            content: content
        }
    }, {
        new: true
    })

    if (!updateTweet) {
        throw new ApiError(500,"Can't update Tweet, Please try again.")
    }

    return res.status(200).json(new ApiResponse(200,updatedTweet,"Tweet Updated Successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweetId");
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet")
    }

    await Comment.findByIdAndDelete(commentId)

    // also likes have to be removed from database
    await Like.deleteMany({
        tweet: tweetId
    })

    return res.json(new ApiResponse(200, tweetId, "Tweet Deleted"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}