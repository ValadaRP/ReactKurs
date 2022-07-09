const express = require('express');

const fileUpload = require('../middleware/file-upload');

const router = express.Router();

const userController = require('../controllers/user-controller');

router.get('/',userController.getUsers);

router.post('/signup',fileUpload.single('image'),userController.signUpUser);

router.post('/login',userController.logInUser);

router.delete('/:uid',userController.deleteUser);

module.exports = router;