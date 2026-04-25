const Job = require("../models/Job");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { createNotification } = require("../services/notificationService");

const createJob = catchAsync(async (req, res) => {
  const { title, hospital, location, salary, description } = req.body;

  const job = await Job.create({
    title,
    hospital,
    location,
    salary: salary || "Negotiable",
    description,
    createdBy: req.user._id
  });

  const hydratedJob = await Job.findById(job._id).populate(
    "createdBy",
    "name role hospital isVerified profileImage"
  );

  res.status(201).json({
    success: true,
    data: hydratedJob
  });
});

const listJobs = catchAsync(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

  const [jobs, total] = await Promise.all([
    Job.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("createdBy", "name role hospital isVerified profileImage")
      .lean(),
    Job.countDocuments({})
  ]);

  res.status(200).json({
    success: true,
    data: jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

const applyToJob = catchAsync(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  const alreadyApplied = job.applicants.some((id) => String(id) === String(req.user._id));
  if (alreadyApplied) {
    throw new ApiError(400, "You have already applied to this job");
  }

  job.applicants.push(req.user._id);
  await job.save();

  if (String(job.createdBy) !== String(req.user._id)) {
    await createNotification({
      userId: job.createdBy,
      type: "job",
      title: "New job application",
      body: `${req.user.name} applied to ${job.title}`,
      referenceId: String(job._id),
      triggerUserId: req.user._id
    });
  }

  res.status(200).json({
    success: true,
    data: {
      message: "Application submitted",
      jobId: job._id,
      applicantsCount: job.applicants.length
    }
  });
});

module.exports = {
  createJob,
  listJobs,
  applyToJob
};
