// models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true }, // bcrypt hash
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
