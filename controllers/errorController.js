const AppErroe = require('../utils/appErroe');

const sendErrorDev = (err, req, res) => {
  // NOTES check if the url is an api url and send api error
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // NOTES otherwise send a rendered web error

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // API error
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    if (!err.isOperational) {
      return res.status(500).json({
        title: 'Something went wrong',
        message: err.message,
      });
    }
  }

  // rendered web error
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      status: err.status,
      msg: err.message,
    });
  }
  if (!err.isOperational) {
    return res.status(500).render('error', {
      title: 'Something went wrong!',
      msg: 'Please try again later',
    });
  }
};

const handleCastErrorDB = (err) => {
  const message = ` Invalid ${err.path}: ${err.value}`;
  return new AppErroe(message, 400);
};
const handleDuplicateFieldsDB = (err) => {
  const value = err.keyValue.name;
  const message = `Duplicate field value ${value}:,please use another value `;
  return new AppErroe(message, 400);
};
const handleValidateDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.properties.message);
  const message = `Invalid inpute data. ${errors.join('. ')} `;
  return new AppErroe(message, 400);
};
const handleVerify = () =>
  new AppErroe('Invalid Token, plsea login again', 401);
const handleTokenExpire = () =>
  new AppErroe('Token expired, please login again', 401);
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err, message: err.message, name: err.name };
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidateDB(error);
    if (err.name === 'JsonWebTokenError') error = handleVerify();
    if (err.name === 'TokenExpiredError') error = handleTokenExpire();
    sendErrorProd(error, req, res);
  }
};
