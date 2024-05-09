import dotenv from 'dotenv';
import connectDB from "./db/index.js";
// require('dotenv').config({path: './env'});

dotenv.config({
    path: ',/env'
});

connectDB();