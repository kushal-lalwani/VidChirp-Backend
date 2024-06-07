import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (isValidObjectId(channelId)) {
        return new ApiError(400, "Invalid Channel Id")
    }

    const alreadySubscribed = await Subscription.findOne({
        subscriber:req.user?._id,
        channel: channelId
    })

    if(alreadySubscribed){
        await Subscription.deleteOne({
            subscriber: req.user?._id,
            channel: channelId
        }) 

        return res.status(200).json(new ApiResponse(200,alreadySubscribed._id,"Channel Unsubscribed Successfully"))
    }

    const subscribe = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })

    if(!subscribe){
        return new ApiError(500,"Can't Subscribe, please try again")
    }

    return res.status(201).json(new ApiResponse(201,{isSubscribed:true},"Channel Subscribed Successfully"))



})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid Channel Id")
    }


    const channelSubscribers = await Subscription.aggregate([
        {
            $match:{
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscribers",
            }
        },
        {
            $addFields:{
                subscriberCount: {$size:"$subscribers"}
            }
        },
        {
            $unwind:"$subscribers"
        },
        {
            $project:{
                subscribers:{
                    username:1,
                    fullName:1,
                    avatar:1,
                    _id:1
                },
                subscriberCount:1
            }
        }
        
    ])

    return res.status(200).json(new ApiResponse(200,channelSubscribers,"Channel Subscribers Fetched"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid Channel Id")
    }

    const subscribedTo = await Subscription.aggregate([
        {
            $match:{
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"subscribedTo"
            }
        },
        {
            $unwind:"subscribedTo"
        },
        {
            $project:{
                subscribedTo:{
                    username:1,
                    fullName:1,
                    avatar:1,
                    _id:1
                }
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200,getSubscribedChannels,"Channel Subscribed by User Fetched"))

})


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}


// endpoint to get subscribed channel videos, make another section to get user subscribed channel videos