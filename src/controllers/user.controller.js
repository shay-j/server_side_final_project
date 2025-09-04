'use strict';

const Joi = require('joi');
const User = require('../models/User');
const Cost = require('../models/Cost');
const { validate } = require('../middleware/validate');

const addUserSchema = Joi.object({
    id: Joi.number().required(),
    first_name: Joi.string().min(1).required(),
    last_name: Joi.string().min(1).required(),
    birthday: Joi.date().required()
});

const addUserValidator = validate(addUserSchema);

async function addUser(req, res, next) {
    try {
        const exists = await User.findOne({ id: req.body.id }).lean();
        if (exists) return res.status(409).json({ error: 'user_exists', message: 'User id already exists.' });

        const u = await User.create(req.body);
        res.status(201).json({
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            birthday: u.birthday
        });
    } catch (err) {
        next(err);
    }
}

async function getUserById(req, res, next) {
    try {
        const id = Number(req.params.id);
        const user = await User.findOne({ id }).lean();
        if (!user) return res.status(404).json({ error: 'not_found', message: 'User not found' });

        const agg = await Cost.aggregate([{ $match: { userid: id } }, { $group: { _id: null, total: { $sum: '$sum' } } }]);
        const total = agg.length ? agg[0].total : 0;

        res.json({ first_name: user.first_name, last_name: user.last_name, id: user.id, total });
    } catch (err) {
        next(err);
    }
}

async function listUsers(req, res, next) {
    try {
        const users = await User.find({}).select('-__v -createdAt -updatedAt').lean();
        res.json(users);
    } catch (err) {
        next(err);
    }
}

module.exports = { addUser, addUserValidator, getUserById, listUsers };
