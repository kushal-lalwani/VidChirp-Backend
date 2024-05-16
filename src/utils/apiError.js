export class ApiError extends Error{
    constructor(
        statusCode,
        message="Something went Wrong",
        errors = [],
        stack=""){
            super(message),
            this.statusCode = statusCode,
            this.errors= errors,
            this.message=message,
            this.success=false,
            this.data  = null

            if(stack){
                this.stack = stack
            }
            else{
                Error.captureStackTrace(this,this.constructor)
            }
        }
}