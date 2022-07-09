const HttpError = require('../models/http-error');
const jwt = require('jsonwebtoken');

module.exports = (req,res,next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    try {
        const token = req.headers.authorization.split(' ')[1]; // Authorization Bearer token
        if (!token){
            throw new HttpError('You are not logged in!', 401);
        }
        const decodedToken = jwt.verify(token, 'supersecret_dont_share');
        req.userData = {userId: decodedToken.userId, email: decodedToken.email};
        next();
    }catch (error){
        return next(new HttpError('Authentication failed.', 401));
    }


};