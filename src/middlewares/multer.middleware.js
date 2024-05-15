import multer from 'multer'

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname)

      // can use different name to avoid files of same name getting overwrited (the file is present for a very short time so oriiginal name can be used here), use file.____ 
    }
  })




  
export const upload = multer({ storage: storage })

  

































































