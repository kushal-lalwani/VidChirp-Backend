import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (filePath) => {
    try {
        if(!filePath){
            return null;
        }
        
        let response = await cloudinary.uploader.upload(filePath,{
            resource_type:auto
        })
        console.log("Response : " + response);
        console.log("Uploaded Successfully");
        return response;   // or response.url 

    } catch (error) {
        fs.unlinkSync(filePath)  // removing locally save temp file as upload failed
        return null;
    }
} 


export {uploadOnCloudinary}