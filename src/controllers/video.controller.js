import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    const pipeline = [];

    // created a search index named "default" in mongoDB atlas with field mapppings title and description
    // Field mappings specify which fields within your documents should be indexed for text search.
    
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }


    if (query) {
        pipeline.push({
            $search: {
                index: "default",
                text: {
                    query: query,
                    path: ["title", "description"] //search only on title, desc
                }
            }
        });
    }

    pipeline.push({ $match: { isPublished: true } });


    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            fullName:1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res.status(200).json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!title || !description) {
        throw new ApiError(400, 'Title and description are required')
    }

    const videoPath = req.files?.videoFile[0]?.path
    const thumbnailPath = req.files?.thumbnail[0]?.path

    if (!videoPath) {
        throw new ApiError(400, 'Video is required')
    }
    if (!thumbnailPath) {
        throw new ApiError(400, 'Thumbnail is required')
    }

    const videoFile = await uploadOnCloudinary(videoPath)
    const thumbnail = await uploadOnCloudinary(thumbnailPath)

    if (!videoFile) {
        throw new ApiError(500, 'Failed to upload Video')
    }

    if (!thumbnail) {
        throw new ApiError(500, 'Failed to upload Thumbnail')
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user._id,
        duration:videoFile.duration,
        isPublished: true
    })

    if (!video) {
        throw new ApiError(500, 'Failed to publish video')
    }

    return res.status(201).json(new ApiResponse(201, video, "Video uploaded successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video Id')
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                // in user we can get the subscriber count and also if the watcher is subscribed or not
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",  // id of user as in sub-pipeline
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            // for button
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [req.user._id, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            },
                            subscriberCount: {
                                $size: "$subscribers"
                            }
                        }
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            isSubscribed: 1,
                            subscriberCount: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind:"$owner"
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                likesCount: {
                    $size: "$likes"
                }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                duration: 1,
                "videoFile.url": 1,
                "thumbnail.url": 1,
                "owner.fullName": 1,
                "owner.username": 1,
                "owner.avatar": 1,
                "owner.isSubscribed": 1,
                "owner.subscriberCount": 1,
                isPublished: 1,
                isLiked: 1,
                likesCount: 1
            }
        }
    ]);

    if (!video.length) {
        throw new ApiError(404, 'Video not found');
    }

    // adding to watch history if user account exists
    if(req.user?._id){
        await User.findByIdAndUpdate(req.user?._id, {
            $addToSet: {
                watchHistory: videoId
            }
        });
    }

    res.status(200).json(new ApiResponse(200, video[0], "Video fetched successfully"));
}); 

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description} = req.body
    const thumbnailPath = req.files?.thumbnail[0]?.path
    let updatedFields= {}
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, 'Invalid video Id')
    }
    
    const video = await Video.findById(videoId)
    
    if(!video){
        throw new ApiError(404, 'Video not found')
    }
    
    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, 'You are not authorized to update this video')
    }

    if(thumbnailPath){
        const thumbnail = await uploadOnCloudinary(thumbnailPath)
        if(!thumbnail.url){
            throw new ApiError(500, 'Failed to upload Thumbnail')
        }


        const response = await deleteFromCloudinary(video.thumbnail)
        if (!response.success) {
            throw new ApiError(500, "Failed to delete the resource")
        }

        updatedFields.thumbnail = thumbnail.url
    }
    
    if (title) {
        updatedFields.title = title;
    }

    if (description) {
        updatedFields.description = description;
    }

    if(!(title&&description&&thumbnailPath)){
        throw new ApiError(400, 'Nothing to update')
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId, updatedFields, { new: true })
    
    return new res.status(200).json(new ApiResponse(200,updateVideo,"Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video Id')
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, 'Video not found')
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to delete this video')
    }

    const videoResponse = await deleteFromCloudinary(video.videoFile)
    if (!videoResponse.success) {
        throw new ApiError(500, "Failed to delete the video resource")
    }

    const thumbnailResponse = await deleteFromCloudinary(video)
    if (!thumbnailResponse.success) {
        throw new ApiError(500, "Failed to delete the thumbnail resource")
    }

    await Video.findByIdAndDelete(videoId)

    // also likes and comments have to be removed from database
    await Like.deleteMany({
        video: videoId
    })

    await Comment.deleteMany({
        video: videoId
    })

    return res.status(200).json(new ApiResponse(200, {}, 'Video deleted successfully'));


})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video Id')
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, 'Video not found')
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to toggle publish of this video')
    }

    const togglePublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !(video?.isPublished)
            }
        },
        { new: true }
    );

    if(!togglePublish){
        throw new ApiError(500, 'Failed to toggle publish status')
    }

    return res.status(200).json(new ApiResponse(200, togglePublish, 'Publish status toggled successfully'))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}