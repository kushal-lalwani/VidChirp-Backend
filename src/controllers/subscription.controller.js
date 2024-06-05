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


export {
    toggleSubscription,
  
}