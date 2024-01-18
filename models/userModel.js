const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'please provide a valid emial'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provider your password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      //Only works on Create and Save!!!
      validator: function (value) {
        return value === this.password;
      },
      message: 'Two password are not match',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  //Only run when password was modify
  if (!this.isModified('password')) return next();
  //has the password withe code 12
  this.password = await bcrypt.hash(this.password, 12);
  //delete the passwordconfirm
  this.passwordConfirm = undefined;
  next();
});
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});
userSchema.pre(/^find/, function (next) {
  // point to current query
  this.find({ active: { $ne: false } });
  next();
});
userSchema.method(
  'correctPassword',
  async function (candinatePassword, userPassword) {
    return await bcrypt.compare(candinatePassword, userPassword);
  },
);

userSchema.method('changedPasswordAfter', function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    //JWTTimestamp : verify Time
    //changedTimestamp: latest time password changed
    //we are return whether password changed after verify
    return !(JWTTimestamp > changedTimestamp);
  }
  //false mean password not changed after
  return false;
});
userSchema.method('createPasswordResetToken', function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  const currentTime = Date.now();
  this.passwordResetExpires = currentTime + 10 * 60 * 1000;
  return resetToken;
});

const User = mongoose.model('User', userSchema);
module.exports = User;
