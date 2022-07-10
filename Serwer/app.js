const express = require('express');
const path = require('path');

const bodyParser = require('body-parser');
const mongoose = require('mongoose'); // Import database connection
const fs = require('fs'); // Import file system


const placesRoutes = require('./routes/places-routes'); // => {placesRoutes} => placesRoutes: placesRoutes
const usersRoutes = require('./routes/users-routes'); // => {usersRoutes} => usersRoutes: usersRoutes

const app = express();
const HttpError = require('./models/http-error');



app.use(bodyParser.json());

app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    next();
});

app.use('/api/places' ,placesRoutes); // => /api/places
app.use('/api/users', usersRoutes); // Endpoint to user routes

app.use((req,res,next) => {
    const error = new HttpError('Could not find this route.', 404);
    throw error;
});

app.use((error,req,res,next) => {
    if (req.file){
        fs.unlink(req.file.path, (err) => {
            console.log(err);
        });
    }
    if (res.headerSent){
        return next(error);
    }
    res.status(error.code || 500);
    res.json({message: error.message || 'An unknown error occurred!'});
});

mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0x0li.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
    .then(() => {
        app.listen(5000); // port 5000 is the default port for express
        // console.log('Server is up and running on port 5000 and connection to database is successful!');
    })
    .catch(err => {console.log(err)});
