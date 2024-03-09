const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const AppErroe = require('../utils/appErroe');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECREAT, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    //secure: req.secure || req.get('x-forwarded-proto') === 'https',
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  //Remove the password from output
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1 check email and password are exist
  if (!email || !password) {
    return next(new AppErroe('Please provide email and password'), 400);
  }
  //2 check if user exists && password is correct
  const user = await User.findOne({ email: email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppErroe('Incorrect email or password', 401));
  }
  //3 if everything ok,send token to client
  createSendToken(user, 200, req, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1 get token and check it's exist
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) return next(new AppErroe('Please log in to get access', 401));
  //2 validate token
  const decode = jwt.verify(token, process.env.JWT_SECREAT);
  //3) check if user still exist
  const currUser = await User.findById(decode.id);
  if (!currUser) return next(new AppErroe('The usser is no longer exist', 401));
  //4 check if user change password aftwe JWT token was issued
  const passwordChanged = currUser.changedPasswordAfter(decode.iat);
  if (passwordChanged)
    return next(new AppErroe('Password changed,please re-login', 401));
  //Auth success, access to the protect route
  req.user = currUser;
  res.locals.user = currUser;
  next();
});

//For Render Page only
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1 validate token
      const decode = jwt.verify(req.cookies.jwt, process.env.JWT_SECREAT);
      //2 check if user still exist
      const currUser = await User.findById(decode.id);
      if (!currUser) return next();
      //3 check if user change password aftwe JWT token was issued
      const passwordChanged = currUser.changedPasswordAfter(decode.iat);
      if (passwordChanged) return next();
      //Auth success, User is logged in
      res.locals.user = currUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'logout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppErroe('You do not have permission to perform this action', 403),
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1 get user base on post email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(
      new AppErroe('User is not exist, Please check your email address'),
      404,
    );
  // 2 generate the random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // send it to user email

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswrdReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppErroe(
        'There was an error message sending to the email. Try again later',
        500,
      ),
    );
  }
  //next();
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //get user base on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //If token has not expired and there is a user seth the new password
  if (!user) return next(new AppErroe('Token is invalid or has expird', 400));
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //update change password at for the user

  //log the user send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //get user form collection
  const user = await User.findById(req.user.id).select('+password');
  //check if post password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password)))
    return next(new AppErroe('Your current password is wrong'), 401);
  //if correct update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //log user in sen JWT
  createSendToken(user, 200, req, res);
});
