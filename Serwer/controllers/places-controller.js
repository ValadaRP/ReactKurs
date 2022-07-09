const HttpError = require("../models/http-error");
const {validationResult} = require("express-validator")

const uuid = require('uuid');
const {getCoordsForAddress} = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const fs = require('fs');

const mongoose = require('mongoose');



const getPlaceById = async (req, res ,next) => {
    const placeId = req.params.pid; // {pid : 'p1'}

    let place;
    try{
        place = await Place.findById(placeId);
    }catch (error){
        return next(new HttpError("Something went wrong, could not find a place.", 500));
    }



    if (!place){
        throw new HttpError(`Could not find place with id ${placeId}`, 404);
        // Good for error handling with synchronous code
    }
    res.json({place: place.toObject({getters: true})}); // => {place} => place: place}
}

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    let places;
    try {
        places = await Place.find().where('creator').equals(userId);
    }catch (error){
        return next(new HttpError("Something went wrong, could not find a place.", 500));
    }

    if (!places || places.length === 0){
        return next(new HttpError("Could not find place for provided user id",404)); // Its better usage to use next(error) instead of throw error when we work with async/await
    }
    res.json({places: places.map(place => place.toObject({getters: true}))});
}

const createPlace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new HttpError('Invalid inputs passed, please check your data.', 422)
        );
    }

    const { title, description, address, creator } = req.body;

    let coordinates;
    try {
        coordinates = await getCoordsForAddress(address);
    } catch (error) {
        return next(error);
    }

    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: req.file.path,
        creator
    });

    let user;
    try {
        user = await User.findById(creator);
    } catch (err) {
        const error = new HttpError('Creating place failed, please try again', 500);
        return next(error);
    }

    if (!user) {
        const error = new HttpError('Could not find user for provided id', 404);
        return next(error);
    }



    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess });
        user.places.push(createdPlace);
        await user.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError(
            'Creating place failed, please try again.',
            500
        );
        return next(error);
    }

    res.status(201).json({ place: createdPlace });
};



const updatePlace = async (req,res,next) => {
    const placeId = req.params.pid;
    const { title, description} = req.body;

    let place;
    try{
        place = await Place.findById(placeId); // Finding place in database by id
        place.title = title;
        place.description = description;
    }catch (error){
        return next(new HttpError("Something went wrong, could not update place.", 500));
    }

    if (place.creator.toString() !== req.userData.userId){
        return next(new HttpError("You are not allowed to edit this place.", 401));
    }

    if (!place){
        throw new HttpError(`Could not find place with id ${placeId}`, 404);
    }

        try{
            await place.save(); // Saving the updated place to the database  method => save()
        }catch (error){
            return next(new HttpError("Something went wrong, could not update place.", 500));
        }
        res.status(200).json({place: place.toObject({getters: true})});
};

const deletePlace = async (req,res,next) => {
    const placeId = req.params.pid;

    let place;
    try{
        place = await Place.findById(placeId).populate('creator'); // Finding place in database by id

    }catch (error){
        return next(new HttpError("Something went wrong, could not delete place.", 500));
    }

    if (place.creator.id !== req.userData.userId){
        return next(new HttpError("You are not allowed to delete this place.", 403));
    }

    const imagePath = place.image;

    try{
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.remove({ session: sess }); // removing the place from the database  method => remove()
        place.creator.places.pull(place); //Reference to json object in user.places delete contected user
        await place.creator.save({ session: sess }); // saving the updated user to the database  method => save()
        await sess.commitTransaction();

    }catch (error){
        return next(new HttpError("Something went wrong, could not delete place.", 500));
    }

    fs.unlink(imagePath, (err) => {
        console.log(err);
    });

    if (!place){
        return next( new HttpError(`Could not find place with id ${placeId}`, 404));
    }

    res.status(200).json({message: 'Succesfully delete'});
};


exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;