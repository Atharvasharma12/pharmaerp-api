import ApiError from "../../../utils/ApiError.js";
import doctorRepository from "../repositories/doctor.repository.js";
import branchRepository from "../../organization/branches/repositories/branch.repository.js";

const createDoctor = async (workspaceId, companyId, userId, payload) => {
  const {
    branchId,
    doctorCode,
    name,
    hospitalName,
    specialty,
    registrationNumber,
    address,
    mobile,
    email,
    status,
  } = payload;

  if (branchId) {
    const branch = await branchRepository.findBranchByIdAndCompany(
      branchId,
      companyId
    );
    if (!branch) {
      throw new ApiError(404, "Branch not found under this company");
    }
  }

  if (doctorCode) {
    const existing = await doctorRepository.findDoctorByCode(doctorCode);
    if (existing) {
      throw new ApiError(400, "Doctor with this code already exists");
    }
  }

  const doctorData = {
    workspaceId,
    companyId,
    branchId: branchId || null,
    doctorCode,
    name: name.trim(),
    hospitalName: hospitalName ? hospitalName.trim() : null,
    specialty: specialty ? specialty.trim() : null,
    registrationNumber: registrationNumber ? registrationNumber.trim().toUpperCase() : null,
    address: address ? address.trim() : null,
    mobile: mobile ? mobile.trim() : null,
    email: email ? email.trim().toLowerCase() : null,
    status: status || "active",
    createdBy: userId,
  };

  const doctor = await doctorRepository.createDoctor(doctorData);
  return doctor.toSafeObject();
};

const getDoctors = async (workspaceId, companyId, query = {}) => {
  const { page, limit, search, specialty, status, sort } = query;

  const filters = {
    search: search || "",
    specialty: specialty || "",
    status: status || "all",
  };

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    sort: sort || "createdAt-desc",
  };

  return doctorRepository.getDoctors(workspaceId, companyId, filters, options);
};

const getDoctorById = async (doctorId, companyId, workspaceId) => {
  const doctor = await doctorRepository.findDoctorByIdAndCompany(
    doctorId,
    companyId,
    workspaceId
  );

  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  return doctor.toSafeObject();
};

const updateDoctor = async (
  doctorId,
  companyId,
  workspaceId,
  userId,
  payload
) => {
  const doctor = await doctorRepository.findDoctorByIdAndCompany(
    doctorId,
    companyId,
    workspaceId
  );

  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name.trim();
  if (payload.hospitalName !== undefined)
    updateData.hospitalName = payload.hospitalName ? payload.hospitalName.trim() : null;
  if (payload.specialty !== undefined)
    updateData.specialty = payload.specialty ? payload.specialty.trim() : null;
  if (payload.registrationNumber !== undefined)
    updateData.registrationNumber = payload.registrationNumber
      ? payload.registrationNumber.trim().toUpperCase()
      : null;
  if (payload.address !== undefined)
    updateData.address = payload.address ? payload.address.trim() : null;
  if (payload.mobile !== undefined)
    updateData.mobile = payload.mobile ? payload.mobile.trim() : null;
  if (payload.email !== undefined)
    updateData.email = payload.email ? payload.email.trim().toLowerCase() : null;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.branchId !== undefined) updateData.branchId = payload.branchId || null;

  const updatedDoctor = await doctorRepository.updateDoctorById(
    doctorId,
    companyId,
    workspaceId,
    updateData
  );

  return updatedDoctor.toSafeObject();
};

const deleteDoctor = async (doctorId, companyId, workspaceId, userId) => {
  const doctor = await doctorRepository.findDoctorByIdAndCompany(
    doctorId,
    companyId,
    workspaceId
  );

  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  await doctorRepository.softDeleteDoctorById(
    doctorId,
    companyId,
    workspaceId,
    userId
  );

  return true;
};

export default {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};
