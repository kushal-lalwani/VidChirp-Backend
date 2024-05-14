import mongoose,{Schema} from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const userSchema = new Schema({
    username:{
        type:String,
        required:true,
        lowercase:true,
        unique:true,
        trim:true,
        index:true
    },email:{
        type:String,
        required:true,
        lowercase:true,
        unique:true,
        trim:true
    },
    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar: {
        type : String,
        required: true
    },
    coverImage: {
        type: String
    },
    watchHistory:{
        type:[{
            type:Schema.Types.ObjectId,
            ref:'Video'
        }]
    },
    password:{
        type:String,
        required: [true,"Password is reuired"]
    },
    refreshToken: {
        type:String
    }
},{timestamps:true}) 

userSchema.pre("save", async function(next) {   // pre middleware before modifying password only
    if(!this.isModified("password")) {
        return next();
    }

    this.password = bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password){          // defining methods to inject in schema
    return await bcrypt.compare(password,this.password)   // will send true || false
}

userSchema.methods.generateAccessToken = function(){
    
    //returning jwt
    return jwt.sign({
        _id: this.id,
        email:this.email,
        username: this.username,
        fullname: this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })
}
userSchema.methods.refreshAccessToken = function(){
    return jwt.sign({
        _id: this.id,
        email:this.email,
        username: this.username,
        fullname: this.fullname
    },
    process.env.REFRESH_TOKEN_SECRET,{
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })
}

export const User = mongoose.model('User', userSchema)