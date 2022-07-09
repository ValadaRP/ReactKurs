const HttpError = require("../models/http-error");

const uuid = require('uuid');
const User = require("../models/user");
const mongoose = require('mongoose');
const {validationResult} = require("express-validator");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const getUsers = async (req,res,next) => {
    let users;
    try{
        users = await User.find({}, '-password');
    }catch (error){
        return next(new HttpError('Something went wrong, could not find users.', 500));
    }

    res.status(200).json({users: users.map(user => user.toObject({getters: true}))});
};

const signUpUser = async (req,res,next) => {
    const errors = validationResult(req);
    const { name, email, password } = req.body;

    if (!errors.isEmpty()) {
        return next(
            new HttpError('Invalid inputs passed, please check your data.', 422)
        );
    }

    let existingUser;
    try{
        existingUser = await User.findOne({ email: email });
    }catch (error){
        return next(new HttpError('Something went wrong, could not find a user.', 500));
    }
    if (existingUser){
        return  next(new HttpError('User already exists!', 422));
    }


    let hashedPassword;
    try{
        hashedPassword = await bcrypt.hash(password, 12);
    }catch (error){
        return next(new HttpError('Something went wrong, could not create user.', 500));
    }


    const createdUser = new User({
        name,
        email,
        image: req.file.path,
        password: hashedPassword,
        places: []
    });

    try{
        await createdUser.save();
    }catch (error){
        return next(new HttpError('Something went wrong, could not create a user.', 500));
    }

    let token;
    try{
        token = jwt.sign({userId: createdUser.id, email: createdUser.email}, 'supersecret_dont_share', {expiresIn: '1h'});
    }catch (error){
        return next(new HttpError('Something went wrong, could not create a user.', 500));
    }


    res.status(201).json({userId: createdUser.id, email: createdUser.email, token: token});
};

const logInUser = async (req,res,next) => {
    const { email, password } = req.body;

    let existingUser;

    try {
        existingUser = await User.findOne({ email: email });
    } catch (err) {
        const error = new HttpError(
            'Logging in failed, please try again later.',
            500
        );
        return next(error);
    }

    if (!existingUser) {
        const error = new HttpError(
            'Invalid credentials, could not log you in.',
            401
        );
        return next(error);
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (err) {
        const error = new HttpError(
            'Could not log you in, please check your credentials and try again.',
            500
        );
        return next(error);
    }

    if (!isValidPassword) {
        const error = new HttpError(
            'Invalid credentials, could not log you in.',
            401
        );
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            { userId: existingUser.id, email: existingUser.email },
            'supersecret_dont_share',
            { expiresIn: '1h' }
        );
    } catch (err) {
        const error = new HttpError(
            'Logging in failed, please try again later.',
            500
        );
        return next(error);
    }

    res.status(200).json({ userId: existingUser.id, email: existingUser.email, token: token});
}

const deleteUser = async (req,res,next) => {
    const placeId = req.params.uid;

    let user;
    try {
        user = await User.findById(placeId).populate('places');

    }catch (error){
        return next(new HttpError('Something went wrong, could not find user.', 500));
    }

    try{
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await user.remove({ session: sess });
        user.places.forEach(place => place.remove());
        await sess.commitTransaction();

    }catch (error){
        console.log(error);
        return next(new HttpError('Something went wrong, could not delete user.', 500));

    }
    res.status(200).json({message: 'User was deleted succesfully!'});
}


exports.getUsers = getUsers;
exports.signUpUser = signUpUser;
exports.logInUser = logInUser;
exports.deleteUser = deleteUser;