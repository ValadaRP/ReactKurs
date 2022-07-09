const mongoose = require('mongoose');

const Product = require('./models/product');

mongoose.connect('mongodb+srv://Valadar:RjKxaUTvMqGhdFSb@cluster0.0x0li.mongodb.net/products_test?retryWrites=true&w=majority'
).then(() => {console.log('Connected to MongoDB')}).catch(err => {console.log('Error:', err.message)});

const createProduct = async (req,res,next) => {
    const createdProduct = new Product({
        name: req.body.name,
        price: req.body.price
    });
    const result = await createdProduct.save();
    console.log(typeof createdProduct.id);
    res.json(result);
};

const getProducts = async (req,res,next) => {
    const products = await Product.find().exec();
    res.json(products);
};

exports.createProduct = createProduct;
exports.getProducts = getProducts;