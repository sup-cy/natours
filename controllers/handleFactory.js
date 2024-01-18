const APIFeatures = require('../utils/apiTourFeatures');
const AppErroe = require('../utils/appErroe');
const catchAsync = require('../utils/catchAsync');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const obj = await Model.findByIdAndDelete(req.params.id);
    if (!obj) {
      return next(new AppErroe('No Document Found With This ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updataOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const updatedObj = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedObj) {
      return next(new AppErroe('No Document Found With This ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: updatedObj,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const obj = await query;
    if (!obj) return next(new AppErroe('No Document found with that id', 404));
    res.status(200).json({
      status: 'success',
      data: {
        data: obj,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //To allow for nested get reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    //Execute Query
    const feature = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .selectFields()
      .paginate();
    //const allObj = await feature.query.explain();
    const allObj = await feature.query;
    //SEND Response
    res.status(200).json({
      status: 'success',
      results: allObj.length,
      data: {
        data: allObj,
      },
    });
  });
