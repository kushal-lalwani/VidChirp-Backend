import dotenv from 'dotenv';
import connectDB from "./db/index.js";
import {app} from './app.js'
// require('dotenv').config({path: './env'});

dotenv.config({
    path: './env'
});

connectDB().
then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`listening om ${process.env.PORT}`);
    })
})
.catch((err) => {console.log(err);})