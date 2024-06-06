import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $group: {
                _id: "$owner",
                totalViews: { $sum: "$views" },
                totalLikes: { $sum: { $size: "$likes" } },
                totalVideos: { $sum: 1 },
            },
        },
    ]);

    const subscribersCount = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $group: {
                _id: null,
                subscribersCount: {
                    $sum: 1,
                },
            },
        },
    ]);

    const channelStats = {
        totalViews: videoStats[0]?.totalViews || 0,
        totalLikes: videoStats[0]?.totalLikes || 0,
        totalVideos: videoStats[0]?.totalVideos || 0,
        subscribersCount: subscribersCount[0]?.subscribersCount || 0,
    };

    return res.status(200).json(
        new ApiResponse(200, channelStats, "Channel Stats Fetched Successfully")
    );
});



const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User Id");
    }

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $project: {
                title: 1,
                thumbnail: 1,
                videoFile: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                owner: {
                    username: "$ownerDetails.username",
                    fullName: "$ownerDetails.fullName",
                    avatar: "$ownerDetails.avatar"
                }
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, videos, "Videos Fetched Successfully"));
});

export {
    getChannelStats,
    getChannelVideos
}